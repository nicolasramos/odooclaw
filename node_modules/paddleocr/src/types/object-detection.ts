import type { ImageChannelOrder } from "./common.ts";

export type ObjectDetectionInputName = "image" | "im_shape" | "scale_factor";

export type ObjectDetectionPresetName =
    | "PP-DocLayout_plus-L"
    | "PP-DocLayout-L"
    | "PP-DocLayout-M"
    | "PP-DocLayout-S"
    | "PP-DocBlockLayout"
    | "RT-DETR-L_wired_table_cell_det"
    | "RT-DETR-L_wireless_table_cell_det";

export type ObjectDetectionMergeMode = "large" | "small" | "union";

export type ObjectDetectionOutputLayout = "class-score-xyxy" | "score-class-xyxy";

export interface ObjectDetectionRuntimeOptions {
    /**
     * Fixed object detector input height.
     */
    imageHeight?: number;

    /**
     * Fixed object detector input width.
     */
    imageWidth?: number;

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
     * Official input tensors required by the exported object detection model.
     */
    requiredInputNames?: readonly ObjectDetectionInputName[];

    /**
     * Score threshold for filtering object boxes.
     */
    threshold?: number | readonly number[] | Record<number, number>;

    /**
     * Column layout for 6-value object detection rows.
     * PaddleDetection/PaddleX exported detectors commonly use `[classId, score, xmin, ymin, xmax, ymax]`.
     */
    outputLayout?: ObjectDetectionOutputLayout;

    /**
     * Whether to use layout-aware NMS for layout detection models.
     */
    layoutNms?: boolean;

    /**
     * Layout box expansion ratio. Object detection table-cell presets do not use this by default.
     */
    layoutUnclipRatio?: number | [number, number] | Record<number, [number, number]>;

    /**
     * Layout box merge mode for overlapping boxes.
     */
    layoutMergeBboxesMode?: ObjectDetectionMergeMode | Record<number, ObjectDetectionMergeMode>;

    /**
     * Labels indexed by detector class id.
     */
    labels?: string[];
}

/**
 * Parameters for an object detection service.
 */
export interface ObjectDetectionServiceOptions extends ObjectDetectionRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for object detection.
     */
    modelBuffer?: ArrayBuffer;
}
