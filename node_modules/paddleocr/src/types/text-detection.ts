import type { ImageChannelOrder } from "./common.ts";

export type TextDetectionPresetName =
    | "PP-OCRv6_tiny_det"
    | "PP-OCRv6_small_det"
    | "PP-OCRv6_medium_det"
    | "PP-OCRv4_mobile_seal_det"
    | "PP-OCRv4_server_seal_det";

/**
 * Runtime parameters for text detection.
 */
export interface DetectionRuntimeOptions {
    padding?: number;

    /**
     * Per-channel mean values used to normalize input pixels [R, G, B].
     * @default [123.675, 116.28, 103.53]
     */
    mean?: [number, number, number];

    /**
     * Per-channel standard deviation values used to normalize input pixels [R, G, B].
     * @default [0.017124753831663668, 0.01750700280112045, 0.015378700499807768]
     */
    stdDeviation?: [number, number, number];

    /**
     * Channel order sent to the model after RGB input normalization.
     * @default "rgb"
     */
    channelOrder?: ImageChannelOrder;

    /**
     * Fixed model input shape `[C, H, W]`. When set, detection preprocessing resizes directly to H x W.
     * Mirrors PaddleOCR text detection `input_shape`.
     */
    inputShape?: [number, number, number];

    /**
     * Side length used by detection resize. Its meaning depends on `limitType`.
     * @default 960
     */
    maxSideLength?: number;

    /**
     * Resize strategy used before text detection, mirroring PaddleOCR DetResizeForTest `limit_type`.
     * `max` scales down when the long side exceeds maxSideLength.
     * `min` scales up when the short side is below maxSideLength.
     * `resize_long` always scales the long side to maxSideLength.
     * @default "max"
     */
    limitType?: "max" | "min" | "resize_long";

    /**
     * Upper bound for resized detection image dimensions, mirroring PaddleOCR `max_side_limit`.
     * @default 4000
     */
    maxSideLimit?: number;

    /**
     * Padding applied to each detected box vertically as a fraction of its height.
     * @default 0.4
     */
    paddingBoxVertical?: number;

    /**
     * Padding applied to each detected box horizontally as a fraction of its height.
     * @default 0.6
     */
    paddingBoxHorizontal?: number;

    /**
     * Remove detected boxes with area below this threshold, in pixels.
     * @default 20
     */
    minimumAreaThreshold?: number;

    textPixelThreshold?: number;

    /**
     * Remove detected boxes whose average model score is below this threshold.
     * Mirrors PaddleOCR DBPostProcess `box_thresh`.
     * @default 0.6
     */
    boxScoreThreshold?: number;

    /**
     * Score mode used by DBPostProcess. PaddleOCR's quad path can score the mini box (`fast`) or
     * the original contour (`slow`).
     * @default "fast"
     */
    scoreMode?: "fast" | "slow";

    /**
     * Expansion ratio used by DB-style box unclipping.
     * @default 1.5
     */
    unclipRatio?: number;

    /**
     * Maximum number of candidate components considered during detection post-processing.
     * @default 1000
     */
    maxCandidates?: number;

    /**
     * Square kernel size used in detection dilation post-processing. PaddleOCR DBPostProcess
     * uses a 2x2 kernel when `use_dilation` is enabled.
     * @default 0
     */
    dilationKernelSize?: number;

    /**
     * DB postprocess output shape. PaddleOCR uses `poly` for seal text detection and `quad` for
     * the general OCR text detector by default.
     * @default "quad"
     */
    boxType?: "quad" | "poly";
}

/**
 * Parameters for the text detection service.
 */
export interface DetectionServiceOptions extends DetectionRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for text detection.
     */
    modelBuffer?: ArrayBuffer;
}
