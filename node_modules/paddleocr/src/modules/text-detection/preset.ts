import type { DetectionRuntimeOptions, TextDetectionPresetName } from "../../interface.ts";

export interface TextDetectionPreset {
    name: TextDetectionPresetName;
    module: "text_detection" | "seal_text_detection";
    options: Partial<DetectionRuntimeOptions>;
}

const PPOCRV6_DETECTION: Partial<DetectionRuntimeOptions> = {
    channelOrder: "bgr",
    maxSideLength: 736,
    limitType: "min",
    maxSideLimit: 4000,
    textPixelThreshold: 0.2,
    boxScoreThreshold: 0.45,
    maxCandidates: 3000,
    unclipRatio: 1.4,
};

const PPOCRV4_SEAL_DETECTION: Partial<DetectionRuntimeOptions> = {
    channelOrder: "bgr",
    maxSideLength: 736,
    limitType: "resize_long",
    maxSideLimit: 4000,
    textPixelThreshold: 0.2,
    boxScoreThreshold: 0.6,
    maxCandidates: 1000,
    unclipRatio: 0.5,
    boxType: "poly",
};

export const TEXT_DETECTION_PRESETS: Record<TextDetectionPresetName, TextDetectionPreset> = {
    "PP-OCRv6_tiny_det": {
        name: "PP-OCRv6_tiny_det",
        module: "text_detection",
        options: {
            ...PPOCRV6_DETECTION,
            boxScoreThreshold: 0.4,
        },
    },
    "PP-OCRv6_small_det": {
        name: "PP-OCRv6_small_det",
        module: "text_detection",
        options: PPOCRV6_DETECTION,
    },
    "PP-OCRv6_medium_det": {
        name: "PP-OCRv6_medium_det",
        module: "text_detection",
        options: PPOCRV6_DETECTION,
    },
    "PP-OCRv4_mobile_seal_det": {
        name: "PP-OCRv4_mobile_seal_det",
        module: "seal_text_detection",
        options: PPOCRV4_SEAL_DETECTION,
    },
    "PP-OCRv4_server_seal_det": {
        name: "PP-OCRv4_server_seal_det",
        module: "seal_text_detection",
        options: PPOCRV4_SEAL_DETECTION,
    },
};

export function getTextDetectionPreset(name: TextDetectionPresetName): TextDetectionPreset {
    const preset = TEXT_DETECTION_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported text detection preset: ${name}`);
    }
    return preset;
}

export function getTextDetectionPresetOptions(
    name?: TextDetectionPresetName
): Partial<DetectionRuntimeOptions> {
    if (!name) {
        return {};
    }

    return { ...getTextDetectionPreset(name).options };
}
