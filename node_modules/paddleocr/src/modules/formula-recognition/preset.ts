import type {
    FormulaRecognitionPresetName,
    FormulaRecognitionRuntimeOptions,
} from "../../interface.ts";

export type FormulaRecognitionModule = "formula_recognition";
export type FormulaRecognitionArchitecture = "PP-FormulaNet";

export interface FormulaRecognitionPreset {
    name: FormulaRecognitionPresetName;
    module: FormulaRecognitionModule;
    architecture: FormulaRecognitionArchitecture;
    options: Partial<FormulaRecognitionRuntimeOptions>;
}

const PP_FORMULANET_BASE_OPTIONS: Partial<FormulaRecognitionRuntimeOptions> = {
    inputChannels: 1,
    grayscaleMean: 0.7931,
    grayscaleStdDeviation: 0.1738,
    cropMarginThreshold: 200,
    cropMarginMaxAspectRatio: 200,
    imagePaddingValue: 0,
    latexPaddingValue: 1,
    inputName: "x",
    maxSequenceLength: 2560,
    preprocessPipeline: [
        "UniMERNetImgDecode",
        "UniMERNetTestTransform",
        "LatexImageFormat",
        "UniMERNetLabelEncode",
    ],
    decoderName: "UniMERNetDecode",
    tokenizerType: "NougatTokenizer",
    tokenizerPath: "ppocr/utils/dict/unimernet_tokenizer",
    specialTokenIds: {
        bos: 0,
        pad: 1,
        eos: 2,
        unk: 3,
    },
};

function createFormulaNetOptions(
    imageSize: number,
    maxSequenceLength: number
): Partial<FormulaRecognitionRuntimeOptions> {
    return {
        ...PP_FORMULANET_BASE_OPTIONS,
        imageHeight: imageSize,
        imageWidth: imageSize,
        maxSequenceLength,
    };
}

export const FORMULA_RECOGNITION_PRESETS: Record<
    FormulaRecognitionPresetName,
    FormulaRecognitionPreset
> = {
    "PP-FormulaNet-S": {
        name: "PP-FormulaNet-S",
        module: "formula_recognition",
        architecture: "PP-FormulaNet",
        options: createFormulaNetOptions(384, 1024),
    },
    "PP-FormulaNet-L": {
        name: "PP-FormulaNet-L",
        module: "formula_recognition",
        architecture: "PP-FormulaNet",
        options: createFormulaNetOptions(768, 1024),
    },
    "PP-FormulaNet_plus-S": {
        name: "PP-FormulaNet_plus-S",
        module: "formula_recognition",
        architecture: "PP-FormulaNet",
        options: createFormulaNetOptions(384, 1024),
    },
    "PP-FormulaNet_plus-M": {
        name: "PP-FormulaNet_plus-M",
        module: "formula_recognition",
        architecture: "PP-FormulaNet",
        options: createFormulaNetOptions(384, 2560),
    },
    "PP-FormulaNet_plus-L": {
        name: "PP-FormulaNet_plus-L",
        module: "formula_recognition",
        architecture: "PP-FormulaNet",
        options: createFormulaNetOptions(768, 2560),
    },
};

export function getFormulaRecognitionPreset(
    name: FormulaRecognitionPresetName
): FormulaRecognitionPreset {
    const preset = FORMULA_RECOGNITION_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported formula recognition preset: ${name}`);
    }
    return preset;
}

export function getFormulaRecognitionPresetOptions(
    name?: FormulaRecognitionPresetName
): Partial<FormulaRecognitionRuntimeOptions> {
    if (!name) {
        return {};
    }

    const options = getFormulaRecognitionPreset(name).options;
    return {
        ...options,
        preprocessPipeline: options.preprocessPipeline
            ? [...options.preprocessPipeline]
            : undefined,
        specialTokenIds: options.specialTokenIds ? { ...options.specialTokenIds } : undefined,
    };
}
