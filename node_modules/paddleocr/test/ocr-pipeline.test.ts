import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "../src/core/image.ts";
import {
    DEFAULT_DETECTION_OPTIONS,
    DEFAULT_RECOGNITION_OPTIONS,
    type DetectionRuntimeOptions,
    type DetectionService,
    getModelPreset,
    type ImageClassificationService,
    inferModelPreset,
    type OrtInferenceSession,
    type OrtModule,
    PaddleOcrService,
    type PreprocessDetectionResult,
    type RecognitionOptions,
    type RecognitionOrderingOptions,
    type RecognitionResult,
    type RecognitionRuntimeOptions,
    RecognitionService,
} from "../src/index.ts";
import { calculateDetectionResizeDimensions } from "../src/modules/text-detection/preprocess.ts";

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

test("PaddleOcrService.recognize normalizes supported input channel layouts to RGB", async () => {
    const service = new PaddleOcrService({
        ort: {} as unknown as OrtModule,
        recognition: {
            charactersDictionary: ["", "A"],
        },
    });
    const seenImages: Array<{ channels: number; data: number[] }> = [];

    service.detectionService = {
        run: async (image) => {
            seenImages.push({
                channels: image.channels,
                data: Array.from(image.data),
            });
            return [];
        },
    } as unknown as DetectionService;

    service.recognitionService = {
        run: async () => [],
    } as unknown as RecognitionService;

    await service.recognize({
        width: 2,
        height: 1,
        data: new Uint8Array([9, 10]),
    });
    await service.recognize({
        width: 2,
        height: 1,
        data: new Uint8Array([1, 2, 3, 128, 4, 5, 6, 0]),
    });

    assert.deepEqual(seenImages, [
        {
            channels: 3,
            data: [9, 9, 9, 10, 10, 10],
        },
        {
            channels: 3,
            data: [1, 2, 3, 4, 5, 6],
        },
    ]);
});

