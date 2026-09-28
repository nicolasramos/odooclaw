import {
    DEFAULT_DETECTION_OPTIONS,
    DEFAULT_PADDLE_OPTIONS,
    DEFAULT_PROCESS_RECOGNITION_OPTIONS,
    DEFAULT_RECOGNITION_OPTIONS,
    DEFAULT_RECOGNITION_ORDERING_OPTIONS,
    DEFAULT_TEXTLINE_ORIENTATION_OPTIONS,
} from "../constants.ts";
import { normalizeInputToRgb } from "../core/input.ts";
import type {
    DetectionRuntimeOptions,
    ImageInput,
    OrtInferenceSession,
    PaddleOptions,
    ProcessRecognitionOptions,
    RecognitionOptions,
    RecognitionOrderingOptions,
    RecognitionRuntimeOptions,
    TextLineOrientationRuntimeOptions,
} from "../interface.ts";
import { ImageClassificationService } from "../modules/image-classification/service.ts";
import { DetectionService } from "../modules/text-detection/service.ts";
import { type RecognitionResult, RecognitionService } from "../modules/text-recognition/service.ts";
import { getModelPreset, getModelPresetOptions } from "./ocr-preset.ts";

export interface PaddleOcrResult {
    text: string;
    lines: RecognitionResult[][];
    confidence: number;
}

export interface FlattenedPaddleOcrResult {
    text: string;
    results: RecognitionResult[];
    confidence: number;
}

/**
 * PaddleOcrService - Provides OCR functionality using PaddleOCR models
 *
 * This service can be used either as a singleton or as separate instances
 * depending on your application needs.
 */
export class PaddleOcrService {
    options: PaddleOptions;

    detectionSession: OrtInferenceSession | null = null;
    detectionService: DetectionService | null = null;

    recognitionSession: OrtInferenceSession | null = null;
    recognitionService: RecognitionService | null = null;

    textlineOrientationSession: OrtInferenceSession | null = null;
    textlineOrientationService: ImageClassificationService | null = null;

    /**
     * Create a new PaddleOcrService instance
     * @param options Optional configuration options
     */
    constructor(options?: Partial<PaddleOptions>) {
        if (!options?.ort) {
            throw new Error(
                "PaddleOcrService requires the 'ort' option to be set with onnxruntime-node or onnxruntime-wen."
            );
        }
        const presetOptions = getModelPresetOptions(options.modelPreset);
        this.options = {
            ...DEFAULT_PADDLE_OPTIONS,
            ...presetOptions,
            ...(options || {}),
            detection: {
                ...DEFAULT_PADDLE_OPTIONS.detection,
                ...presetOptions.detection,
                ...options.detection,
            },
            recognition: {
                ...DEFAULT_PADDLE_OPTIONS.recognition,
                ...presetOptions.recognition,
                ...options.recognition,
            },
            textlineOrientation: options.textlineOrientation
                ? {
                      ...DEFAULT_TEXTLINE_ORIENTATION_OPTIONS,
                      ...options.textlineOrientation,
                  }
                : undefined,
        };
    }

    /**
     * Initialize the OCR service by loading models
     */
    public async initialize(): Promise<void> {
        const ort = this.options.ort;
        if (!ort) {
            throw new Error(
                "PaddleOcrService requires the 'ort' option to be set with onnxruntime-node or onnxruntime-wen."
            );
        }

        // Init detection service
        const detectionModelBuffer = this.options.detection?.modelBuffer;
        if (!detectionModelBuffer) {
            throw new Error(
                "Detection model buffer is required. Please provide a valid ONNX model."
            );
        }
        this.detectionSession = await ort.InferenceSession.create(detectionModelBuffer);
        const { modelBuffer: _detectionModelBuffer, ...detectionOptions } =
            this.options.detection ?? {};
        this.detectionService = new DetectionService(ort, this.detectionSession, detectionOptions);

        // Init recognition service
        const recognitionModelBuffer = this.options.recognition?.modelBuffer;
        if (!recognitionModelBuffer) {
            throw new Error(
                "Recognition model buffer is required. Please provide a valid ONNX model."
            );
        }
        this.recognitionSession = await ort.InferenceSession.create(recognitionModelBuffer);
        const { modelBuffer: _recognitionModelBuffer, ...recognitionOptions } =
            this.options.recognition ?? {};
        this.recognitionService = new RecognitionService(
            ort,
            this.recognitionSession,
            recognitionOptions
        );

        const textlineOrientationModelBuffer = this.options.textlineOrientation?.modelBuffer;
        if (textlineOrientationModelBuffer) {
            this.textlineOrientationSession = await ort.InferenceSession.create(
                textlineOrientationModelBuffer
            );
            const {
                modelBuffer: _textlineOrientationModelBuffer,
                enabled: _enabled,
                threshold: _threshold,
                ...textlineOrientationOptions
            } = this.options.textlineOrientation ?? {};
            this.textlineOrientationService = new ImageClassificationService(
                ort,
                this.textlineOrientationSession,
                textlineOrientationOptions
            );
        }
    }

