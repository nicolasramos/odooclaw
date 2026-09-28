import assert from "node:assert/strict";
import test from "node:test";
import {
    DEFAULT_IMAGE_CLASSIFICATION_OPTIONS,
    type DetectionRuntimeOptions,
    type DetectionService,
    getImageClassificationPreset,
    ImageClassificationService,
    type OrtInferenceSession,
    type OrtModule,
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

test("ImageClassificationService preprocesses input and returns sorted topK labels", async () => {
    let seenInput: { data: Float32Array; dims: readonly number[] } | undefined;
    const classificationService = new ImageClassificationService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: Float32Array;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenInput = { data, dims };
                }
            },
        } as unknown as OrtModule,
        {
            outputNames: ["prob"],
            run: async () => ({
                prob: {
                    data: new Float32Array([0.1, 0.8, 0.3]),
                    dims: [1, 3],
                },
            }),
        } as unknown as OrtInferenceSession,
        {
            imageWidth: 2,
            imageHeight: 1,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "bgr",
            labels: ["0", "90", "180"],
            topK: 2,
        }
    );

    const result = await classificationService.run({
        width: 2,
        height: 1,
        data: new Uint8Array([1, 2, 3, 4, 5, 6]),
    });

    assert.deepEqual(seenInput?.dims, [1, 3, 1, 2]);
    assert.deepEqual(Array.from(seenInput?.data ?? []), [3, 6, 2, 5, 1, 4]);
    assert.deepEqual(result, [
        { classId: 1, score: 0.800000011920929, label: "90" },
        { classId: 2, score: 0.30000001192092896, label: "180" },
    ]);
});

test("ImageClassificationService can keep aspect ratio and pad classifier input", async () => {
    let seenInput: { data: Float32Array; dims: readonly number[] } | undefined;
    const classificationService = new ImageClassificationService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: Float32Array;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenInput = { data, dims };
                }
            },
        } as unknown as OrtModule,
        {
            outputNames: ["prob"],
            run: async () => ({
                prob: {
                    data: new Float32Array([0.9, 0.1]),
                    dims: [1, 2],
                },
            }),
        } as unknown as OrtInferenceSession,
        {
            imageWidth: 4,
            imageHeight: 2,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "rgb",
            resizeMode: "pad",
            labels: ["0_degree", "180_degree"],
            topK: 1,
        }
    );

    const result = await classificationService.run({
        width: 1,
        height: 2,
        data: new Uint8Array([10, 20, 30, 40, 50, 60]),
    });

    assert.deepEqual(seenInput?.dims, [1, 3, 2, 4]);
    assert.deepEqual(
        Array.from(seenInput?.data ?? []),
        [10, 0, 0, 0, 40, 0, 0, 0, 20, 0, 0, 0, 50, 0, 0, 0, 30, 0, 0, 0, 60, 0, 0, 0]
    );
    assert.deepEqual(result, [{ classId: 0, score: 0.8999999761581421, label: "0_degree" }]);
});

test("ImageClassificationService can resize short side and center-crop classifier input", async () => {
    let seenInput: { data: Float32Array; dims: readonly number[] } | undefined;
    const classificationService = new ImageClassificationService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: Float32Array;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenInput = { data, dims };
                }
            },
        } as unknown as OrtModule,
        {
            outputNames: ["prob"],
            run: async () => ({
                prob: {
                    data: new Float32Array([0.2, 0.8]),
                    dims: [1, 2],
                },
            }),
        } as unknown as OrtInferenceSession,
        {
            imageWidth: 2,
            imageHeight: 2,
            resizeMode: "resize-short-crop",
            resizeShort: 4,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "rgb",
            labels: ["wired_table", "wireless_table"],
            topK: 1,
        }
    );
    const data = new Uint8Array(4 * 4 * 3);
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const index = (y * 4 + x) * 3;
            const value = x * 10 + y;
            data[index] = value;
            data[index + 1] = 100 + value;
            data[index + 2] = 200 + value;
        }
    }

    const result = await classificationService.run({
        width: 4,
        height: 4,
        data,
    });

    assert.deepEqual(seenInput?.dims, [1, 3, 2, 2]);
    assert.deepEqual(
        Array.from(seenInput?.data ?? []),
        [11, 21, 12, 22, 111, 121, 112, 122, 211, 221, 212, 222]
    );
    assert.deepEqual(result, [{ classId: 1, score: 0.800000011920929, label: "wireless_table" }]);
});

