import assert from "node:assert/strict";
import test from "node:test";
import {
    type DetectionRuntimeOptions,
    type DetectionService,
    getTextRecognitionPreset,
    getTextRecognitionPresetOptions,
    type ImageClassificationService,
    type PreprocessDetectionResult,
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

test("text recognition presets expose official PP-OCR CTC contracts", () => {
    const v5Mobile = getTextRecognitionPreset("PP-OCRv5_mobile_rec");
    const v5Server = getTextRecognitionPreset("PP-OCRv5_server_rec");
    const v6Tiny = getTextRecognitionPreset("PP-OCRv6_tiny_rec");
    const v6Small = getTextRecognitionPreset("PP-OCRv6_small_rec");
    const v6Medium = getTextRecognitionPreset("PP-OCRv6_medium_rec");
    const options = getTextRecognitionPresetOptions("PP-OCRv6_small_rec");

    assert.equal(v6Small.module, "text_recognition");
    assert.equal(v6Small.architecture, "CTC");
    assert.equal(v6Small.inputName, "x");
    assert.deepEqual(v6Small.preprocessPipeline, [
        "DecodeImage",
        "MultiLabelEncode",
        "RecResizeImg",
        "KeepKeys",
    ]);
    assert.equal(v6Small.postprocessName, "CTCLabelDecode");
    assert.deepEqual(options, {
        channelOrder: "bgr",
        outputSelectionStrategy: "ctc-logits",
        imageHeight: 48,
        imageWidth: 320,
    });
    assert.deepEqual(v6Tiny.dictionary, {
        name: "ppocrv6_tiny",
        fileName: "ppocrv6_tiny_dict.txt",
        useSpaceChar: true,
        dictionaryLength: 6904,
        recognitionOutputClasses: 6906,
    });
    assert.deepEqual(v6Small.dictionary, {
        name: "ppocrv6",
        fileName: "ppocrv6_dict.txt",
        useSpaceChar: true,
        dictionaryLength: 18708,
        recognitionOutputClasses: 18710,
    });
    assert.equal(v6Medium.dictionary.dictionaryLength, 18708);
    assert.deepEqual(v5Mobile.dictionary, {
        name: "ppocrv5",
        fileName: "ppocrv5_dict.txt",
        useSpaceChar: true,
        dictionaryLength: 18384,
        recognitionOutputClasses: 18385,
    });
    assert.equal(v5Server.dictionary.recognitionOutputClasses, 18385);

    options.imageWidth = 999;
    assert.equal(getTextRecognitionPreset("PP-OCRv6_small_rec").options.imageWidth, 320);
});