    /**
     * Check if the service is initialized with models loaded
     */
    public isInitialized(): boolean {
        return this.detectionSession !== null && this.recognitionSession !== null;
    }

    /**
     * Create a new instance instead of using the singleton
     * This is useful when you need multiple instances with different models
     * @param options Configuration options for this specific instance
     */
    public static async createInstance(options?: PaddleOptions): Promise<PaddleOcrService> {
        const instance = new PaddleOcrService(options);
        await instance.initialize();

        return instance;
    }

    private resolveDetectionRuntimeOptions(
        options: Partial<DetectionRuntimeOptions> = {}
    ): DetectionRuntimeOptions {
        const { modelBuffer: _modelBuffer, ...instanceOptions } = this.options.detection ?? {};

        return {
            ...DEFAULT_DETECTION_OPTIONS,
            ...instanceOptions,
            ...options,
        };
    }

    private resolveRecognitionRuntimeOptions(
        options: Partial<RecognitionRuntimeOptions> = {}
    ): RecognitionRuntimeOptions {
        const { modelBuffer: _modelBuffer, ...instanceOptions } = this.options.recognition ?? {};

        return {
            ...DEFAULT_RECOGNITION_OPTIONS,
            ...instanceOptions,
            ...options,
        };
    }

    private resolveRecognitionOrderingOptions(
        options: Partial<RecognitionOrderingOptions> = {}
    ): RecognitionOrderingOptions {
        return {
            ...DEFAULT_RECOGNITION_ORDERING_OPTIONS,
            ...options,
        };
    }

    private resolveTextlineOrientationOptions(
        options?: Partial<TextLineOrientationRuntimeOptions>
    ): TextLineOrientationRuntimeOptions | undefined {
        if (!this.options.textlineOrientation && !options) {
            return undefined;
        }

        const { modelBuffer: _textlineOrientationModelBuffer, ...instanceOptions } =
            this.options.textlineOrientation ?? {};
        return {
            ...DEFAULT_TEXTLINE_ORIENTATION_OPTIONS,
            ...instanceOptions,
            ...options,
        };
    }

    private formatDictionaryRequirement(preset: ReturnType<typeof getModelPreset>): string {
        const { dictionary } = preset;
        return ` The ${preset.name} preset expects ${dictionary.fileName} with ${dictionary.dictionaryLength} entries and ${dictionary.recognitionOutputClasses} CTC output classes.`;
    }