test("PaddleOcrService.recognize merges instance defaults with per-call overrides and keeps calls isolated", async () => {
    const detections = [{ x: 0, y: 0, width: 1, height: 1 }];
    const results = [{ text: "A", box: detections[0], confidence: 0.99 }];
    const service = new PaddleOcrService({
        ort: {} as unknown as OrtModule,
        detection: {
            padding: 2,
            minimumAreaThreshold: 10,
            paddingBoxVertical: 0.4,
            paddingBoxHorizontal: 0.6,
        },
        recognition: {
            charactersDictionary: ["", "A"],
            imageHeight: 48,
        },
    });
    const events: unknown[] = [];
    const detectionCalls: Array<{ width: number; options: Record<string, unknown> }> = [];
    const recognitionCalls: RecognitionOptions[] = [];

    service.detectionService = {
        run: async (image, options = {}) => {
            detectionCalls.push({
                width: image.width,
                options: options as unknown as Record<string, unknown>,
            });
            options.onProgress?.({
                type: "det",
                stage: "preprocess",
                progress: { current: 1, remain: 2, total: 3 },
            });
            return detections;
        },
    } as unknown as DetectionService;

    service.recognitionService = {
        run: async (_image, detection, options) => {
            recognitionCalls.push(options ?? {});
            assert.deepEqual(detection, detections);
            options?.onProgress?.({
                type: "rec",
                stage: "complete",
                progress: { current: detection.length, remain: 0, total: detection.length },
            });
            return results;
        },
    } as unknown as RecognitionService;

    const first = await service.recognize(createFakeInput(), {
        charWhiteList: ["A"],
        detection: {
            padding: 0,
            minimumAreaThreshold: 25,
            paddingBoxVertical: 0,
            paddingBoxHorizontal: 0,
            dilationKernelSize: 3,
        },
        recognition: {
            charactersDictionary: ["", "B"],
            imageHeight: 64,
        },
        ordering: {
            sortByReadingOrder: false,
            sameLineThresholdRatio: 0.1,
        },
        onProgress: (event) => events.push(event),
    });
    const second = await service.recognize(createFakeInput(), {
        onProgress: (event) => events.push(event),
    });

    assert.deepEqual(first, results);
    assert.deepEqual(second, results);
    assert.equal(detectionCalls[0]?.width, 1);
    assert.equal(detectionCalls[1]?.width, 5);
    assert.deepEqual(detectionCalls[0]?.options, {
        ...DEFAULT_DETECTION_OPTIONS,
        padding: 0,
        minimumAreaThreshold: 25,
        paddingBoxVertical: 0,
        paddingBoxHorizontal: 0,
        dilationKernelSize: 3,
        onProgress: recognitionCalls[0]?.onProgress,
    });
    assert.deepEqual(detectionCalls[1]?.options, {
        ...DEFAULT_DETECTION_OPTIONS,
        padding: 2,
        minimumAreaThreshold: 10,
        paddingBoxVertical: 0.4,
        paddingBoxHorizontal: 0.6,
        onProgress: recognitionCalls[1]?.onProgress,
    });
    assert.deepEqual(recognitionCalls[0]?.recognition, {
        charactersDictionary: ["", "B"],
        imageHeight: 64,
        imageWidth: 320,
        mean: [127.5, 127.5, 127.5],
        stdDeviation: [1 / 127.5, 1 / 127.5, 1 / 127.5],
        channelOrder: "rgb",
        outputSelectionStrategy: "first",
        reverseText: false,
    });
    assert.deepEqual(recognitionCalls[0]?.ordering, {
        sortByReadingOrder: false,
        sameLinePixelThreshold: 10,
        sameLineThresholdRatio: 0.1,
    });
    assert.deepEqual(recognitionCalls[0]?.charWhiteList, ["A"]);
    assert.deepEqual(recognitionCalls[1]?.recognition, {
        charactersDictionary: ["", "A"],
        imageHeight: 48,
        imageWidth: 320,
        mean: [127.5, 127.5, 127.5],
        stdDeviation: [1 / 127.5, 1 / 127.5, 1 / 127.5],
        channelOrder: "rgb",
        outputSelectionStrategy: "first",
        reverseText: false,
    });
    assert.deepEqual(recognitionCalls[1]?.ordering, {
        sortByReadingOrder: true,
        sameLinePixelThreshold: 10,
    });
    assert.deepEqual(events, [
        {
            type: "det",
            stage: "preprocess",
            progress: { current: 1, remain: 2, total: 3 },
        },
        {
            type: "rec",
            stage: "complete",
            progress: { current: 1, remain: 0, total: 1 },
        },
        {
            type: "det",
            stage: "preprocess",
            progress: { current: 1, remain: 2, total: 3 },
        },
        {
            type: "rec",
            stage: "complete",
            progress: { current: 1, remain: 0, total: 1 },
        },
    ]);
});

test("PaddleOcrService.recognize accepts per-call dictionaries and rejects missing dictionaries", async () => {
    const service = new PaddleOcrService({
        ort: {} as unknown as OrtModule,
    });

    service.detectionService = {
        run: async () => [{ x: 0, y: 0, width: 1, height: 1 }],
    } as unknown as DetectionService;

    service.recognitionService = {
        run: async (_image, _detection, options) => {
            assert.deepEqual(options?.recognition?.charactersDictionary, ["", "X"]);
            return [{ text: "X", box: { x: 0, y: 0, width: 1, height: 1 }, confidence: 1 }];
        },
    } as unknown as RecognitionService;

    const result = await service.recognize(createFakeInput(), {
        recognition: {
            charactersDictionary: ["", "X"],
        },
    });

    assert.equal(result[0]?.text, "X");
    await assert.rejects(
        () => service.recognize(createFakeInput()),
        /Recognition charactersDictionary is required/
    );
});

