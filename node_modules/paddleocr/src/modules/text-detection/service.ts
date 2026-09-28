import { DEFAULT_DETECTION_OPTIONS } from "../../constants.ts";
import type { Image } from "../../core/image.ts";
import { createInputFeeds, getFixedInputShape } from "../../core/onnx.ts";
import type {
    Box,
    DetectionRuntimeOptions,
    OcrProgress,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
    PaddleOcrProgressEvent,
} from "../../interface.ts";
import { postprocessDetection as postprocessDetectionOutput } from "./postprocess.ts";
import {
    type PreprocessDetectionResult,
    preprocessDetection as preprocessDetectionInput,
    type ResizeParams,
} from "./preprocess.ts";

export type { PreprocessDetectionResult, ResizeParams } from "./preprocess.ts";

export interface DetectionRunOptions extends Partial<DetectionRuntimeOptions> {
    onProgress?: (event: PaddleOcrProgressEvent) => void;
}

/**
 * Service for detecting text regions in images
 */
export class DetectionService {
    private static readonly TOTAL_PROGRESS_STEPS = 3;
    private readonly options: DetectionRuntimeOptions;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<DetectionRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;

        this.options = {
            ...DEFAULT_DETECTION_OPTIONS,
            ...options,
        };
    }

    /**
     * Main method to run text detection on an image
     * @param image ArrayBuffer of the image or Canvas
     */
    async run(image: Image, options: DetectionRunOptions = {}): Promise<Box[]> {
        const { onProgress, ...runtimeOverrides } = options;
        const runtimeOptions = this.resolveRuntimeOptions(runtimeOverrides);
        const input = await this.preprocessDetection(image, runtimeOptions);
        onProgress?.({
            type: "det",
            stage: "preprocess",
            progress: this.createProgress(1),
        });

        const detection = await this.runInference(input.tensor, input.resizeParams);
        onProgress?.({
            type: "det",
            stage: "infer",
            progress: this.createProgress(2),
        });

        const detectedBoxes = this.postprocessDetection(detection, input, runtimeOptions);
        onProgress?.({
            type: "det",
            stage: "postprocess",
            progress: this.createProgress(3),
            detectedCount: detectedBoxes.length,
        });

        return detectedBoxes;
    }

    private resolveRuntimeOptions(
        options: Partial<DetectionRuntimeOptions> = {}
    ): DetectionRuntimeOptions {
        const inputShape =
            options.inputShape ?? this.options.inputShape ?? this.resolveFixedInputShape();
        const runtimeOptions = {
            ...this.options,
            ...options,
        };
        if (!inputShape) {
            return runtimeOptions;
        }
        return {
            ...runtimeOptions,
            inputShape,
        };
    }

    private resolveFixedInputShape(): [number, number, number] | undefined {
        const fixedInputShape = getFixedInputShape(this.session);
        if (!fixedInputShape.height || !fixedInputShape.width) {
            return undefined;
        }
        return [fixedInputShape.channels ?? 3, fixedInputShape.height, fixedInputShape.width];
    }

    private createProgress(current: number): OcrProgress {
        return {
            current,
            remain: DetectionService.TOTAL_PROGRESS_STEPS - current,
            total: DetectionService.TOTAL_PROGRESS_STEPS,
        };
    }

    /**
     * Preprocess an image for text detection
     */
    private async preprocessDetection(
        image: Image,
        runtimeOptions: DetectionRuntimeOptions
    ): Promise<PreprocessDetectionResult> {
        return preprocessDetectionInput(image, runtimeOptions);
    }

    /**
     * Run the detection model inference
     */
    private async runInference(
        tensor: Float32Array,
        resizeParams: ResizeParams
    ): Promise<Float32Array> {
        const inputTensor = new this.ortModule.Tensor("float32", tensor, [
            1,
            3,
            resizeParams.dstHeight,
            resizeParams.dstWidth,
        ]);

        const results = await this.session.run(createInputFeeds(this.session, inputTensor));
        const outputNodeName = this.session.outputNames[0] ?? Object.keys(results)[0];
        const outputTensor = outputNodeName ? results[outputNodeName] : undefined;
        if (!outputTensor) {
            throw new Error(
                `Detection output tensor '${outputNodeName ?? "<none>"}' not found. Available keys: ${Object.keys(results).join(", ")}`
            );
        }

        const outputData = extractDetectionOutputData(outputTensor);
        validateDetectionOutputShape(outputTensor, outputData, resizeParams);
        return outputData;
    }

    /**
     * Process detection results to extract bounding boxes
     */
    private postprocessDetection(
        detection: Float32Array,
        input: PreprocessDetectionResult,
        runtimeOptions: DetectionRuntimeOptions
    ): Box[] {
        return postprocessDetectionOutput(detection, input, runtimeOptions);
    }
}

function extractDetectionOutputData(tensor: OrtTensor): Float32Array {
    if (!(tensor.data instanceof Float32Array)) {
        throw new Error("Detection output tensor must contain Float32Array data.");
    }
    return tensor.data;
}

function validateDetectionOutputShape(
    tensor: OrtTensor,
    data: Float32Array,
    resizeParams: ResizeParams
) {
    const [batch, channels, height, width] = tensor.dims;
    if (
        tensor.dims.length !== 4 ||
        batch !== 1 ||
        !Number.isInteger(channels) ||
        channels < 1 ||
        height !== resizeParams.dstHeight ||
        width !== resizeParams.dstWidth
    ) {
        throw new Error(
            `Detection output tensor shape [${tensor.dims.join(",")}] must be DB maps in [1,C,${resizeParams.dstHeight},${resizeParams.dstWidth}] layout.`
        );
    }

    const expectedLength = batch * channels * height * width;
    if (data.length !== expectedLength) {
        throw new Error(
            `Detection output tensor shape [${tensor.dims.join(",")}] does not match data length ${data.length}.`
        );
    }
}
