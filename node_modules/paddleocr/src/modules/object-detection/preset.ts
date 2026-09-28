import type {
    ObjectDetectionInputName,
    ObjectDetectionPresetName,
    ObjectDetectionRuntimeOptions,
} from "../../interface.ts";

export type ObjectDetectionModule = "layout_detection" | "table_cells_detection";
export type ObjectDetectionArchitecture = "DETR" | "GFL";

export interface ObjectDetectionPreset {
    name: ObjectDetectionPresetName;
    module: ObjectDetectionModule;
    architecture: ObjectDetectionArchitecture;
    requiredInputNames: readonly ObjectDetectionInputName[];
    options: Partial<ObjectDetectionRuntimeOptions>;
}

const DETR_DEFAULT_OPTIONS: Partial<ObjectDetectionRuntimeOptions> = {
    mean: [0, 0, 0],
    stdDeviation: [1 / 255, 1 / 255, 1 / 255],
    channelOrder: "bgr",
    threshold: 0.5,
    outputLayout: "class-score-xyxy",
};

const DETR_INPUT_NAMES: ObjectDetectionPreset["requiredInputNames"] = [
    "image",
    "im_shape",
    "scale_factor",
];

const GFL_INPUT_NAMES: ObjectDetectionPreset["requiredInputNames"] = ["image", "scale_factor"];

const PP_DOCLAYOUT_PLUS_L_LABELS = [
    "paragraph_title",
    "image",
    "text",
    "number",
    "abstract",
    "content",
    "figure_title",
    "formula",
    "table",
    "reference",
    "doc_title",
    "footnote",
    "header",
    "algorithm",
    "footer",
    "seal",
    "chart",
    "formula_number",
    "aside_text",
    "reference_content",
];

const PP_DOCLAYOUT_LABELS = [
    "paragraph_title",
    "image",
    "text",
    "number",
    "abstract",
    "content",
    "figure_title",
    "formula",
    "table",
    "table_title",
    "reference",
    "doc_title",
    "footnote",
    "header",
    "algorithm",
    "footer",
    "seal",
    "chart_title",
    "chart",
    "formula_number",
    "header_image",
    "footer_image",
    "aside_text",
];

const TABLE_CELL_LABELS = ["cell"];
const DOC_BLOCK_LAYOUT_LABELS = ["Region"];

export const OBJECT_DETECTION_PRESETS: Record<ObjectDetectionPresetName, ObjectDetectionPreset> = {
    "PP-DocLayout_plus-L": {
        name: "PP-DocLayout_plus-L",
        module: "layout_detection",
        architecture: "DETR",
        requiredInputNames: DETR_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: DETR_INPUT_NAMES,
            imageHeight: 800,
            imageWidth: 800,
            labels: PP_DOCLAYOUT_PLUS_L_LABELS,
        },
    },
    "PP-DocLayout-L": {
        name: "PP-DocLayout-L",
        module: "layout_detection",
        architecture: "DETR",
        requiredInputNames: DETR_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: DETR_INPUT_NAMES,
            imageHeight: 640,
            imageWidth: 640,
            labels: PP_DOCLAYOUT_LABELS,
        },
    },
    "PP-DocLayout-M": {
        name: "PP-DocLayout-M",
        module: "layout_detection",
        architecture: "GFL",
        requiredInputNames: GFL_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: GFL_INPUT_NAMES,
            imageHeight: 640,
            imageWidth: 640,
            mean: [0.485 * 255, 0.456 * 255, 0.406 * 255],
            stdDeviation: [1 / 0.229 / 255, 1 / 0.224 / 255, 1 / 0.225 / 255],
            labels: PP_DOCLAYOUT_LABELS,
        },
    },
    "PP-DocLayout-S": {
        name: "PP-DocLayout-S",
        module: "layout_detection",
        architecture: "GFL",
        requiredInputNames: GFL_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: GFL_INPUT_NAMES,
            imageHeight: 480,
            imageWidth: 480,
            mean: [0.485 * 255, 0.456 * 255, 0.406 * 255],
            stdDeviation: [1 / 0.229 / 255, 1 / 0.224 / 255, 1 / 0.225 / 255],
            labels: PP_DOCLAYOUT_LABELS,
        },
    },
    "PP-DocBlockLayout": {
        name: "PP-DocBlockLayout",
        module: "layout_detection",
        architecture: "DETR",
        requiredInputNames: DETR_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: DETR_INPUT_NAMES,
            imageHeight: 640,
            imageWidth: 640,
            labels: DOC_BLOCK_LAYOUT_LABELS,
        },
    },
    "RT-DETR-L_wired_table_cell_det": {
        name: "RT-DETR-L_wired_table_cell_det",
        module: "table_cells_detection",
        architecture: "DETR",
        requiredInputNames: DETR_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: DETR_INPUT_NAMES,
            imageHeight: 640,
            imageWidth: 640,
            labels: TABLE_CELL_LABELS,
        },
    },
    "RT-DETR-L_wireless_table_cell_det": {
        name: "RT-DETR-L_wireless_table_cell_det",
        module: "table_cells_detection",
        architecture: "DETR",
        requiredInputNames: DETR_INPUT_NAMES,
        options: {
            ...DETR_DEFAULT_OPTIONS,
            requiredInputNames: DETR_INPUT_NAMES,
            imageHeight: 640,
            imageWidth: 640,
            labels: TABLE_CELL_LABELS,
        },
    },
};

export function getObjectDetectionPreset(name: ObjectDetectionPresetName): ObjectDetectionPreset {
    const preset = OBJECT_DETECTION_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported object detection preset: ${name}`);
    }
    return preset;
}

export function getObjectDetectionPresetOptions(
    name?: ObjectDetectionPresetName
): Partial<ObjectDetectionRuntimeOptions> {
    if (!name) {
        return {};
    }

    const options = getObjectDetectionPreset(name).options;
    return {
        ...options,
        labels: options.labels ? [...options.labels] : undefined,
        requiredInputNames: options.requiredInputNames
            ? [...options.requiredInputNames]
            : undefined,
    };
}
