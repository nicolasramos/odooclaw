import type { RecognitionRuntimeOptions, TextRecognitionPresetName } from "../../interface.ts";
import type { PaddleOcrDictionaryRequirement } from "../../pipelines/ocr-preset.ts";

export type TextRecognitionModule = "text_recognition";
export type TextRecognitionArchitecture = "CTC";

export interface TextRecognitionPreset {
    name: TextRecognitionPresetName;
    module: TextRecognitionModule;
    architecture: TextRecognitionArchitecture;
    inputName: "x";
    preprocessPipeline: readonly string[];
    postprocessName: "CTCLabelDecode";
    dictionary: PaddleOcrDictionaryRequirement;
    options: Partial<RecognitionRuntimeOptions>;
}

const PPOCR_RECOGNITION: Partial<RecognitionRuntimeOptions> = {
    channelOrder: "bgr",
    outputSelectionStrategy: "ctc-logits",
    imageHeight: 48,
    imageWidth: 320,
};

const PPOCR_PREPROCESS_PIPELINE = ["DecodeImage", "MultiLabelEncode", "RecResizeImg", "KeepKeys"];

const PPOCRV5_DICTIONARY: PaddleOcrDictionaryRequirement = {
    name: "ppocrv5",
    fileName: "ppocrv5_dict.txt",
    useSpaceChar: true,
    dictionaryLength: 18384,
    recognitionOutputClasses: 18385,
};

const PPOCRV6_DICTIONARY: PaddleOcrDictionaryRequirement = {
    name: "ppocrv6",
    fileName: "ppocrv6_dict.txt",
    useSpaceChar: true,
    dictionaryLength: 18708,
    recognitionOutputClasses: 18710,
};

const PPOCRV6_TINY_DICTIONARY: PaddleOcrDictionaryRequirement = {
    name: "ppocrv6_tiny",
    fileName: "ppocrv6_tiny_dict.txt",
    useSpaceChar: true,
    dictionaryLength: 6904,
    recognitionOutputClasses: 6906,
};

function createTextRecognitionPreset(
    name: TextRecognitionPresetName,
    dictionary: PaddleOcrDictionaryRequirement
): TextRecognitionPreset {
    return {
        name,
        module: "text_recognition",
        architecture: "CTC",
        inputName: "x",
        preprocessPipeline: PPOCR_PREPROCESS_PIPELINE,
        postprocessName: "CTCLabelDecode",
        dictionary,
        options: PPOCR_RECOGNITION,
    };
}

export const TEXT_RECOGNITION_PRESETS: Record<TextRecognitionPresetName, TextRecognitionPreset> = {
    "PP-OCRv5_mobile_rec": createTextRecognitionPreset("PP-OCRv5_mobile_rec", PPOCRV5_DICTIONARY),
    "PP-OCRv5_server_rec": createTextRecognitionPreset("PP-OCRv5_server_rec", PPOCRV5_DICTIONARY),
    "PP-OCRv6_tiny_rec": createTextRecognitionPreset("PP-OCRv6_tiny_rec", PPOCRV6_TINY_DICTIONARY),
    "PP-OCRv6_small_rec": createTextRecognitionPreset("PP-OCRv6_small_rec", PPOCRV6_DICTIONARY),
    "PP-OCRv6_medium_rec": createTextRecognitionPreset("PP-OCRv6_medium_rec", PPOCRV6_DICTIONARY),
};

export function getTextRecognitionPreset(name: TextRecognitionPresetName): TextRecognitionPreset {
    const preset = TEXT_RECOGNITION_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported text recognition preset: ${name}`);
    }
    return preset;
}

export function getTextRecognitionPresetOptions(
    name?: TextRecognitionPresetName
): Partial<RecognitionRuntimeOptions> {
    if (!name) {
        return {};
    }

    return { ...getTextRecognitionPreset(name).options };
}
