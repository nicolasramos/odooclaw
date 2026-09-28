import type {
    ImageClassificationPresetName,
    ImageClassificationRuntimeOptions,
} from "../../interface.ts";

export interface ImageClassificationPreset {
    name: ImageClassificationPresetName;
    module:
        | "doc_image_orientation_classification"
        | "textline_orientation_classification"
        | "table_classification";
    options: Partial<ImageClassificationRuntimeOptions>;
}

const TEXTLINE_ORIENTATION_LABELS = ["0_degree", "180_degree"];
const PPLCNET_NORMALIZATION: Pick<
    ImageClassificationRuntimeOptions,
    "mean" | "stdDeviation" | "channelOrder"
> = {
    mean: [0.485 * 255, 0.456 * 255, 0.406 * 255],
    stdDeviation: [1 / 0.229 / 255, 1 / 0.224 / 255, 1 / 0.225 / 255],
    channelOrder: "bgr",
};
const PPLCNET_CLASSIFICATION_OPTIONS: Partial<ImageClassificationRuntimeOptions> = {
    imageHeight: 224,
    imageWidth: 224,
    resizeMode: "resize-short-crop",
    resizeShort: 256,
    ...PPLCNET_NORMALIZATION,
};
const TEXTLINE_ORIENTATION_OPTIONS: Partial<ImageClassificationRuntimeOptions> = {
    imageHeight: 80,
    imageWidth: 160,
    resizeMode: "stretch",
    ...PPLCNET_NORMALIZATION,
    labels: TEXTLINE_ORIENTATION_LABELS,
    topK: 1,
};

export const IMAGE_CLASSIFICATION_PRESETS: Record<
    ImageClassificationPresetName,
    ImageClassificationPreset
> = {
    "PP-LCNet_x1_0_doc_ori": {
        name: "PP-LCNet_x1_0_doc_ori",
        module: "doc_image_orientation_classification",
        options: {
            ...PPLCNET_CLASSIFICATION_OPTIONS,
            labels: ["0", "90", "180", "270"],
            topK: 1,
        },
    },
    "PP-LCNet_x0_25_textline_ori": {
        name: "PP-LCNet_x0_25_textline_ori",
        module: "textline_orientation_classification",
        options: TEXTLINE_ORIENTATION_OPTIONS,
    },
    "PP-LCNet_x1_0_textline_ori": {
        name: "PP-LCNet_x1_0_textline_ori",
        module: "textline_orientation_classification",
        options: TEXTLINE_ORIENTATION_OPTIONS,
    },
    "PP-LCNet_x1_0_table_cls": {
        name: "PP-LCNet_x1_0_table_cls",
        module: "table_classification",
        options: {
            ...PPLCNET_CLASSIFICATION_OPTIONS,
            labels: ["wired_table", "wireless_table"],
            topK: 5,
        },
    },
};

export function getImageClassificationPreset(
    name: ImageClassificationPresetName
): ImageClassificationPreset {
    const preset = IMAGE_CLASSIFICATION_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported image classification preset: ${name}`);
    }
    return preset;
}

export function getImageClassificationPresetOptions(
    name?: ImageClassificationPresetName
): Partial<ImageClassificationRuntimeOptions> {
    if (!name) {
        return {};
    }

    const options = getImageClassificationPreset(name).options;
    return {
        ...options,
        labels: options.labels ? [...options.labels] : undefined,
    };
}
