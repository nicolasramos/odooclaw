import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "../src/core/image.ts";
import {
    createFormulaRecognitionInputFeeds,
    createFormulaTokenizerVocabulary,
    type DetectionRuntimeOptions,
    type DetectionService,
    type FormulaRecognitionPresetName,
    FormulaRecognitionService,
    getFormulaRecognitionPreset,
    getFormulaRecognitionPresetOptions,
    type ImageClassificationService,
    type OrtInferenceSession,
    type OrtModule,
    type PreprocessDetectionResult,
    postprocessFormulaRecognition,
    preprocessFormulaRecognition,
    type RecognitionOptions,
    type RecognitionOrderingOptions,
    type RecognitionResult,
    type RecognitionRuntimeOptions,
    type RecognitionService,
} from "../src/index.ts";

type DetectionServiceInternals = DetectionService & {
    postprocessDetection: (
        detection: Float32Array,
        input: PreprocessDetectionResult,
        runtimeOptions: DetectionRuntimeOptions
    ) => Array<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    preprocessDetection: (
        image: Parameters<DetectionService["run"]>[0],
        runtimeOptions: DetectionRuntimeOptions
    ) => Promise<PreprocessDetectionResult>;
    runInference: (
        tensor: Float32Array,
        input: PreprocessDetectionResult["resizeParams"]
    ) => Promise<Float32Array>;
};

type RecognitionServiceInternals = RecognitionService & {
    ctcLabelDecode: (
        logits: Float32Array,
        sequenceLength: number,
        numClasses: number,
        runtimeOptions: RecognitionRuntimeOptions,
        charWhiteSet?: Set<string>
    ) => { text: string; confidence: number };
    processBox: (
        task: {
            box: { x: number; y: number; width: number; height: number };
            charWhiteSet?: Set<string>;
            image: Parameters<RecognitionService["run"]>[0];
            index: number;
            maxWhRatio?: number;
            textlineOrientation?: RecognitionOptions["textlineOrientation"];
            textlineOrientationClassifier?: RecognitionOptions["textlineOrientationClassifier"];
        },
        runtimeOptions: RecognitionRuntimeOptions
    ) => Promise<RecognitionResult | null>;
    runInference: (
        inputTensor: { data: unknown; dims: readonly number[] },
        runtimeOptions: RecognitionRuntimeOptions
    ) => Promise<{ data: Float32Array; dims: readonly number[] }>;
    sortBoxesByReadingOrder: (
        boxes: Array<{ x: number; y: number; width: number; height: number }>,
        orderingOptions: RecognitionOrderingOptions
    ) => Array<{ x: number; y: number; width: number; height: number }>;
};

type ImageClassificationServiceInternals = ImageClassificationService & {
    extractScores: (outputTensor: { data: unknown; dims: readonly number[] }) => Float32Array;
};

function createFakeInput(width = 1, height = 1) {
    return {
        width,
        height,
        data: new Uint8Array(width * height * 4).fill(255),
    };
}

test("formula recognition preset exposes official PP-FormulaNet contract", () => {
    const expectedPresets: Array<[FormulaRecognitionPresetName, number, number]> = [
        ["PP-FormulaNet-S", 384, 1024],
        ["PP-FormulaNet-L", 768, 1024],
        ["PP-FormulaNet_plus-S", 384, 1024],
        ["PP-FormulaNet_plus-M", 384, 2560],
        ["PP-FormulaNet_plus-L", 768, 2560],
    ];

    for (const [name, imageSize, maxSequenceLength] of expectedPresets) {
        const preset = getFormulaRecognitionPreset(name);
        const options = getFormulaRecognitionPresetOptions(name);

        assert.equal(preset.module, "formula_recognition");
        assert.equal(preset.architecture, "PP-FormulaNet");
        assert.equal(preset.options.imageHeight, imageSize);
        assert.equal(preset.options.imageWidth, imageSize);
        assert.equal(preset.options.inputChannels, 1);
        assert.equal(preset.options.grayscaleMean, 0.7931);
        assert.equal(preset.options.grayscaleStdDeviation, 0.1738);
        assert.equal(preset.options.cropMarginThreshold, 200);
        assert.equal(preset.options.cropMarginMaxAspectRatio, 200);
        assert.equal(preset.options.imagePaddingValue, 0);
        assert.equal(preset.options.latexPaddingValue, 1);
        assert.equal(preset.options.inputName, "x");
        assert.equal(preset.options.maxSequenceLength, maxSequenceLength);
        assert.deepEqual(preset.options.preprocessPipeline, [
            "UniMERNetImgDecode",
            "UniMERNetTestTransform",
            "LatexImageFormat",
            "UniMERNetLabelEncode",
        ]);
        assert.equal(preset.options.decoderName, "UniMERNetDecode");
        assert.equal(preset.options.tokenizerType, "NougatTokenizer");
        assert.equal(preset.options.tokenizerPath, "ppocr/utils/dict/unimernet_tokenizer");
        assert.deepEqual(preset.options.specialTokenIds, {
            bos: 0,
            pad: 1,
            eos: 2,
            unk: 3,
        });
        assert.notEqual(options.preprocessPipeline, preset.options.preprocessPipeline);
        assert.notEqual(options.specialTokenIds, preset.options.specialTokenIds);
    }
});

