import type { Image } from "../../core/image.ts";
import type {
    ImageChannelOrder,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
    TextImageUnwarpingRuntimeOptions,
} from "../../interface.ts";

export interface TextImageUnwarpingTensorSpec {
    data: Float32Array;
    dims: readonly number[];
}

export interface TextImageUnwarpingResizeParams {
    srcWidth: number;
    srcHeight: number;
    tensorWidth: number;
    tensorHeight: number;
}

export interface PreprocessTextImageUnwarpingResult {
    image: TextImageUnwarpingTensorSpec;
    resizeParams: TextImageUnwarpingResizeParams;
}

interface RequiredTextImageUnwarpingPreprocessOptions {
    mean: [number, number, number];
    stdDeviation: [number, number, number];
    channelOrder: ImageChannelOrder;
}

export function preprocessTextImageUnwarping(
    image: Image,
    runtimeOptions: RequiredTextImageUnwarpingPreprocessOptions
): PreprocessTextImageUnwarpingResult {
    validateTextImageUnwarpingPreprocessOptions(runtimeOptions);
    const tensor = image.tensor({
        mean_values: runtimeOptions.mean,
        norm_values: runtimeOptions.stdDeviation,
        channel_order: runtimeOptions.channelOrder,
    });

    return {
        image: {
            data: tensor,
            dims: [1, 3, image.height, image.width],
        },
        resizeParams: {
            srcWidth: image.width,
            srcHeight: image.height,
            tensorWidth: image.width,
            tensorHeight: image.height,
        },
    };
}

export function createTextImageUnwarpingInputFeeds(
    ortModule: OrtModule,
    session: OrtInferenceSession,
    input: PreprocessTextImageUnwarpingResult,
    runtimeOptions: Pick<TextImageUnwarpingRuntimeOptions, "inputName"> = {}
): Record<string, OrtTensor> {
    const inputName = session.inputNames?.[0] ?? runtimeOptions.inputName ?? "img";
    return {
        [inputName]: new ortModule.Tensor("float32", input.image.data, input.image.dims),
    };
}

function validateTextImageUnwarpingPreprocessOptions(
    runtimeOptions: RequiredTextImageUnwarpingPreprocessOptions
) {
    if (runtimeOptions.channelOrder !== "rgb" && runtimeOptions.channelOrder !== "bgr") {
        throw new Error(
            `Unsupported text image unwarping channelOrder: ${runtimeOptions.channelOrder}. Expected "rgb" or "bgr".`
        );
    }
    validateTriple(runtimeOptions.mean, "mean");
    validateTriple(runtimeOptions.stdDeviation, "stdDeviation");
}

function validateTriple(value: [number, number, number], name: string) {
    if (
        !Array.isArray(value) ||
        value.length !== 3 ||
        value.some((item) => !Number.isFinite(item))
    ) {
        throw new Error(
            `Invalid text image unwarping ${name}: ${String(value)}. Expected three finite numbers.`
        );
    }
}