test("RecognitionService rotates 180-degree textline crops before CTC recognition", async () => {
    class Tensor {
        data: Float32Array;
        dims: readonly number[];

        constructor(_type: string, data: Float32Array, dims: readonly number[]) {
            this.data = data;
            this.dims = dims;
        }
    }

    const recognitionService = new RecognitionService(
        { Tensor } as unknown as OrtModule,
        {
            inputMetadata: [{ shape: [1, 3, 1, 2] }],
            outputNames: ["logits"],
            run: async () => ({}),
        },
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const seenTensors: number[][] = [];

    recognitionServiceInternals.runInference = async (inputTensor) => {
        seenTensors.push(Array.from(inputTensor.data as Float32Array));
        return {
            data: new Float32Array([0.1, 0.9]),
            dims: [1, 1, 2],
        };
    };

    const result = await recognitionServiceInternals.processBox(
        {
            image: new Image(2, 1, 3, new Uint8Array([1, 2, 3, 4, 5, 6])),
            box: { x: 0, y: 0, width: 2, height: 1 },
            index: 0,
            textlineOrientation: {
                threshold: 0.9,
            },
            textlineOrientationClassifier: {
                run: async () => [{ classId: 1, label: "180_degree", score: 0.95 }],
            },
        },
        {
            ...DEFAULT_RECOGNITION_OPTIONS,
            charactersDictionary: ["", "A"],
            imageHeight: 1,
            imageWidth: 2,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
        }
    );

    assert.equal(result?.text, "A");
    assert.deepEqual(result?.textlineOrientation, {
        classId: 1,
        label: "180_degree",
        score: 0.95,
        rotated: true,
    });
    assert.deepEqual(seenTensors, [[4, 1, 5, 2, 6, 3]]);
});

test("PaddleOcrService requires a textline orientation model when correction is enabled", async () => {
    const service = new PaddleOcrService({
        ort: {} as unknown as OrtModule,
        recognition: {
            charactersDictionary: ["", "A"],
        },
    });

    service.detectionService = {
        run: async () => [{ x: 0, y: 0, width: 1, height: 1 }],
    } as unknown as DetectionService;
    service.recognitionService = {
        run: async () => [],
    } as unknown as RecognitionService;

    await assert.rejects(
        () =>
            service.recognize(createFakeInput(), {
                textlineOrientation: {
                    enabled: true,
                },
            }),
        /Textline orientation correction requires textlineOrientation\.modelBuffer/
    );
});

test("PaddleOcrService applies model presets before explicit overrides", async () => {
    const service = new PaddleOcrService({
        ort: {} as unknown as OrtModule,
        modelPreset: "PP-OCRv6_small",
        detection: {
            boxScoreThreshold: 0.5,
        },
        recognition: {
            charactersDictionary: ["", "A"],
        },
    });
    const detectionCalls: DetectionRuntimeOptions[] = [];
    const recognitionCalls: RecognitionOptions[] = [];

    service.detectionService = {
        run: async (_image, options = {}) => {
            detectionCalls.push(options);
            return [{ x: 0, y: 0, width: 1, height: 1 }];
        },
    } as unknown as DetectionService;

    service.recognitionService = {
        run: async (_image, _detection, options) => {
            recognitionCalls.push(options ?? {});
            return [];
        },
    } as unknown as RecognitionService;

    await service.recognize(createFakeInput());

    assert.equal(detectionCalls[0]?.textPixelThreshold, 0.2);
    assert.equal(detectionCalls[0]?.boxScoreThreshold, 0.5);
    assert.equal(detectionCalls[0]?.maxCandidates, 3000);
    assert.equal(detectionCalls[0]?.unclipRatio, 1.4);
    assert.equal(detectionCalls[0]?.limitType, "min");
    assert.equal(detectionCalls[0]?.maxSideLength, 736);
    assert.equal(detectionCalls[0]?.maxSideLimit, 4000);
    assert.equal(detectionCalls[0]?.channelOrder, "bgr");
    assert.deepEqual(recognitionCalls[0]?.recognition, {
        ...DEFAULT_RECOGNITION_OPTIONS,
        charactersDictionary: ["", "A"],
        channelOrder: "bgr",
        outputSelectionStrategy: "ctc-logits",
    });
    assert.equal(getModelPreset("PP-OCRv6_tiny").detection.boxScoreThreshold, 0.4);
    assert.deepEqual(
        calculateDetectionResizeDimensions(new Image(100, 50, 3, new Uint8Array(100 * 50 * 3)), {
            ...DEFAULT_DETECTION_OPTIONS,
            ...getModelPreset("PP-OCRv6_small").detection,
        }),
        {
            srcWidth: 100,
            srcHeight: 50,
            resizeSourceWidth: 100,
            resizeSourceHeight: 50,
            dstWidth: 1472,
            dstHeight: 736,
            scaleWidth: 14.72,
            scaleHeight: 14.72,
        }
    );
    assert.equal(getModelPreset("PP-OCRv6_tiny").dictionary.useSpaceChar, true);
    assert.equal(getModelPreset("PP-OCRv6_tiny").dictionary.dictionaryLength, 6904);
    assert.equal(getModelPreset("PP-OCRv6_tiny").dictionary.recognitionOutputClasses, 6906);
    assert.equal(getModelPreset("PP-OCRv6_small").dictionary.useSpaceChar, true);
    assert.equal(getModelPreset("PP-OCRv6_small").dictionary.dictionaryLength, 18708);
    assert.equal(getModelPreset("PP-OCRv6_small").dictionary.recognitionOutputClasses, 18710);
    assert.equal(getModelPreset("PP-OCRv6_medium").dictionary.dictionaryLength, 18708);
    assert.equal(getModelPreset("PP-OCRv5").dictionary.useSpaceChar, true);
    assert.equal(getModelPreset("PP-OCRv5").dictionary.dictionaryLength, 18384);
    assert.equal(getModelPreset("PP-OCRv5").dictionary.recognitionOutputClasses, 18385);

    const missingDictionaryService = new PaddleOcrService({
        ort: {} as unknown as OrtModule,
        modelPreset: "PP-OCRv6_tiny",
    });
    missingDictionaryService.detectionService = {
        run: async () => [],
    } as unknown as DetectionService;
    missingDictionaryService.recognitionService = {
        run: async () => [],
    } as unknown as RecognitionService;

    await assert.rejects(
        () => missingDictionaryService.recognize(createFakeInput()),
        /PP-OCRv6_tiny preset expects ppocrv6_tiny_dict.txt with 6904 entries and 6906 CTC output classes/
    );
});

test("inferModelPreset detects PaddleOCR presets from lightweight naming signals", () => {
    assert.deepEqual(
        inferModelPreset({
            detectionModelFileName: "PP-OCRv6_small_det_infer.onnx",
            dictionaryFileName: "ppocrv6_dict.txt",
        }),
        {
            name: "PP-OCRv6_small",
            confidence: "high",
            signals: ["PP-OCRv6_small_det_infer.onnx", "ppocrv6_dict.txt"],
        }
    );
    assert.equal(
        inferModelPreset({
            recognitionModelFileName: "PP-OCRv6_medium_rec_infer.onnx",
        })?.name,
        "PP-OCRv6_medium"
    );
    assert.equal(
        inferModelPreset({
            modelName: "PP-OCRv6",
        })?.confidence,
        "medium"
    );
    assert.equal(
        inferModelPreset({
            fileName: "PP-OCRv5_mobile_rec_infer.onnx",
        })?.name,
        "PP-OCRv5_mobile"
    );
    assert.equal(
        inferModelPreset({
            dictionaryName: "ppocrv5",
        })?.name,
        "PP-OCRv5"
    );
    assert.deepEqual(
        inferModelPreset({
            recognitionOutputClasses: 6906,
        }),
        {
            name: "PP-OCRv6_tiny",
            confidence: "high",
            signals: ["recognitionOutputClasses:6906"],
        }
    );
    assert.deepEqual(
        inferModelPreset({
            recognitionOutputShape: ["batch", "time", 18710],
        }),
        {
            name: "PP-OCRv6_small",
            confidence: "medium",
            signals: ["recognitionOutputClasses:18710"],
        }
    );
    assert.deepEqual(
        inferModelPreset({
            dictionaryLength: 18708,
        }),
        {
            name: "PP-OCRv6_small",
            confidence: "medium",
            signals: ["dictionaryLength:18708"],
        }
    );
    assert.deepEqual(
        inferModelPreset({
            recognitionOutputClasses: 18385,
        }),
        {
            name: "PP-OCRv5",
            confidence: "medium",
            signals: ["recognitionOutputClasses:18385"],
        }
    );
    assert.equal(
        inferModelPreset({
            recognitionOutputShape: ["DynamicDimension.2", "DynamicDimension.3", 18385],
        })?.name,
        "PP-OCRv5"
    );
    assert.deepEqual(
        inferModelPreset({
            recognitionOutputClasses: 18385,
            dictionaryLength: 18384,
        })?.signals,
        ["recognitionOutputClasses:18385", "dictionaryLength:18384"]
    );
    assert.equal(
        inferModelPreset({
            recognitionOutputClasses: 999,
            dictionaryLength: 998,
        }),
        undefined
    );
    assert.equal(inferModelPreset({ fileName: "custom_rec.onnx" }), undefined);
});

test("RecognitionService expands recognition tensor width for long text crops", async () => {
    let seenDims: readonly number[] | undefined;
    const recognitionService = new RecognitionService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: unknown;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenDims = dims;
                }
            },
        } as unknown as OrtModule,
        {
            run: async () => ({
                output: {
                    data: new Float32Array([0.1, 0.9]),
                    dims: [1, 1, 2],
                },
            }),
        } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const image = new Image(100, 10, 3, new Uint8Array(100 * 10 * 3).fill(255));

    await recognitionServiceInternals.processBox(
        {
            image,
            box: { x: 0, y: 0, width: 100, height: 10 },
            index: 0,
        },
        {
            ...DEFAULT_RECOGNITION_OPTIONS,
            charactersDictionary: ["A"],
        }
    );

    assert.deepEqual(seenDims, [1, 3, 48, 480]);
});