test("preprocessFormulaRecognition follows UniMERNet resize, padding, grayscale, and normalize order", () => {
    const image = new Image(2, 1, 3, new Uint8Array([255, 255, 255, 255, 255, 255]));

    const result = preprocessFormulaRecognition(image, {
        imageHeight: 16,
        imageWidth: 16,
        inputChannels: 1,
        grayscaleMean: 0.5,
        grayscaleStdDeviation: 0.5,
        cropMarginThreshold: 200,
        cropMarginMaxAspectRatio: 200,
        imagePaddingValue: 0,
        latexPaddingValue: 1,
    });

    assert.deepEqual(result.image.dims, [1, 1, 16, 16]);
    assert.equal(result.image.data[0], -1);
    assert.equal(result.image.data[4 * 16], 1);
    assert.equal(result.image.data[11 * 16 + 15], 1);
    assert.equal(result.image.data[12 * 16], -1);
    assert.deepEqual(result.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        croppedX: 0,
        croppedY: 0,
        croppedWidth: 2,
        croppedHeight: 1,
        resizedWidth: 16,
        resizedHeight: 8,
        imagePaddedWidth: 16,
        imagePaddedHeight: 16,
        tensorPaddedWidth: 16,
        tensorPaddedHeight: 16,
        paddingLeft: 0,
        paddingTop: 4,
        paddingRight: 0,
        paddingBottom: 4,
    });
});

test("preprocessFormulaRecognition applies UniMERNet crop-margin foreground bounds", () => {
    const data = new Uint8Array(3 * 3 * 3).fill(255);
    data.set([0, 0, 0], (1 * 3 + 1) * 3);
    const image = new Image(3, 3, 3, data);

    const result = preprocessFormulaRecognition(image, {
        imageHeight: 16,
        imageWidth: 16,
        inputChannels: 1,
        grayscaleMean: 0.5,
        grayscaleStdDeviation: 0.5,
        cropMarginThreshold: 200,
        cropMarginMaxAspectRatio: 200,
        imagePaddingValue: 0,
        latexPaddingValue: 1,
    });

    assert.equal(result.image.data[0], -1);
    assert.deepEqual(result.resizeParams, {
        srcWidth: 3,
        srcHeight: 3,
        croppedX: 1,
        croppedY: 1,
        croppedWidth: 1,
        croppedHeight: 1,
        resizedWidth: 16,
        resizedHeight: 16,
        imagePaddedWidth: 16,
        imagePaddedHeight: 16,
        tensorPaddedWidth: 16,
        tensorPaddedHeight: 16,
        paddingLeft: 0,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
    });
});

test("createFormulaRecognitionInputFeeds wires PP-FormulaNet single input tensors", () => {
    class Tensor {
        type: string;
        data: Float32Array;
        dims: readonly number[];

        constructor(type: string, data: Float32Array, dims: readonly number[]) {
            this.type = type;
            this.data = data;
            this.dims = dims;
        }
    }

    const input = {
        image: { data: new Float32Array([1, 2, 3, 4]), dims: [1, 1, 2, 2] },
        resizeParams: {
            srcWidth: 2,
            srcHeight: 2,
            croppedX: 0,
            croppedY: 0,
            croppedWidth: 2,
            croppedHeight: 2,
            resizedWidth: 2,
            resizedHeight: 2,
            imagePaddedWidth: 2,
            imagePaddedHeight: 2,
            tensorPaddedWidth: 2,
            tensorPaddedHeight: 2,
            paddingLeft: 0,
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
        },
    };

    const defaultFeeds = createFormulaRecognitionInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            outputNames: [],
            run: async () => ({}),
        } as unknown as OrtInferenceSession,
        input,
        { inputName: "x" }
    );
    const namedFeeds = createFormulaRecognitionInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image"],
            outputNames: [],
            run: async () => ({}),
        } as unknown as OrtInferenceSession,
        input
    );

    assert.deepEqual(Object.keys(defaultFeeds), ["x"]);
    assert.deepEqual(Object.keys(namedFeeds), ["image"]);
    assert.deepEqual(defaultFeeds.x.dims, [1, 1, 2, 2]);
    assert.equal(defaultFeeds.x.data, input.image.data);
});

