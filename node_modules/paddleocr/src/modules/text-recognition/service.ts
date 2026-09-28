import {
    DEFAULT_RECOGNITION_OPTIONS,
    DEFAULT_RECOGNITION_ORDERING_OPTIONS,
} from "../../constants.ts";
import type { Image } from "../../core/image.ts";
import { createInputFeeds, getFixedInputShape } from "../../core/onnx.ts";
import type {
    Box,
    OcrProgress,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
    RecognitionOptions,
    RecognitionOrderingOptions,
    RecognitionRuntimeOptions,
    TextLineOrientationClassifier,
    TextLineOrientationResult,
    TextLineOrientationRuntimeOptions,
} from "../../interface.ts";

export interface RecognitionResult {
    text: string;
    box: Box;
    confidence: number;
    textlineOrientation?: TextLineOrientationResult;
}

export interface SingleRecognitionTask {
    index: number;
    image: Image;
    box: Box;
    maxWhRatio?: number;
    charWhiteSet?: Set<string>;
    textlineOrientation?: Partial<TextLineOrientationRuntimeOptions>;
    textlineOrientationClassifier?: TextLineOrientationClassifier;
}

/**
 * Service for detecting and recognizing text in images
 */
export class RecognitionService {
    private readonly options: RecognitionRuntimeOptions;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<RecognitionRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;