test("RecognitionService honors fixed ONNX recognition input width", async () => {
    let seenInput: { data: Float32Array; dims: readonly number[] } | undefined;
    const recognitionService = new RecognitionService(
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
            inputMetadata: [
                {
                    shape: ["batch", 3, 48, 320],
                },
            ],
            run: async () => ({
                output: {
                    data: new Float32Array([0.1, 0.9]),
                    dims: [1, 1, 2],
                },
            }),
        } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const image = new Image(100, 10, 3, new Uint8Array(100 * 10 * 3).fill(255));

    await recognitionServiceInternals.processBox(
        {
            image,
            box: { x: 0, y: 0, width: 100, height: 10 },
            index: 0,
        },
        {
            ...DEFAULT_RECOGNITION_OPTIONS,
            charactersDictionary: ["A"],
        }
    );

    assert.deepEqual(seenInput?.dims, [1, 3, 48, 320]);
    assert.equal(seenInput?.data.length, 1 * 3 * 48 * 320);
});

test("RecognitionService pads recognition tensors to the batch max width ratio", async () => {
    const seenDims: readonly number[][] = [];
    const recognitionService = new RecognitionService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: unknown;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenDims.push(dims);
                }
            },
        } as unknown as OrtModule,
        {
            run: async () => ({
                output: {
                    data: new Float32Array([0.1, 0.9]),
                    dims: [1, 1, 2],
                },
            }),
        } as unknown as OrtInferenceSession,
        {}
    );
    const image = new Image(120, 30, 3, new Uint8Array(120 * 30 * 3).fill(255));

    await recognitionService.run(
        image,
        [
            { x: 0, y: 0, width: 10, height: 10 },
            { x: 0, y: 15, width: 100, height: 10 },
        ],
        {
            recognition: {
                charactersDictionary: ["A"],
            },
        }
    );

    assert.deepEqual(seenDims, [
        [1, 3, 48, 480],
        [1, 3, 48, 480],
    ]);
});

