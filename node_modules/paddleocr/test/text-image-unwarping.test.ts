import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "../src/core/image.ts";
import {
    type DetectionRuntimeOptions,
    type DetectionService,
    getTextImageUnwarpingPreset,
    getTextImageUnwarpingPresetOptions,
    type ImageClassificationService,
    type OrtInferenceSession,
    type OrtModule,
    type PreprocessDetectionResult,
    preprocessTextImageUnwarping,
    type RecognitionOptions,
    type RecognitionOrderingOptions,
    type RecognitionResult,
    type RecognitionRuntimeOptions,
    type RecognitionService,
    TextImageUnwarpingService,
} from "../src/index.ts";
import { postprocessTextImageUnwarping } from "../src/modules/text-image-unwarping/postprocess.ts";
import { createTextImageUnwarpingInputFeeds } from "../src/modules/text-image-unwarping/preprocess.ts";

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

test("text image unwarping preset exposes official UVDoc contract", () => {
    const preset = getTextImageUnwarpingPreset("UVDoc");
    const options = getTextImageUnwarpingPresetOptions("UVDoc");

    assert.equal(preset.module, "text_image_unwarping");
    assert.equal(preset.architecture, "UVDoc");
    assert.equal(preset.options.inputName, "img");
    assert.deepEqual(preset.options.mean, [0, 0, 0]);
    assert.deepEqual(preset.options.stdDeviation, [1 / 255, 1 / 255, 1 / 255]);
    assert.equal(preset.options.channelOrder, "bgr");
    assert.deepEqual(preset.options.preprocessPipeline, ["Read", "Normalize", "ToCHW", "ToBatch"]);
    assert.equal(preset.options.postprocessName, "DocTr");
    assert.equal(preset.options.outputScale, 255);
    assert.equal(preset.options.outputChannelOrder, "bgr");
    assert.equal(preset.options.resultImageKey, "doctr_img");
    assert.deepEqual(preset.options.dynamicInputShape, {
        min: [1, 3, 128, 64],
        opt: [1, 3, 256, 128],
        max: [8, 3, 512, 256],
    });
    assert.notEqual(options.mean, preset.options.mean);
    assert.notEqual(options.stdDeviation, preset.options.stdDeviation);
    assert.notEqual(options.preprocessPipeline, preset.options.preprocessPipeline);
    assert.notEqual(options.dynamicInputShape, preset.options.dynamicInputShape);
    assert.notEqual(options.dynamicInputShape?.min, preset.options.dynamicInputShape?.min);
});

test("preprocessTextImageUnwarping follows official UVDoc BGR normalize and CHW order", () => {
    const image = new Image(2, 1, 3, new Uint8Array([10, 20, 30, 40, 50, 60]));

    const result = preprocessTextImageUnwarping(image, {
        mean: [0, 0, 0],
        stdDeviation: [1 / 255, 1 / 255, 1 / 255],
        channelOrder: "bgr",
    });

    assert.deepEqual(result.image.dims, [1, 3, 1, 2]);
    assert.deepEqual(
        Array.from(result.image.data).map((value) => Number(value.toFixed(4))),
        [0.1176, 0.2353, 0.0784, 0.1961, 0.0392, 0.1569]
    );
    assert.deepEqual(result.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        tensorWidth: 2,
        tensorHeight: 1,
    });
});

test("createTextImageUnwarpingInputFeeds wires UVDoc single input tensors", () => {
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
            tensorWidth: 2,
            tensorHeight: 2,
        },
    };

    const defaultFeeds = createTextImageUnwarpingInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            outputNames: [],
            run: async () => ({}),
        } as unknown as OrtInferenceSession,
        input,
        { inputName: "img" }
    );
    const namedFeeds = createTextImageUnwarpingInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image"],
            outputNames: [],
            run: async () => ({}),
        } as unknown as OrtInferenceSession,
        input
    );

    assert.deepEqual(Object.keys(defaultFeeds), ["img"]);
    assert.deepEqual(Object.keys(namedFeeds), ["image"]);
    assert.deepEqual(defaultFeeds.img.dims, [1, 1, 2, 2]);
    assert.equal(defaultFeeds.img.data, input.image.data);
});

test("postprocessTextImageUnwarping decodes DocTr CHW output into RGB pixels", () => {
    const result = postprocessTextImageUnwarping(
        {
            doctr: {
                data: new Float32Array([1, 0.5, 0.25, 0.75, 0, 1]),
                dims: [1, 3, 1, 2],
            },
        },
        {
            outputScale: 255,
            outputChannelOrder: "bgr",
        }
    );

    assert.deepEqual(result.doctrImage, {
        width: 2,
        height: 1,
        data: new Uint8Array([0, 64, 255, 255, 191, 128]),
    });
});

test("TextImageUnwarpingService runs raw and decoded UVDoc sessions", async () => {
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
    const output = {
        data: new Float32Array([1, 0.5, 0.25, 0.75, 0, 1]),
        dims: [1, 3, 1, 2],
    };
    const service = new TextImageUnwarpingService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["img"],
            outputNames: ["doctr"],
            run: async (feeds) => {
                seenFeeds = feeds;
                return { doctr: output };
            },
        } as unknown as OrtInferenceSession,
        {
            inputName: "img",
            mean: [0, 0, 0],
            stdDeviation: [1 / 255, 1 / 255, 1 / 255],
            channelOrder: "bgr",
            outputScale: 255,
            outputChannelOrder: "bgr",
        }
    );

    const input = {
        width: 2,
        height: 1,
        data: new Uint8Array([10, 20, 30, 40, 50, 60]),
    };
    const raw = await service.runRaw(input);
    const decoded = await service.run(input);

    assert.deepEqual(Object.keys(seenFeeds ?? {}), ["img"]);
    assert.deepEqual(seenFeeds?.img.dims, [1, 3, 1, 2]);
    assert.deepEqual(
        Array.from(seenFeeds?.img.data as Float32Array).map((value) => Number(value.toFixed(4))),
        [0.1176, 0.2353, 0.0784, 0.1961, 0.0392, 0.1569]
    );
    assert.deepEqual(raw.outputs, { doctr: output });
    assert.deepEqual(raw.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        tensorWidth: 2,
        tensorHeight: 1,
    });
    assert.deepEqual(decoded.doctrImage, {
        width: 2,
        height: 1,
        data: new Uint8Array([0, 64, 255, 255, 191, 128]),
    });
});

test("TextImageUnwarpingService fails fast for incomplete options or unsupported outputs", async () => {
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
            new TextImageUnwarpingService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["img"],
                    outputNames: [],
                    run: async () => ({}),
                } as unknown as OrtInferenceSession,
                {
                    mean: [0, 0, 0],
                    stdDeviation: [1, 1, 1],
                    outputScale: 255,
                    outputChannelOrder: "bgr",
                }
            ).runRaw(input),
        /Unsupported text image unwarping channelOrder/
    );
    await assert.rejects(
        () =>
            new TextImageUnwarpingService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["img"],
                    outputNames: ["bad"],
                    run: async () => ({
                        bad: { data: new Float32Array([1, 2, 3]), dims: [1, 3] },
                    }),
                } as unknown as OrtInferenceSession,
                {
                    mean: [0, 0, 0],
                    stdDeviation: [1, 1, 1],
                    channelOrder: "bgr",
                    outputScale: 255,
                    outputChannelOrder: "bgr",
                }
            ).run(input),
        /Expected exactly one 4D Float32 text image unwarping output tensor/
    );
});
