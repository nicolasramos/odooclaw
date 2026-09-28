import { DEFAULT_IMAGE_CLASSIFICATION_OPTIONS } from "../../constants.ts";
import type { Image } from "../../core/image.ts";
import { normalizeInputToRgb } from "../../core/input.ts";
import { createInputFeeds, getFixedInputShape } from "../../core/onnx.ts";
import type {
    ImageClassificationRuntimeOptions,
    ImageInput,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
} from "../../interface.ts";

export interface ImageClassificationResult {
    classId: number;
    label: string;
    score: number;
}

/**
 * Lightweight generic service for PaddleOCR image classification modules.
 */
export class ImageClassificationService {
    private readonly options: Partial<ImageClassificationRuntimeOptions>;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<ImageClassificationRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;
        this.options = { ...options };
    }

    async run(
        input: ImageInput,
        options: Partial<ImageClassificationRuntimeOptions> = {}
    ): Promise<ImageClassificationResult[]> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        this.validateRuntimeOptions(runtimeOptions);
        const image = this.preprocessImage(normalizeInputToRgb(input), runtimeOptions);
        const tensor = image.tensor({
            mean_values: runtimeOptions.mean,
            norm_values: runtimeOptions.stdDeviation,
            channel_order: runtimeOptions.channelOrder,
        });
        const inputTensor = new this.ortModule.Tensor("float32", tensor, [
            1,
            3,
            runtimeOptions.imageHeight,
            runtimeOptions.imageWidth,
        ]);
        const outputTensor = await this.runInference(inputTensor);
        const scores = this.extractScores(outputTensor);
        const topK = Math.min(runtimeOptions.topK, scores.length);

        return Array.from(scores, (score, classId) => ({ classId, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map((result) => ({
                ...result,
                label: runtimeOptions.labels[result.classId] ?? String(result.classId),
            }));
    }

    private resolveRuntimeOptions(
        options: Partial<ImageClassificationRuntimeOptions> = {}
    ): Required<ImageClassificationRuntimeOptions> {
        const fixedInputShape = this.resolveFixedInputShape();
        return {
            ...DEFAULT_IMAGE_CLASSIFICATION_OPTIONS,
            ...fixedInputShape,
            ...this.options,
            ...options,
        };
    }

    private resolveFixedInputShape(): Partial<ImageClassificationRuntimeOptions> {
        const fixedInputShape = getFixedInputShape(this.session);
        if (!fixedInputShape.height || !fixedInputShape.width) {
            return {};
        }
        return { imageHeight: fixedInputShape.height, imageWidth: fixedInputShape.width };
    }

    private preprocessImage(
        image: Image,
        runtimeOptions: Required<ImageClassificationRuntimeOptions>
    ): Image {
        if (runtimeOptions.resizeMode === "stretch") {
            return image.resize({
                width: runtimeOptions.imageWidth,
                height: runtimeOptions.imageHeight,
            });
        }

        if (runtimeOptions.resizeMode === "resize-short-crop") {
            return this.resizeShortAndCenterCrop(image, runtimeOptions);
        }

        const resizedWidth = Math.min(
            Math.ceil(runtimeOptions.imageHeight * (image.width / image.height)),
            runtimeOptions.imageWidth
        );
        const resizedImage = image.resize({
            width: resizedWidth,
            height: runtimeOptions.imageHeight,
        });
        if (resizedWidth === runtimeOptions.imageWidth) {
            return resizedImage;
        }
        return resizedImage.padding({
            right: runtimeOptions.imageWidth - resizedWidth,
            color: [0, 0, 0],
        });
    }

    private resizeShortAndCenterCrop(
        image: Image,
        runtimeOptions: Required<ImageClassificationRuntimeOptions>
    ): Image {
        const scale = runtimeOptions.resizeShort / Math.min(image.width, image.height);
        const resizedWidth = Math.round(image.width * scale);
        const resizedHeight = Math.round(image.height * scale);
        const resizedImage = image.resize({
            width: resizedWidth,
            height: resizedHeight,
        });
        if (
            resizedImage.width < runtimeOptions.imageWidth ||
            resizedImage.height < runtimeOptions.imageHeight
        ) {
            throw new Error(
                `Invalid classification resizeShort: ${runtimeOptions.resizeShort}. Resized image ${resizedImage.width}x${resizedImage.height} is smaller than crop ${runtimeOptions.imageWidth}x${runtimeOptions.imageHeight}.`
            );
        }

        return resizedImage.crop({
            x: Math.floor((resizedImage.width - runtimeOptions.imageWidth) / 2),
            y: Math.floor((resizedImage.height - runtimeOptions.imageHeight) / 2),
            width: runtimeOptions.imageWidth,
            height: runtimeOptions.imageHeight,
        });
    }

    private validateRuntimeOptions(runtimeOptions: Required<ImageClassificationRuntimeOptions>) {
        if (!Number.isInteger(runtimeOptions.imageWidth) || runtimeOptions.imageWidth <= 0) {
            throw new Error(
                `Invalid classification imageWidth: ${runtimeOptions.imageWidth}. Expected a positive integer.`
            );
        }
        if (!Number.isInteger(runtimeOptions.imageHeight) || runtimeOptions.imageHeight <= 0) {
            throw new Error(
                `Invalid classification imageHeight: ${runtimeOptions.imageHeight}. Expected a positive integer.`
            );
        }
        if (!Number.isInteger(runtimeOptions.topK) || runtimeOptions.topK <= 0) {
            throw new Error(
                `Invalid classification topK: ${runtimeOptions.topK}. Expected a positive integer.`
            );
        }
        if (
            runtimeOptions.resizeMode !== "stretch" &&
            runtimeOptions.resizeMode !== "pad" &&
            runtimeOptions.resizeMode !== "resize-short-crop"
        ) {
            throw new Error(
                `Unsupported classification resizeMode: ${runtimeOptions.resizeMode}. Expected "stretch", "pad", or "resize-short-crop".`
            );
        }
        if (!Number.isInteger(runtimeOptions.resizeShort) || runtimeOptions.resizeShort <= 0) {
            throw new Error(
                `Invalid classification resizeShort: ${runtimeOptions.resizeShort}. Expected a positive integer.`
            );
        }
    }

    private async runInference(inputTensor: OrtTensor): Promise<OrtTensor> {
        const results = await this.session.run(createInputFeeds(this.session, inputTensor));
        const outputNodeName = this.session.outputNames[0] ?? Object.keys(results)[0];
        const outputTensor = outputNodeName ? results[outputNodeName] : undefined;
        if (!outputTensor) {
            throw new Error(
                `Classification output tensor '${outputNodeName ?? "<none>"}' not found. Available keys: ${Object.keys(results).join(", ")}`
            );
        }
        return outputTensor;
    }

    private extractScores(outputTensor: OrtTensor): Float32Array {
        const { data, dims } = outputTensor;
        if (!(data instanceof Float32Array)) {
            throw new Error("Classification output tensor must contain Float32Array data.");
        }
        if (dims.length === 1) {
            if (data.length !== dims[0]) {
                throw new Error(
                    `Classification output shape [${dims.join(",")}] does not match data length ${data.length}.`
                );
            }
            return data;
        }
        if (dims.length === 2 && (dims[0] === 1 || dims[0] === -1) && dims[1] > 0) {
            if (data.length !== dims[1]) {
                throw new Error(
                    `Classification output shape [${dims.join(",")}] does not match data length ${data.length}.`
                );
            }
            return data;
        }

        throw new Error(
            `Unsupported classification output shape [${dims.join(",")}]. Expected [C] or [1,C].`
        );
    }
}
