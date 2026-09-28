import type { ImageChannelOrder } from "./common.ts";

export type TableStructureRecognitionPresetName = "SLANet" | "SLANeXt_wired" | "SLANeXt_wireless";

export interface TableStructureRecognitionRuntimeOptions {
    /**
     * Padded table-structure model input height.
     */
    imageHeight?: number;

    /**
     * Padded table-structure model input width.
     */
    imageWidth?: number;

    /**
     * Long-side resize target before padding.
     */
    maxSideLength?: number;

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
     * Maximum decoded structure sequence length.
     */
    maxTextLength?: number;

    /**
     * Number of coordinates regressed for each table cell box.
     */
    locRegNum?: number;

    /**
     * Whether PaddleOCR TableLabelDecode merges no-span td structures.
     */
    mergeNoSpanStructure?: boolean;

    /**
     * Whether empty-cell tokens are replaced during table label encoding.
     */
    replaceEmptyCellToken?: boolean;

    /**
     * Whether the table label encoder learns empty boxes.
     */
    learnEmptyBox?: boolean;

    /**
     * Raw structure tokens exported by the model package before TableLabelDecode merge and sos/eos markers.
     */
    structureDictionary?: string[];

    /**
     * Skip decoded cell boxes when the official model marks loc_preds as invalid.
     */
    ignoreBboxes?: boolean;
}

/**
 * Parameters for a table structure recognition service.
 */
export interface TableStructureRecognitionServiceOptions
    extends TableStructureRecognitionRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for table structure recognition.
     */
    modelBuffer?: ArrayBuffer;
}
