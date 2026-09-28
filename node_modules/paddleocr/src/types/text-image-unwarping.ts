import type { ImageChannelOrder } from "./common.ts";

export type TextImageUnwarpingPresetName = "UVDoc";

export interface TextImageUnwarpingRuntimeOptions {
    /**
     * Default ONNX/Paddle input name used by the exported image unwarping model.
     */
    inputName?: string;

    /**
     * Per-channel mean values used to normalize input pixels [R, G, B].
     */
    mean?: [number, number, number];

    /**
     * Per-channel standard deviation values used to normalize input pixels [R, G, B].
     */
    stdDeviation?: [number, number, number];

    /**
     * Channel order sent to the model after RGB input normalization.
     */
    channelOrder?: ImageChannelOrder;

    /**
     * Preprocessing pipeline names from the official model package.
     */
    preprocessPipeline?: string[];

    /**
     * Postprocess operator name from the official model package.
     */
    postprocessName?: string;

    /**
     * Multiplier applied to image-to-image model outputs before uint8 conversion.
     */
    outputScale?: number;

    /**
     * Channel order produced by the model output before conversion to caller-facing RGB pixels.
     */
    outputChannelOrder?: ImageChannelOrder;

    /**
     * Result field used by PaddleOCR wrappers for the corrected image.
     */
    resultImageKey?: string;

    /**
     * Dynamic NCHW input shapes advertised by the official inference package.
     */
    dynamicInputShape?: {
        min: [number, number, number, number];
        opt: [number, number, number, number];
        max: [number, number, number, number];
    };
}

/**
 * Parameters for a text image unwarping service.
 */
export interface TextImageUnwarpingServiceOptions extends TextImageUnwarpingRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for text image unwarping.
     */
    modelBuffer?: ArrayBuffer;
}