    /**
     * Runs object detection on the provided image input, then performs
     * recognition on the detected regions.
     *
     * @param image - The raw image data as an ArrayBuffer or Canvas.
     * @param options - Optional configuration for the recognition output, e.g., `{ flatten: true }`.
     * @return A promise that resolves to the OCR result, either grouped by lines or as a flat list.
     */
    public async recognize(
        input: ImageInput,
        options?: RecognitionOptions
    ): Promise<RecognitionResult[]> {
        if (!this.detectionService || !this.recognitionService) {
            throw new Error("PaddleOcrService is not initialized. Please call initialize() first.");
        }
        const detectionRuntimeOptions = this.resolveDetectionRuntimeOptions(options?.detection);
        const recognitionRuntimeOptions = this.resolveRecognitionRuntimeOptions(
            options?.recognition
        );
        const orderingOptions = this.resolveRecognitionOrderingOptions(options?.ordering);
        const textlineOrientationOptions = this.resolveTextlineOrientationOptions(
            options?.textlineOrientation
        );
        if (textlineOrientationOptions?.enabled && !this.textlineOrientationService) {
            throw new Error(
                "Textline orientation correction requires textlineOrientation.modelBuffer in createInstance()."
            );
        }
        if (!recognitionRuntimeOptions.charactersDictionary?.length) {
            const preset = this.options.modelPreset
                ? getModelPreset(this.options.modelPreset)
                : undefined;
            throw new Error(
                `Recognition charactersDictionary is required. Provide it in createInstance({ recognition }) or recognize(_, { recognition }).${preset ? this.formatDictionaryRequirement(preset) : ""}`
            );
        }
        let image = normalizeInputToRgb(input);

        const padding = detectionRuntimeOptions.padding;
        if (padding) {
            image = image.padding({
                padding,
                color: [255, 255, 255],
            });
        }
        const detection = await this.detectionService.run(image, {
            ...detectionRuntimeOptions,
            onProgress: options?.onProgress,
        });
        const recognitionOptions: RecognitionOptions = {
            ...options,
            detection: detectionRuntimeOptions,
            recognition: recognitionRuntimeOptions,
            ordering: orderingOptions,
        };
        if (textlineOrientationOptions) {
            recognitionOptions.textlineOrientation = textlineOrientationOptions;
        }
        if (this.textlineOrientationService) {
            recognitionOptions.textlineOrientationClassifier = this.textlineOrientationService;
        }
        const recognition = await this.recognitionService.run(image, detection, recognitionOptions);

        return recognition;
    }

    /**
     * Processes raw recognition results to generate the final text,
     * grouped lines, and overall confidence.
     */
    processRecognition(
        recognition: RecognitionResult[],
        options?: ProcessRecognitionOptions
    ): PaddleOcrResult {
        const result: PaddleOcrResult = {
            text: "",
            lines: [],
            confidence: 0,
        };

        const processOptions = {
            ...DEFAULT_PROCESS_RECOGNITION_OPTIONS,
            ...options,
        };
        const recognitionScoreThreshold =
            processOptions.recognitionScoreThreshold ??
            DEFAULT_PROCESS_RECOGNITION_OPTIONS.recognitionScoreThreshold;
        const filteredRecognition = recognition.filter(
            (item) => item.confidence >= recognitionScoreThreshold
        );

        if (!filteredRecognition.length) {
            return result;
        }

        // Calculate overall confidence as the average of all individual confidences
        const totalConfidence = filteredRecognition.reduce((sum, r) => sum + r.confidence, 0);
        result.confidence = totalConfidence / filteredRecognition.length;

        let currentLine: RecognitionResult[] = [filteredRecognition[0]];
        let fullText = filteredRecognition[0].text;
        let avgHeight = filteredRecognition[0].box.height;

        for (let i = 1; i < filteredRecognition.length; i++) {
            const current = filteredRecognition[i];
            const previous = filteredRecognition[i - 1];

            const verticalGap = Math.abs(current.box.y - previous.box.y);
            const threshold = avgHeight * processOptions.lineMergeThresholdRatio;

            if (verticalGap <= threshold) {
                currentLine.push(current);
                fullText += ` ${current.text}`;

                avgHeight =
                    currentLine.reduce((sum, r) => sum + r.box.height, 0) / currentLine.length;
            } else {
                result.lines.push([...currentLine]);

                fullText += `\n${current.text}`;

                currentLine = [current];
                avgHeight = current.box.height;
            }
        }

        if (currentLine.length > 0) {
            result.lines.push([...currentLine]);
        }

        result.text = fullText;
        return result;
    }

    /**
     * Releases the onnx runtime session for both
     * detection and recognition model.
     */
    public async destroy(): Promise<void> {
        await this.detectionSession?.release();
        await this.recognitionSession?.release();
    }
}

export default PaddleOcrService;