test("FormulaRecognitionService runs raw PP-FormulaNet sessions", async () => {
    class Tensor {
        type: string;
        data: Float32Array;
        dims: readonly number[];

        constructor(type: string, data: Float32Array, dims: readonly number[]) {
            this.type = type;
            this.data = data;
            this.dims = dims;
        }
    }

    let seenFeeds: Record<string, { data: unknown; dims: readonly number[] }> | undefined;
    const output = { data: new Float32Array([0.2, 0.8]), dims: [1, 2] };
    const service = new FormulaRecognitionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["x"],
            outputNames: ["logits"],
            run: async (feeds) => {
                seenFeeds = feeds;
                return { logits: output };
            },
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 16,
            imageWidth: 16,
            inputChannels: 1,
            grayscaleMean: 0.5,
            grayscaleStdDeviation: 0.5,
            cropMarginThreshold: 200,
            cropMarginMaxAspectRatio: 200,
            imagePaddingValue: 0,
            latexPaddingValue: 1,
            inputName: "x",
        }
    );

    const result = await service.runRaw({
        width: 2,
        height: 1,
        data: new Uint8Array([255, 255, 255, 255, 255, 255]),
    });

    assert.deepEqual(Object.keys(seenFeeds ?? {}), ["x"]);
    assert.deepEqual(seenFeeds?.x.dims, [1, 1, 16, 16]);
    assert.equal((seenFeeds?.x.data as Float32Array)[0], -1);
    assert.equal((seenFeeds?.x.data as Float32Array)[4 * 16], 1);
    assert.deepEqual(result.outputs, { logits: output });
    assert.deepEqual(result.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        croppedX: 0,
        croppedY: 0,
        croppedWidth: 2,
        croppedHeight: 1,
        resizedWidth: 16,
        resizedHeight: 8,
        imagePaddedWidth: 16,
        imagePaddedHeight: 16,
        tensorPaddedWidth: 16,
        tensorPaddedHeight: 16,
        paddingLeft: 0,
        paddingTop: 4,
        paddingRight: 0,
        paddingBottom: 4,
    });
});

test("postprocessFormulaRecognition decodes Nougat token id outputs", () => {
    const tokenizerVocabulary = ["<s>", "<pad>", "</s>", "<unk>", "\\", "fra", "c", "Ġ", "x"];
    const result = postprocessFormulaRecognition(
        {
            word_pred: {
                data: new Int32Array([0, 4, 5, 6, 7, 8, 2, 1]),
                dims: [1, 8],
            },
        },
        {
            tokenizerVocabulary,
            specialTokenIds: {
                bos: 0,
                pad: 1,
                eos: 2,
                unk: 3,
            },
        }
    );

    assert.deepEqual(result, {
        formula: "\\frac x",
        tokenIds: [4, 5, 6, 7, 8],
        tokens: ["\\", "fra", "c", "Ġ", "x"],
    });
});

test("postprocessFormulaRecognition skips configured additional special token ids", () => {
    const result = postprocessFormulaRecognition(
        {
            word_pred: {
                data: new Int32Array([0, 4, 5, 6, 2]),
                dims: [1, 5],
            },
        },
        {
            tokenizerVocabulary: ["<s>", "<pad>", "</s>", "<unk>", "a", "<mask>", "b"],
            specialTokenIds: {
                bos: 0,
                pad: 1,
                eos: 2,
                unk: 3,
                additional: [5],
            },
        }
    );

    assert.deepEqual(result, {
        formula: "ab",
        tokenIds: [4, 6],
        tokens: ["a", "b"],
    });
});