test("ImageClassificationService uses fixed ONNX input size metadata as defaults", async () => {
    const seenDims: readonly number[][] = [];
    const classificationService = new ImageClassificationService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: Float32Array;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenDims.push(dims);
                }
            },
        } as unknown as OrtModule,
        {
            inputMetadata: [
                {
                    shape: ["batch", 3, 2, 4],
                },
            ],
            outputNames: ["prob"],
            run: async () => ({
                prob: {
                    data: new Float32Array([0.9, 0.1]),
                    dims: [1, 2],
                },
            }),
        } as unknown as OrtInferenceSession,
        {
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
        }
    );
    const input = {
        width: 2,
        height: 1,
        data: new Uint8Array([1, 2, 3, 4, 5, 6]),
    };

    await classificationService.run(input);
    await classificationService.run(input, {
        imageHeight: 1,
        imageWidth: 2,
    });

    assert.deepEqual(seenDims, [
        [1, 3, 2, 4],
        [1, 3, 1, 2],
    ]);
});

test("ImageClassificationService rejects non-classification output shapes", () => {
    const classificationService = new ImageClassificationService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const classificationServiceInternals =
        classificationService as unknown as ImageClassificationServiceInternals;

    assert.throws(
        () =>
            classificationServiceInternals.extractScores({
                data: new Float32Array(6),
                dims: [1, 2, 3],
            }),
        /Unsupported classification output shape \[1,2,3\]/
    );
});

test("image classification presets expose official module labels and topK", () => {
    const docOrientation = getImageClassificationPreset("PP-LCNet_x1_0_doc_ori");
    const textlineOrientation = getImageClassificationPreset("PP-LCNet_x0_25_textline_ori");
    const tableClassification = getImageClassificationPreset("PP-LCNet_x1_0_table_cls");

    assert.deepEqual(docOrientation.options.labels, ["0", "90", "180", "270"]);
    assert.equal(docOrientation.options.topK, 1);
    assert.equal(docOrientation.options.imageHeight, 224);
    assert.equal(docOrientation.options.imageWidth, 224);
    assert.equal(docOrientation.options.resizeMode, "resize-short-crop");
    assert.equal(docOrientation.options.resizeShort, 256);
    assert.deepEqual(docOrientation.options.mean, [0.485 * 255, 0.456 * 255, 0.406 * 255]);
    assert.deepEqual(docOrientation.options.stdDeviation, [
        1 / 0.229 / 255,
        1 / 0.224 / 255,
        1 / 0.225 / 255,
    ]);
    assert.equal(docOrientation.options.channelOrder, "bgr");
    assert.deepEqual(textlineOrientation.options.labels, ["0_degree", "180_degree"]);
    assert.equal(textlineOrientation.options.imageHeight, 80);
    assert.equal(textlineOrientation.options.imageWidth, 160);
    assert.equal(textlineOrientation.options.resizeMode, "stretch");
    assert.deepEqual(textlineOrientation.options.mean, [0.485 * 255, 0.456 * 255, 0.406 * 255]);
    assert.deepEqual(textlineOrientation.options.stdDeviation, [
        1 / 0.229 / 255,
        1 / 0.224 / 255,
        1 / 0.225 / 255,
    ]);
    assert.equal(textlineOrientation.options.channelOrder, "bgr");
    assert.deepEqual(tableClassification.options.labels, ["wired_table", "wireless_table"]);
    assert.equal(tableClassification.options.topK, 5);
    assert.equal(tableClassification.options.resizeMode, "resize-short-crop");
    assert.equal(tableClassification.options.resizeShort, 256);
    assert.equal(DEFAULT_IMAGE_CLASSIFICATION_OPTIONS.imageWidth, 224);
    assert.equal(DEFAULT_IMAGE_CLASSIFICATION_OPTIONS.channelOrder, "bgr");
    assert.equal(DEFAULT_IMAGE_CLASSIFICATION_OPTIONS.resizeMode, "stretch");
});