test("RecognitionService can select CTC logits from multiple ONNX outputs", async () => {
    const recognitionService = new RecognitionService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: unknown;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                }
            },
        } as unknown as OrtModule,
        {
            run: async () => ({
                aux: {
                    data: new Float32Array([1, 2, 3]),
                    dims: [1, 3],
                },
                auxiliaryLogits: {
                    data: new Float32Array([0.1, 0.2, 0.9]),
                    dims: [1, 1, 3],
                },
                logits: {
                    data: new Float32Array([0.1, 0.9, 0.2]),
                    dims: [1, 1, 3],
                },
            }),
        } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const image = new Image(1, 1, 3, new Uint8Array([255, 255, 255]));

    const result = await recognitionServiceInternals.processBox(
        {
            image,
            box: { x: 0, y: 0, width: 1, height: 1 },
            index: 0,
        },
        {
            ...DEFAULT_RECOGNITION_OPTIONS,
            charactersDictionary: ["", "A", "B"],
            outputSelectionStrategy: "ctc-logits",
        }
    );

    assert.equal(result?.text, "A");
});

test("RecognitionService honors recognition overrides, ordering overrides, and progress events", async () => {
    const recognitionService = new RecognitionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { run: async () => ({}) } as unknown as OrtInferenceSession,
        { charactersDictionary: ["", "A"], imageHeight: 48 }
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const events: unknown[] = [];
    const runtimeOptionsSeen: RecognitionRuntimeOptions[] = [];
    const boxes = [
        { x: 30, y: 0, width: 10, height: 10 },
        { x: 5, y: 2, width: 10, height: 10 },
        { x: 20, y: 20, width: 10, height: 10 },
    ];

    recognitionServiceInternals.processBox = async (task, runtimeOptions) => {
        runtimeOptionsSeen.push(runtimeOptions);
        assert.ok(task.charWhiteSet?.has("A"));

        return {
            text: `box-${task.index}`,
            box: task.box,
            confidence: 1,
        };
    };

    const results = await recognitionService.run(
        {} as unknown as Parameters<RecognitionService["run"]>[0],
        boxes,
        {
            charWhiteList: ["A"],
            recognition: {
                charactersDictionary: ["", "B"],
                imageHeight: 64,
            },
            ordering: {
                sameLineThresholdRatio: 0,
            },
            onProgress: (event) => events.push(event),
        }
    );

    assert.deepEqual(
        runtimeOptionsSeen,
        Array.from({ length: 3 }, () => ({
            charactersDictionary: ["", "B"],
            imageHeight: 64,
            imageWidth: 320,
            mean: [127.5, 127.5, 127.5],
            stdDeviation: [1 / 127.5, 1 / 127.5, 1 / 127.5],
            channelOrder: "rgb",
            outputSelectionStrategy: "first",
            reverseText: false,
        }))
    );
    assert.deepEqual(
        results.map((result) => result.box),
        [boxes[0], boxes[1], boxes[2]]
    );
    assert.deepEqual(
        events.map((event) => {
            const progressEvent = event as {
                stage: string;
                progress: { current: number; total: number };
            };
            return `${progressEvent.stage}:${progressEvent.progress.current}/${progressEvent.progress.total}`;
        }),
        ["start:0/3", "item:1/3", "item:2/3", "item:3/3", "complete:3/3"]
    );
});

