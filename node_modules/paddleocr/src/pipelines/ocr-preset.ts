import type {
    DetectionRuntimeOptions,
    PaddleOcrModelPresetName,
    RecognitionRuntimeOptions,
} from "../interface.ts";

export interface PaddleOcrDictionaryRequirement {
    name: string;
    fileName: string;
    useSpaceChar: boolean;
    dictionaryLength: number;
    recognitionOutputClasses: number;
}

export interface PaddleOcrModelPreset {
    name: PaddleOcrModelPresetName;
    detection: Partial<DetectionRuntimeOptions>;
    recognition: Partial<RecognitionRuntimeOptions>;
    dictionary: PaddleOcrDictionaryRequirement;
}

export interface ModelPresetInferenceInput {
    modelName?: string;
    fileName?: string;
    detectionModelFileName?: string;
    recognitionModelFileName?: string;
    dictionaryName?: string;
    dictionaryFileName?: string;
    recognitionOutputClasses?: number;
    recognitionOutputShape?: readonly (number | string | null | undefined)[];
    dictionaryLength?: number;
}

export interface ModelPresetInferenceResult {
    name: PaddleOcrModelPresetName;
    confidence: "high" | "medium";
    signals: string[];
}

const PPOCRV5_DETECTION: Partial<DetectionRuntimeOptions> = {
    channelOrder: "bgr",
    maxSideLength: 960,
    limitType: "max",
    maxSideLimit: 4000,
    textPixelThreshold: 0.3,
    boxScoreThreshold: 0.6,
    maxCandidates: 1000,
    unclipRatio: 1.5,
};

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

const PPOCR_RECOGNITION: Partial<RecognitionRuntimeOptions> = {
    channelOrder: "bgr",
    outputSelectionStrategy: "ctc-logits",
    imageHeight: 48,
    imageWidth: 320,
};

const PPOCRV5_RECOGNITION_OUTPUT_CLASSES = 18385;
const PPOCRV5_DICTIONARY_LENGTH = 18384;
const PPOCRV6_RECOGNITION_OUTPUT_CLASSES = 18710;
const PPOCRV6_DICTIONARY_LENGTH = 18708;
const PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES = 6906;
const PPOCRV6_TINY_DICTIONARY_LENGTH = 6904;

const PPOCRV5_DICTIONARY: PaddleOcrDictionaryRequirement = {
    name: "ppocrv5",
    fileName: "ppocrv5_dict.txt",
    useSpaceChar: true,
    dictionaryLength: PPOCRV5_DICTIONARY_LENGTH,
    recognitionOutputClasses: PPOCRV5_RECOGNITION_OUTPUT_CLASSES,
};

const PPOCRV6_DICTIONARY: PaddleOcrDictionaryRequirement = {
    name: "ppocrv6",
    fileName: "ppocrv6_dict.txt",
    useSpaceChar: true,
    dictionaryLength: PPOCRV6_DICTIONARY_LENGTH,
    recognitionOutputClasses: PPOCRV6_RECOGNITION_OUTPUT_CLASSES,
};

const PPOCRV6_TINY_DICTIONARY: PaddleOcrDictionaryRequirement = {
    name: "ppocrv6_tiny",
    fileName: "ppocrv6_tiny_dict.txt",
    useSpaceChar: true,
    dictionaryLength: PPOCRV6_TINY_DICTIONARY_LENGTH,
    recognitionOutputClasses: PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES,
};

export const MODEL_PRESETS: Record<PaddleOcrModelPresetName, PaddleOcrModelPreset> = {
    "PP-OCRv5": {
        name: "PP-OCRv5",
        detection: PPOCRV5_DETECTION,
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV5_DICTIONARY,
    },
    "PP-OCRv5_mobile": {
        name: "PP-OCRv5_mobile",
        detection: PPOCRV5_DETECTION,
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV5_DICTIONARY,
    },
    "PP-OCRv5_server": {
        name: "PP-OCRv5_server",
        detection: PPOCRV5_DETECTION,
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV5_DICTIONARY,
    },
    "PP-OCRv6": {
        name: "PP-OCRv6",
        detection: PPOCRV6_DETECTION,
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV6_DICTIONARY,
    },
    "PP-OCRv6_tiny": {
        name: "PP-OCRv6_tiny",
        detection: {
            ...PPOCRV6_DETECTION,
            boxScoreThreshold: 0.4,
        },
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV6_TINY_DICTIONARY,
    },
    "PP-OCRv6_small": {
        name: "PP-OCRv6_small",
        detection: PPOCRV6_DETECTION,
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV6_DICTIONARY,
    },
    "PP-OCRv6_medium": {
        name: "PP-OCRv6_medium",
        detection: PPOCRV6_DETECTION,
        recognition: PPOCR_RECOGNITION,
        dictionary: PPOCRV6_DICTIONARY,
    },
};