        this.options = {
            ...DEFAULT_RECOGNITION_OPTIONS,
            ...options,
        };
    }

    /**
     * Main method to run text recognition on an image with detected regions
     * @param image The original image buffer or image in Canvas
     * @param detection Array of bounding boxes from text detection
     * @returns Array of recognition results with text and bounding box, sorted in reading order
     */
    async run(
        image: Image,
        detection: Box[],
        options?: RecognitionOptions
    ): Promise<RecognitionResult[]> {
        const recognitionOptions = this.resolveRuntimeOptions(options?.recognition);
        const orderingOptions = this.resolveOrderingOptions(options?.ordering);
        const validBoxes = this.sortBoxesByReadingOrder(
            detection.filter((box) => box.width > 0 && box.height > 0),
            orderingOptions
        );
        const maxWhRatio = this.calculateBatchMaxWhRatio(validBoxes, recognitionOptions);
        const results: RecognitionResult[] = [];
        const charWhiteListSet = options?.charWhiteList?.length
            ? new Set(options.charWhiteList)
            : undefined;
        const total = validBoxes.length;
        const onProgress = options?.onProgress;

        onProgress?.({
            type: "rec",
            stage: "start",
            progress: this.createProgress(0, total),
        });

        for (const [i, box] of validBoxes.entries()) {
            const result = await this.processBox(
                {
                    image: image,
                    index: i,
                    box: box,
                    maxWhRatio,
                    charWhiteSet: charWhiteListSet,
                    textlineOrientation: options?.textlineOrientation,
                    textlineOrientationClassifier: options?.textlineOrientationClassifier,
                },
                recognitionOptions
            );
            if (result) {
                results.push(result);
            }
            onProgress?.({
                type: "rec",
                stage: "item",
                progress: this.createProgress(i + 1, total),
                index: i,
                box,
                result: result ?? undefined,
                textlineOrientation: result?.textlineOrientation,
            });
        }

        onProgress?.({
            type: "rec",
            stage: "complete",
            progress: this.createProgress(total, total),
        });

        return results;
    }

    private resolveRuntimeOptions(
        options: Partial<RecognitionRuntimeOptions> = {}
    ): RecognitionRuntimeOptions {
        return {
            ...this.options,
            ...options,
        };
    }

    private resolveOrderingOptions(
        options: Partial<RecognitionOrderingOptions> = {}
    ): RecognitionOrderingOptions {
        return {
            ...DEFAULT_RECOGNITION_ORDERING_OPTIONS,
            ...options,
        };
    }

    /**
     * Process a single text box
     */
    private async processBox(
        task: SingleRecognitionTask,
        runtimeOptions: RecognitionRuntimeOptions
    ): Promise<RecognitionResult | null> {
        const { image, box } = task;

        let crop = box.points ? image.cropRotated(box.points) : image.crop(box);
        const textlineOrientation = await this.correctTextlineOrientation(crop, task);
        if (textlineOrientation?.rotated) {
            crop = crop.rotate180();
        }
        const fixedInputWidth = getFixedInputShape(this.session).width;
        const proportionalWidth = Math.ceil(
            runtimeOptions.imageHeight * (crop.width / crop.height)
        );
        const targetWidth =
            fixedInputWidth ??
            Math.max(
                runtimeOptions.imageWidth,
                proportionalWidth,
                Math.ceil(runtimeOptions.imageHeight * (task.maxWhRatio ?? 0))
            );
        const resizedWidth = Math.min(proportionalWidth, targetWidth);
        const resizedCrop = crop.resize({
            width: resizedWidth,
            height: runtimeOptions.imageHeight,
        });
        const resizedTensor = resizedCrop.tensor({
            mean_values: runtimeOptions.mean,
            norm_values: runtimeOptions.stdDeviation,
            channel_order: runtimeOptions.channelOrder,
        });
        const tensor = this.padRecognitionTensor(
            resizedTensor,
            resizedWidth,
            runtimeOptions.imageHeight,
            targetWidth
        );

        const inputTensor = new this.ortModule.Tensor("float32", tensor, [
            1,
            3,
            runtimeOptions.imageHeight,
            targetWidth,
        ]);
        const { data: outputData, dims: shape } = await this.runInference(
            inputTensor,
            runtimeOptions
        );

        const [, sequenceLength, numClasses] = shape;
        const { text: recognizedText, confidence } = this.ctcLabelDecode(
            outputData as Float32Array,
            sequenceLength,
            numClasses,
            runtimeOptions,
            task.charWhiteSet
        );

        return { text: recognizedText, box, confidence, textlineOrientation };
    }

    private async correctTextlineOrientation(
        crop: Image,
        task: SingleRecognitionTask
    ): Promise<TextLineOrientationResult | undefined> {
        const classifier = task.textlineOrientationClassifier;
        if (!classifier) {
            return undefined;
        }

        const runtimeOptions = {
            enabled: true,
            threshold: 0.9,
            ...task.textlineOrientation,
        };
        if (!runtimeOptions.enabled) {
            return undefined;
        }

        const results = await classifier.run(crop, runtimeOptions);
        const topResult = results[0];
        if (!topResult) {
            return undefined;
        }

        return {
            classId: topResult.classId,
            label: topResult.label,
            score: topResult.score,
            rotated: topResult.label.includes("180") && topResult.score > runtimeOptions.threshold,
        };
    }

    private calculateBatchMaxWhRatio(
        boxes: Box[],
        runtimeOptions: RecognitionRuntimeOptions
    ): number {
        let maxWhRatio = runtimeOptions.imageWidth / runtimeOptions.imageHeight;
        for (const box of boxes) {
            maxWhRatio = Math.max(maxWhRatio, this.calculateBoxWhRatio(box));
        }
        return maxWhRatio;
    }

    private calculateBoxWhRatio(box: Box): number {
        if (!box.points) {
            return box.width / box.height;
        }

        const cropWidth = Math.max(
            this.distance(box.points[0], box.points[1]),
            this.distance(box.points[2], box.points[3]),
            1
        );
        const cropHeight = Math.max(
            this.distance(box.points[0], box.points[3]),
            this.distance(box.points[1], box.points[2]),
            1
        );

        if (cropHeight / cropWidth >= 1.5) {
            return cropHeight / cropWidth;
        }
        return cropWidth / cropHeight;
    }

    private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    private padRecognitionTensor(
        source: Float32Array,
        sourceWidth: number,
        height: number,
        targetWidth: number
    ): Float32Array {
        if (sourceWidth === targetWidth) {
            return source;
        }

        const channels = 3;
        const padded = new Float32Array(channels * height * targetWidth);
        for (let channel = 0; channel < channels; channel++) {
            for (let y = 0; y < height; y++) {
                const sourceStart = channel * height * sourceWidth + y * sourceWidth;
                const targetStart = channel * height * targetWidth + y * targetWidth;
                padded.set(source.subarray(sourceStart, sourceStart + sourceWidth), targetStart);
            }
        }
        return padded;
    }

    /**
     * Sort recognition results by reading order (top to bottom, left to right)
     */
    private sortBoxesByReadingOrder(
        boxes: Box[],
        orderingOptions: RecognitionOrderingOptions
    ): Box[] {
        if (!orderingOptions.sortByReadingOrder) {
            return [...boxes];
        }

        const sortedBoxes = [...boxes].sort((boxA, boxB) => {
            const pointA = this.getBoxTopLeft(boxA);
            const pointB = this.getBoxTopLeft(boxB);
            if (pointA.y !== pointB.y) {
                return pointA.y - pointB.y;
            }
            return pointA.x - pointB.x;
        });

        for (let i = 0; i < sortedBoxes.length - 1; i++) {
            for (let j = i; j >= 0; j--) {
                const current = sortedBoxes[j];
                const next = sortedBoxes[j + 1];
                if (!current || !next) {
                    break;
                }

                const currentPoint = this.getBoxTopLeft(current);
                const nextPoint = this.getBoxTopLeft(next);
                const sameLineThreshold = this.resolveSameLineThreshold(
                    current,
                    next,
                    orderingOptions
                );
                if (
                    Math.abs(nextPoint.y - currentPoint.y) < sameLineThreshold &&
                    nextPoint.x < currentPoint.x
                ) {
                    sortedBoxes[j] = next;
                    sortedBoxes[j + 1] = current;
                    continue;
                }
                break;
            }
        }

        return sortedBoxes;
    }

    private getBoxTopLeft(box: Box) {
        return box.points?.[0] ?? box;
    }

    private resolveSameLineThreshold(
        boxA: Box,
        boxB: Box,
        orderingOptions: RecognitionOrderingOptions
    ): number {
        if (orderingOptions.sameLineThresholdRatio !== undefined) {
            return (boxA.height + boxB.height) * orderingOptions.sameLineThresholdRatio;
        }

        return orderingOptions.sameLinePixelThreshold ?? 10;
    }

    private createProgress(current: number, total: number): OcrProgress {
        return {
            current,
            remain: total - current,
            total,
        };
    }

    /**
     * Runs the ONNX inference session with the prepared tensor
     */
    private async runInference(
        inputTensor: OrtTensor,
        runtimeOptions: RecognitionRuntimeOptions
    ): Promise<OrtTensor> {
        const results = await this.session.run(createInputFeeds(this.session, inputTensor));
        const outputTensor = this.selectOutputTensor(results, runtimeOptions);

        if (!outputTensor) {
            throw new Error(
                `Recognition output tensor not found. Available keys: ${Object.keys(results).join(", ")}`
            );
        }

        return outputTensor;
    }

    private selectOutputTensor(
        results: Record<string, OrtTensor>,
        runtimeOptions: RecognitionRuntimeOptions
    ): OrtTensor | undefined {
        if (runtimeOptions.outputSelectionStrategy !== "ctc-logits") {
            const outputNodeName = Object.keys(results)[0];
            return outputNodeName ? results[outputNodeName] : undefined;
        }

        let ctcOutputTensor: OrtTensor | undefined;
        for (const outputName of Object.keys(results)) {
            const outputTensor = results[outputName];
            const dims = outputTensor?.dims;
            if (
                outputTensor?.data instanceof Float32Array &&
                dims?.length === 3 &&
                (dims[0] === 1 || dims[0] === -1) &&
                (dims[1] ?? 0) > 0 &&
                (dims[2] ?? 0) > 1
            ) {
                ctcOutputTensor = outputTensor;
            }
        }
        if (ctcOutputTensor) {
            return ctcOutputTensor;
        }

        throw new Error(
            `Recognition CTC logits output not found. Available outputs: ${Object.entries(results)
                .map(([name, tensor]) => `${name}[${tensor.dims.join(",")}]`)
                .join(", ")}`
        );
    }

    private ctcLabelDecode(
        logits: Float32Array,
        sequenceLength: number,
        numClasses: number,
        runtimeOptions: RecognitionRuntimeOptions,
        charWhiteSet?: Set<string>
    ): { text: string; confidence: number } {
        const dict = runtimeOptions.charactersDictionary;
        const dictionaryIncludesBlank = dict[0] === "" || dict[0] === "blank";
        const requiredDictionaryLength = dictionaryIncludesBlank ? numClasses : numClasses - 1;
        if (dict.length < requiredDictionaryLength) {
            throw new Error(
                `Recognition charactersDictionary length ${dict.length} is too small for model output classes ${numClasses}. Expected at least ${requiredDictionaryLength}${dictionaryIncludesBlank ? " including the CTC blank entry" : ""}.`
            );
        }
        let text = "";
        const scores: number[] = [];

        let lastIndex = -1;

        for (let t = 0; t < sequenceLength; t++) {
            let maxScore = -Infinity;
            let maxScoreIndex = 0;

            const offset = t * numClasses;
            for (let i = 0; i < numClasses; i++) {
                const val = logits[offset + i];
                if (val > maxScore) {
                    maxScore = val;
                    maxScoreIndex = i;
                }
            }

            if (maxScoreIndex === lastIndex) {
                continue;
            }

            lastIndex = maxScoreIndex;

            if (maxScoreIndex === 0) {
                continue;
            }

            const dictionaryIndex = dictionaryIncludesBlank ? maxScoreIndex : maxScoreIndex - 1;
            const char = dict[dictionaryIndex] || "";

            if (charWhiteSet && !charWhiteSet.has(char) && char !== " ") {
                continue;
            }

            text += char;
            scores.push(maxScore);
        }

        const outputText = runtimeOptions.reverseText ? reverseTextLikePaddleOcr(text) : text;
        return {
            text: outputText,
            confidence:
                scores.length > 0
                    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
                    : 0,
        };
    }
}

function reverseTextLikePaddleOcr(text: string): string {
    const groups: string[] = [];
    let current = "";
    for (const char of text) {
        if (!/[a-zA-Z0-9 :*./%+-]/.test(char)) {
            if (current) {
                groups.push(current);
            }
            groups.push(char);
            current = "";
            continue;
        }
        current += char;
    }
    if (current) {
        groups.push(current);
    }
    return groups.reverse().join("");
}
