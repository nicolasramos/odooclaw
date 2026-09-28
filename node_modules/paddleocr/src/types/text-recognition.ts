import type { ImageChannelOrder } from "./common.ts";

export type RecognitionOutputSelectionStrategy = "first" | "ctc-logits";

export type TextRecognitionPresetName =
    | "PP-OCRv5_mobile_rec"
    | "PP-OCRv5_server_rec"
    | "PP-OCRv6_tiny_rec"
    | "PP-OCRv6_small_rec"
    | "PP-OCRv6_medium_rec";

/**
 * Runtime parameters for text recognition.
 */
export interface RecognitionRuntimeOptions {
    /**
     * Fixed height for input images, in pixels.
     * Models will resize width proportionally.
     * @default 48
     */
    imageHeight?: number;

    /**
     * Minimum padded width for recognition input images, in pixels.
     * Wider text crops may expand this width to preserve aspect ratio, matching PaddleOCR's max_wh_ratio behavior.
     * @default 320
     */
    imageWidth?: number;

    /**
     * Per-channel mean values used to normalize input pixels [R, G, B].
     * @default [127.5, 127.5, 127.5]
     */
    mean?: [number, number, number];

    /**
     * Per-channel standard deviation values used to normalize input pixels [R, G, B].
     * @default [0.00784313725490196, 0.00784313725490196, 0.00784313725490196]
     */
    stdDeviation?: [number, number, number];

    /**
     * Channel order sent to the model after RGB input normalization.
     * @default "rgb"
     */
    channelOrder?: ImageChannelOrder;

    /**
     * Strategy used when recognition models expose multiple ONNX outputs.
     * `ctc-logits` selects the first 3D float tensor shaped like [N, T, C].
     * @default "first"
     */
    outputSelectionStrategy?: RecognitionOutputSelectionStrategy;

    /**
     * A list of loaded character dictionary (string) for
     * recognition result decoding.
     */
    charactersDictionary?: string[];

    /**
     * Reverse decoded CTC text with PaddleOCR's Arabic/right-to-left grouping rule.
     * PaddleOCR enables this automatically when the dictionary path contains `arabic`; this
     * runtime receives dictionaries as arrays, so callers enable it explicitly.
     * @default false
     */
    reverseText?: boolean;
}

/**
 * Parameters for the text recognition service.
 */
export interface RecognitionServiceOptions extends RecognitionRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for text recognition.
     */
    modelBuffer?: ArrayBuffer;
}

/**
 * Parameters for sorting detection boxes into reading order.
 */
export interface RecognitionOrderingOptions {
    /**
     * Whether recognition results should be sorted in reading order.
     * @default true
     */
    sortByReadingOrder?: boolean;

    /**
     * Pixel threshold used to decide whether two boxes are on the same line, matching PaddleOCR `sorted_boxes`.
     * Ignored when `sameLineThresholdRatio` is provided.
     * @default 10
     */
    sameLinePixelThreshold?: number;

    /**
     * Threshold ratio used to decide whether two boxes are on the same line.
     * The threshold is `(boxA.height + boxB.height) * sameLineThresholdRatio`.
     * When omitted, the official 10px `sameLinePixelThreshold` is used.
     */
    sameLineThresholdRatio?: number;
}

/**
 * Parameters for post-processing recognition results into lines.
 */
export interface ProcessRecognitionOptions {
    /**
     * Recognition score threshold used before line grouping.
     * Mirrors PaddleOCR `drop_score` / `text_rec_score_thresh`.
     * @default 0.5
     */
    recognitionScoreThreshold?: number;

    /**
     * Threshold ratio used to merge results into the same line.
     * The threshold is `averageLineHeight * lineMergeThresholdRatio`.
     * @default 0.5
     */
    lineMergeThresholdRatio?: number;
}
