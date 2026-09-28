import { normalizeInputToRgb } from "../../core/input.ts";
import type {
    ImageChannelOrder,
    ImageInput,
    ObjectDetectionInputName,
    ObjectDetectionRuntimeOptions,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
} from "../../interface.ts";
import { type ObjectDetectionBox, postprocessObjectDetection } from "./postprocess.ts";
import {
    createObjectDetectionInputFeeds,
    type ObjectDetectionResizeParams,
    preprocessObjectDetection,
} from "./preprocess.ts";

type RequiredObjectDetectionPreprocessOptions = Required<
    Pick<
        ObjectDetectionRuntimeOptions,
        "imageHeight" | "imageWidth" | "mean" | "stdDeviation" | "channelOrder"
    >
>;

export interface ObjectDetectionRawResult {
    outputs: Record<string, OrtTensor>;
    resizeParams: ObjectDetectionResizeParams;
}

/**
 * Lightweight raw runner for PaddleOCR/PaddleX DETR object-detection modules.
 */
export class ObjectDetectionService {
    private readonly options: Partial<ObjectDetectionRuntimeOptions>;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<ObjectDetectionRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;
        this.options = { ...options };
    }

    async runRaw(
        input: ImageInput,
        options: Partial<ObjectDetectionRuntimeOptions> = {}
    ): Promise<ObjectDetectionRawResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        return this.runRawWithRuntimeOptions(input, runtimeOptions);
    }

    async run(
        input: ImageInput,
        options: Partial<ObjectDetectionRuntimeOptions> = {}
    ): Promise<ObjectDetectionBox[]> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        const raw = await this.runRawWithRuntimeOptions(input, runtimeOptions);
        return postprocessObjectDetection(raw.outputs, runtimeOptions);
    }

    private async runRawWithRuntimeOptions(
        input: ImageInput,
        runtimeOptions: RequiredObjectDetectionPreprocessOptions &
            Partial<ObjectDetectionRuntimeOptions>
    ): Promise<ObjectDetectionRawResult> {
        const preprocessed = preprocessObjectDetection(normalizeInputToRgb(input), runtimeOptions);
        const outputs = await this.session.run(
            createObjectDetectionInputFeeds(
                this.ortModule,
                this.session,
                preprocessed,
                runtimeOptions.requiredInputNames
            )
        );

        if (Object.keys(outputs).length === 0) {
            throw new Error("Object detection session returned no output tensors.");
        }

        return {
            outputs,
            resizeParams: preprocessed.resizeParams,
        };
    }

    private resolveRuntimeOptions(
        options: Partial<ObjectDetectionRuntimeOptions>
    ): RequiredObjectDetectionPreprocessOptions & Partial<ObjectDetectionRuntimeOptions> {
        const runtimeOptions = {
            ...this.options,
            ...options,
        };

        return {
            imageHeight: this.requirePositiveInteger(runtimeOptions.imageHeight, "imageHeight"),
            imageWidth: this.requirePositiveInteger(runtimeOptions.imageWidth, "imageWidth"),
            mean: this.requireTriple(runtimeOptions.mean, "mean"),
            stdDeviation: this.requireTriple(runtimeOptions.stdDeviation, "stdDeviation"),
            channelOrder: this.requireChannelOrder(runtimeOptions.channelOrder),
            labels: runtimeOptions.labels,
            threshold: runtimeOptions.threshold,
            outputLayout: runtimeOptions.outputLayout,
            layoutNms: runtimeOptions.layoutNms,
            layoutUnclipRatio: runtimeOptions.layoutUnclipRatio,
            layoutMergeBboxesMode: runtimeOptions.layoutMergeBboxesMode,
            requiredInputNames: this.resolveRequiredInputNames(runtimeOptions.requiredInputNames),
        };
    }

    private requirePositiveInteger(value: unknown, name: string): number {
        if (!Number.isInteger(value) || (value as number) <= 0) {
            throw new Error(
                `Invalid object detection ${name}: ${value}. Expected a positive integer.`
            );
        }
        return value as number;
    }

    private requireTriple(value: unknown, name: string): [number, number, number] {
        if (
            !Array.isArray(value) ||
            value.length !== 3 ||
            value.some((item) => !Number.isFinite(item))
        ) {
            throw new Error(
                `Invalid object detection ${name}: ${String(value)}. Expected three finite numbers.`
            );
        }
        return [value[0], value[1], value[2]];
    }

    private requireChannelOrder(value: unknown): ImageChannelOrder {
        if (value !== "rgb" && value !== "bgr") {
            throw new Error(
                `Unsupported object detection channelOrder: ${value}. Expected "rgb" or "bgr".`
            );
        }
        return value;
    }

    private resolveRequiredInputNames(
        value: unknown
    ): readonly ObjectDetectionInputName[] | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error(
                `Invalid object detection requiredInputNames: ${String(value)}. Expected a non-empty array.`
            );
        }
        for (const inputName of value) {
            if (inputName !== "image" && inputName !== "im_shape" && inputName !== "scale_factor") {
                throw new Error(`Unsupported object detection input name: ${String(inputName)}.`);
            }
        }
        return [...value];
    }
}