test("postprocessFormulaRecognition decodes formula logits by argmax", () => {
    const tokenizerVocabulary = ["<s>", "<pad>", "</s>", "<unk>", "a", "b"];
    const result = postprocessFormulaRecognition(
        {
            logits: {
                data: new Float32Array([
                    0, 0, 0, 0, 0.9, 0.1, 0, 0, 0, 0, 0.1, 0.9, 0, 0, 0.9, 0, 0, 0,
                ]),
                dims: [1, 3, 6],
            },
        },
        {
            tokenizerVocabulary,
            specialTokenIds: {
                bos: 0,
                pad: 1,
                eos: 2,
                unk: 3,
            },
        }
    );

    assert.deepEqual(result, {
        formula: "ab",
        tokenIds: [4, 5],
        tokens: ["a", "b"],
    });
});

test("createFormulaTokenizerVocabulary reads official tokenizer JSON vocab shape", () => {
    const vocabulary = createFormulaTokenizerVocabulary({
        model: {
            vocab: {
                "<s>": 0,
                "<pad>": 1,
                "</s>": 2,
                "<unk>": 3,
                "\\": 4,
                alpha: 5,
            },
        },
    });

    assert.deepEqual(vocabulary.slice(0, 6), ["<s>", "<pad>", "</s>", "<unk>", "\\", "alpha"]);
});

test("FormulaRecognitionService can return decoded PP-FormulaNet tokens", async () => {
    class Tensor {
        type: string;
        data: Float32Array;
        dims: readonly number[];

        constructor(type: string, data: Float32Array, dims: readonly number[]) {
            this.type = type;
            this.data = data;
            this.dims = dims;
        }
    }

    const service = new FormulaRecognitionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["x"],
            outputNames: ["word_pred"],
            run: async () => ({
                word_pred: { data: new Int32Array([0, 4, 5, 2]), dims: [1, 4] },
            }),
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 16,
            imageWidth: 16,
            inputChannels: 1,
            grayscaleMean: 0.5,
            grayscaleStdDeviation: 0.5,
            cropMarginThreshold: 200,
            cropMarginMaxAspectRatio: 200,
            imagePaddingValue: 0,
            latexPaddingValue: 1,
            inputName: "x",
            tokenizerVocabulary: ["<s>", "<pad>", "</s>", "<unk>", "\\", "alpha"],
            specialTokenIds: {
                bos: 0,
                pad: 1,
                eos: 2,
                unk: 3,
            },
        }
    );

    const result = await service.run({
        width: 2,
        height: 1,
        data: new Uint8Array([255, 255, 255, 255, 255, 255]),
    });

    assert.deepEqual(result, {
        formula: "\\alpha",
        tokenIds: [4, 5],
        tokens: ["\\", "alpha"],
    });
});

test("FormulaRecognitionService fails fast for incomplete options or empty outputs", async () => {
    class Tensor {
        type: string;
        data: Float32Array;
        dims: readonly number[];

        constructor(type: string, data: Float32Array, dims: readonly number[]) {
            this.type = type;
            this.data = data;
            this.dims = dims;
        }
    }

    const input = {
        width: 1,
        height: 1,
        data: new Uint8Array([255, 255, 255]),
    };

    await assert.rejects(
        () =>
            new FormulaRecognitionService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["x"],
                    outputNames: [],
                    run: async () => ({}),
                } as unknown as OrtInferenceSession,
                {
                    imageHeight: 16,
                    imageWidth: 16,
                    grayscaleMean: 0.5,
                    grayscaleStdDeviation: 0.5,
                    cropMarginThreshold: 200,
                    cropMarginMaxAspectRatio: 200,
                    imagePaddingValue: 0,
                    latexPaddingValue: 1,
                }
            ).runRaw(input),
        /Unsupported formula recognition inputChannels/
    );
    await assert.rejects(
        () =>
            new FormulaRecognitionService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["x"],
                    outputNames: [],
                    run: async () => ({}),
                } as unknown as OrtInferenceSession,
                {
                    imageHeight: 16,
                    imageWidth: 16,
                    inputChannels: 1,
                    grayscaleMean: 0.5,
                    grayscaleStdDeviation: 0.5,
                    cropMarginThreshold: 200,
                    cropMarginMaxAspectRatio: 200,
                    imagePaddingValue: 0,
                    latexPaddingValue: 1,
                }
            ).runRaw(input),
        /Formula recognition session returned no output tensors/
    );
});