test("RecognitionService decodes dictionaries with or without an explicit CTC blank entry", () => {
    const recognitionService = new RecognitionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const logits = new Float32Array([0.1, 0.9, 0.2, 0.1, 0.8, 0.2, 0.1, 0.2, 0.7]);

    const explicitBlankResult = recognitionServiceInternals.ctcLabelDecode(logits, 3, 3, {
        ...DEFAULT_RECOGNITION_OPTIONS,
        charactersDictionary: ["", "A", "B"],
    });
    const implicitBlankResult = recognitionServiceInternals.ctcLabelDecode(logits, 3, 3, {
        ...DEFAULT_RECOGNITION_OPTIONS,
        charactersDictionary: ["A", "B"],
    });

    assert.equal(explicitBlankResult.text, "AB");
    assert.equal(implicitBlankResult.text, "AB");
    assert.ok(Math.abs(explicitBlankResult.confidence - 0.8) < 1e-6);
    assert.ok(Math.abs(implicitBlankResult.confidence - 0.8) < 1e-6);
});

test("RecognitionService can reverse CTC text with PaddleOCR Arabic grouping", () => {
    const recognitionService = new RecognitionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const logits = new Float32Array([
        0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1, 0.7, 0.1, 0.1, 0.1, 0.1,
        0.1, 0.6,
    ]);

    const result = recognitionServiceInternals.ctcLabelDecode(logits, 4, 5, {
        ...DEFAULT_RECOGNITION_OPTIONS,
        charactersDictionary: ["", "AB", "ش", "12", "م"],
        reverseText: true,
    });

    assert.equal(result.text, "م12شAB");
    assert.ok(Math.abs(result.confidence - 0.75) < 1e-6);
});

