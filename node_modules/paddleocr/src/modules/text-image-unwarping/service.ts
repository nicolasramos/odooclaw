import { normalizeInputToRgb } from "../../core/input.ts";
import type {
    ImageChannelOrder,
    ImageInput,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
    TextImageUnwarpingRuntimeOptions,
} from "../../interface.ts";
import { postprocessTextImageUnwarping, type TextImageUnwarpingResult } from "./postprocess.ts";
import {
    createTextImageUnwarpingInputFeeds,
    preprocessTextImageUnwarping,
    type TextImageUnwarpingResizeParams,
} from "./preprocess.ts";

type RequiredTextImageUnwarpingPreprocessOptions = Required<
    Pick<TextImageUnwarpingRuntimeOptions, "mean" | "stdDeviation" | "channelOrder">
>;

type RequiredTextImageUnwarpingPostprocessOptions = Required<
    Pick<TextImageUnwarpingRuntimeOptions, "outputScale" | "outputChannelOrder">
>;

export interface TextImageUnwarpingRawResult {
    outputs: Record<string, OrtTensor>;
    resizeParams: TextImageUnwarpingResizeParams;
}

/**
 * Lightweight runner for PaddleOCR/PaddleX UVDoc text image unwarping modules.
 */
export class TextImageUnwarpingService {
    private readonly options: Partial<TextImageUnwarpingRuntimeOptions>;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<TextImageUnwarpingRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;
        this.options = { ...options };
    }

    async runRaw(
        input: ImageInput,
        options: Partial<TextImageUnwarpingRuntimeOptions> = {}
    ): Promise<TextImageUnwarpingRawResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        return this.runRawWithRuntimeOptions(input, runtimeOptions);
    }

    async run(
        input: ImageInput,
        options: Partial<TextImageUnwarpingRuntimeOptions> = {}
    ): Promise<TextImageUnwarpingResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        const raw = await this.runRawWithRuntimeOptions(input, runtimeOptions);
        return postprocessTextImageUnwarping(raw.outputs, runtimeOptions);
    }

    private async runRawWithRuntimeOptions(
        input: ImageInput,
        runtimeOptions: RequiredTextImageUnwarpingPreprocessOptions &
            RequiredTextImageUnwarpingPostprocessOptions &
            Partial<TextImageUnwarpingRuntimeOptions>
    ): Promise<TextImageUnwarpingRawResult> {
        const preprocessed = preprocessTextImageUnwarping(
            normalizeInputToRgb(input),
            runtimeOptions
        );
        const outputs = await this.session.run(
            createTextImageUnwarpingInputFeeds(
                this.ortModule,
                this.session,
                preprocessed,
                runtimeOptions
            )
        );

        if (Object.keys(outputs).length === 0) {
            throw new Error("Text image unwarping session returned no output tensors.");
        }

        return {
            outputs,
            resizeParams: preprocessed.resizeParams,
        };
    }

    private resolveRuntimeOptions(
        options: Partial<TextImageUnwarpingRuntimeOptions>
    ): RequiredTextImageUnwarpingPreprocessOptions &
        RequiredTextImageUnwarpingPostprocessOptions &
        Partial<TextImageUnwarpingRuntimeOptions> {
        const runtimeOptions = {
            ...this.options,
            ...options,
        };

        return {
            inputName: runtimeOptions.inputName,
            mean: this.requireTriple(runtimeOptions.mean, "mean"),
            stdDeviation: this.requireTriple(runtimeOptions.stdDeviation, "stdDeviation"),
            channelOrder: this.requireChannelOrder(runtimeOptions.channelOrder, "channelOrder"),
            preprocessPipeline: runtimeOptions.preprocessPipeline,
            postprocessName: runtimeOptions.postprocessName,
            outputScale: this.requireFiniteNumber(runtimeOptions.outputScale, "outputScale"),
            outputChannelOrder: this.requireChannelOrder(
                runtimeOptions.outputChannelOrder,
                "outputChannelOrder"
            ),
            resultImageKey: runtimeOptions.resultImageKey,
            dynamicInputShape: runtimeOptions.dynamicInputShape,
        };
    }

    private requireTriple(value: unknown, name: string): [number, number, number] {
        if (
            !Array.isArray(value) ||
            value.length !== 3 ||
            value.some((item) => !Number.isFinite(item))
        ) {
            throw new Error(
                `Invalid text image unwarping ${name}: ${String(value)}. Expected three finite numbers.`
            );
        }
        return [value[0], value[1], value[2]];
    }

    private requireChannelOrder(value: unknown, name: string): ImageChannelOrder {
        if (value !== "rgb" && value !== "bgr") {
            throw new Error(
                `Unsupported text image unwarping ${name}: ${value}. Expected "rgb" or "bgr".`
            );
        }
        return value;
    }

    private requireFiniteNumber(value: unknown, name: string): number {
        if (!Number.isFinite(value)) {
            throw new Error(
                `Invalid text image unwarping ${name}: ${value}. Expected a finite number.`
            );
        }
        return value as number;
    }
}
