import type { ImageChannelOrder, ImageInput } from "./common.ts";

export type ClassificationResizeMode = "stretch" | "pad" | "resize-short-crop";

export type ImageClassificationPresetName =
    | "PP-LCNet_x1_0_doc_ori"
    | "PP-LCNet_x0_25_textline_ori"
    | "PP-LCNet_x1_0_textline_ori"
    | "PP-LCNet_x1_0_table_cls";

/**
 * Runtime parameters for generic image classification modules.
 */
export interface ImageClassificationRuntimeOptions {
    /**
     * Fixed classifier input height.
     * @default 224
     */
    imageHeight?: number;

    /**
     * Fixed classifier input width.
     * @default 224
     */
    imageWidth?: number;

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
     * @default "bgr"
     */
    channelOrder?: ImageChannelOrder;

    /**
     * Image resize mode before classification.
     * `pad` keeps aspect ratio, resizes to fixed height, and pads right-side pixels with zero.
     * `resize-short-crop` resizes the short side first, then center-crops to imageWidth x imageHeight.
     * @default "stretch"
     */
    resizeMode?: ClassificationResizeMode;

    /**
     * Short-side length used by `resize-short-crop` classification preprocessing.
     * @default 256
     */
    resizeShort?: number;

    /**
     * Labels indexed by classifier class id.
     */
    labels?: string[];

    /**
     * Number of sorted classification results to return.
     * @default 1
     */
    topK?: number;
}

/**
 * Parameters for an image classification service.
 */
export interface ImageClassificationServiceOptions extends ImageClassificationRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for image classification.
     */
    modelBuffer?: ArrayBuffer;
}

export interface TextLineOrientationResult {
    classId: number;
    label: string;
    score: number;
    rotated: boolean;
}

export interface TextLineOrientationRuntimeOptions extends ImageClassificationRuntimeOptions {
    /**
     * Whether to run textline orientation correction before recognition.
     * @default true when a textline orientation model is configured
     */
    enabled?: boolean;

    /**
     * Minimum score required before rotating a crop predicted as 180 degrees.
     * Mirrors PaddleOCR `cls_thresh`.
     * @default 0.9
     */
    threshold?: number;
}

export interface TextLineOrientationServiceOptions extends TextLineOrientationRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for textline orientation classification.
     */
    modelBuffer?: ArrayBuffer;
}

export interface TextLineOrientationClassifier {
    run(
        input: ImageInput,
        options?: Partial<ImageClassificationRuntimeOptions>
    ): Promise<Array<{ classId: number; label: string; score: number }>>;
}