test("RecognitionService sorts boxes by PaddleOCR reading order by default", () => {
    const recognitionService = new RecognitionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const sameLineBoxes = [
        { x: 30, y: 0, width: 10, height: 10 },
        { x: 5, y: 8, width: 10, height: 10 },
        { x: 0, y: 20, width: 10, height: 10 },
    ];
    const differentLineBoxes = [
        { x: 30, y: 0, width: 10, height: 10 },
        { x: 5, y: 10, width: 10, height: 10 },
    ];

    const sameLineSorted = recognitionServiceInternals.sortBoxesByReadingOrder(sameLineBoxes, {
        sortByReadingOrder: true,
        sameLinePixelThreshold: 10,
    });
    const differentLineSorted = recognitionServiceInternals.sortBoxesByReadingOrder(
        differentLineBoxes,
        {
            sortByReadingOrder: true,
            sameLinePixelThreshold: 10,
        }
    );

    assert.deepEqual(sameLineSorted, [sameLineBoxes[1], sameLineBoxes[0], sameLineBoxes[2]]);
    assert.deepEqual(differentLineSorted, differentLineBoxes);
});

test("RecognitionService can keep original detection order or use ratio line thresholds", () => {
    const recognitionService = new RecognitionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const recognitionServiceInternals =
        recognitionService as unknown as RecognitionServiceInternals;
    const boxes = [
        { x: 30, y: 0, width: 10, height: 10 },
        { x: 5, y: 2, width: 10, height: 10 },
    ];

    const ratioSorted = recognitionServiceInternals.sortBoxesByReadingOrder(boxes, {
        sortByReadingOrder: true,
        sameLinePixelThreshold: 0,
        sameLineThresholdRatio: 0.25,
    });
    const original = recognitionServiceInternals.sortBoxesByReadingOrder(boxes, {
        sortByReadingOrder: false,
        sameLinePixelThreshold: 10,
    });

    assert.deepEqual(ratioSorted, [boxes[1], boxes[0]]);
    assert.deepEqual(original, boxes);
});

test("PaddleOcrService.processRecognition supports configurable line merge thresholds", () => {
    const service = new PaddleOcrService({ ort: {} as unknown as OrtModule });
    const recognition = [
        {
            text: "A",
            box: { x: 0, y: 0, width: 10, height: 10 },
            confidence: 0.9,
        },
        {
            text: "B",
            box: { x: 20, y: 6, width: 10, height: 10 },
            confidence: 0.8,
        },
    ];

    const defaultProcessed = service.processRecognition(recognition);
    const mergedProcessed = service.processRecognition(recognition, {
        lineMergeThresholdRatio: 1,
    });

    assert.equal(defaultProcessed.lines.length, 2);
    assert.equal(defaultProcessed.text, "A\nB");
    assert.equal(mergedProcessed.lines.length, 1);
    assert.equal(mergedProcessed.text, "A B");
});

test("PaddleOcrService.processRecognition filters low confidence text like PaddleOCR drop_score", () => {
    const service = new PaddleOcrService({ ort: {} as unknown as OrtModule });
    const recognition = [
        {
            text: "A",
            box: { x: 0, y: 0, width: 10, height: 10 },
            confidence: 0.5,
        },
        {
            text: "B",
            box: { x: 20, y: 0, width: 10, height: 10 },
            confidence: 0.49,
        },
    ];

    const defaultProcessed = service.processRecognition(recognition, {
        lineMergeThresholdRatio: 1,
    });
    const unfilteredProcessed = service.processRecognition(recognition, {
        lineMergeThresholdRatio: 1,
        recognitionScoreThreshold: 0,
    });

    assert.equal(defaultProcessed.text, "A");
    assert.equal(defaultProcessed.confidence, 0.5);
    assert.equal(unfilteredProcessed.text, "A B");
    assert.equal(unfilteredProcessed.confidence, 0.495);
});