export function getModelPreset(name: PaddleOcrModelPresetName): PaddleOcrModelPreset {
    const preset = MODEL_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported PaddleOCR model preset: ${name}`);
    }
    return preset;
}

export function getModelPresetOptions(
    name?: PaddleOcrModelPresetName
): Pick<PaddleOcrModelPreset, "detection" | "recognition"> {
    if (!name) {
        return {
            detection: {},
            recognition: {},
        };
    }
    const preset = getModelPreset(name);
    return {
        detection: { ...preset.detection },
        recognition: { ...preset.recognition },
    };
}

export function inferModelPreset(
    input: ModelPresetInferenceInput
): ModelPresetInferenceResult | undefined {
    const signals = collectInferenceSignals(input);
    const normalized = signals.map((signal) => normalizeInferenceSignal(signal));

    if (normalized.some((signal) => signal.includes("ppocrv6tiny"))) {
        return createInferenceResult("PP-OCRv6_tiny", "high", signals);
    }
    if (normalized.some((signal) => signal.includes("ppocrv6small"))) {
        return createInferenceResult("PP-OCRv6_small", "high", signals);
    }
    if (normalized.some((signal) => signal.includes("ppocrv6medium"))) {
        return createInferenceResult("PP-OCRv6_medium", "high", signals);
    }
    if (normalized.some((signal) => signal.includes("ppocrv6"))) {
        return createInferenceResult("PP-OCRv6", "medium", signals);
    }
    if (normalized.some((signal) => signal.includes("ppocrv5server"))) {
        return createInferenceResult("PP-OCRv5_server", "high", signals);
    }
    if (normalized.some((signal) => signal.includes("ppocrv5mobile"))) {
        return createInferenceResult("PP-OCRv5_mobile", "high", signals);
    }
    if (normalized.some((signal) => signal.includes("ppocrv5"))) {
        return createInferenceResult("PP-OCRv5", "medium", signals);
    }

    return inferModelPresetFromMetadata(input);
}

function inferModelPresetFromMetadata(
    input: ModelPresetInferenceInput
): ModelPresetInferenceResult | undefined {
    const signals = new Set<string>();
    const recognitionOutputClasses =
        input.recognitionOutputClasses ??
        getLastNumericShapeDimension(input.recognitionOutputShape);

    if (recognitionOutputClasses === PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES) {
        signals.add(`recognitionOutputClasses:${PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES}`);
    }
    if (input.dictionaryLength === PPOCRV6_TINY_DICTIONARY_LENGTH) {
        signals.add(`dictionaryLength:${PPOCRV6_TINY_DICTIONARY_LENGTH}`);
    }
    if (signals.size > 0) {
        return createInferenceResult("PP-OCRv6_tiny", "high", Array.from(signals));
    }

    if (recognitionOutputClasses === PPOCRV6_RECOGNITION_OUTPUT_CLASSES) {
        signals.add(`recognitionOutputClasses:${PPOCRV6_RECOGNITION_OUTPUT_CLASSES}`);
    }
    if (input.dictionaryLength === PPOCRV6_DICTIONARY_LENGTH) {
        signals.add(`dictionaryLength:${PPOCRV6_DICTIONARY_LENGTH}`);
    }
    if (signals.size > 0) {
        return createInferenceResult("PP-OCRv6_small", "medium", Array.from(signals));
    }

    if (recognitionOutputClasses === PPOCRV5_RECOGNITION_OUTPUT_CLASSES) {
        signals.add(`recognitionOutputClasses:${PPOCRV5_RECOGNITION_OUTPUT_CLASSES}`);
    }
    if (input.dictionaryLength === PPOCRV5_DICTIONARY_LENGTH) {
        signals.add(`dictionaryLength:${PPOCRV5_DICTIONARY_LENGTH}`);
    }

    if (signals.size > 0) {
        return createInferenceResult("PP-OCRv5", "medium", Array.from(signals));
    }
    return undefined;
}

function collectInferenceSignals(input: ModelPresetInferenceInput): string[] {
    return [
        input.modelName,
        input.fileName,
        input.detectionModelFileName,
        input.recognitionModelFileName,
        input.dictionaryName,
        input.dictionaryFileName,
    ].filter((signal): signal is string => Boolean(signal));
}

function getLastNumericShapeDimension(
    shape?: readonly (number | string | null | undefined)[]
): number | undefined {
    if (!shape) {
        return undefined;
    }
    for (let index = shape.length - 1; index >= 0; index -= 1) {
        const dimension = shape[index];
        if (typeof dimension === "number" && Number.isFinite(dimension) && dimension > 0) {
            return dimension;
        }
    }
    return undefined;
}

function normalizeInferenceSignal(signal: string): string {
    return signal.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function createInferenceResult(
    name: PaddleOcrModelPresetName,
    confidence: ModelPresetInferenceResult["confidence"],
    signals: string[]
): ModelPresetInferenceResult {
    return {
        name,
        confidence,
        signals: [...signals],
    };
}
