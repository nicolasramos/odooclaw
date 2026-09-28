import assert from "node:assert/strict";
import test from "node:test";
import { approxPolyDP } from "../src/core/geometry/contours.ts";
import { Image } from "../src/core/image.ts";
import {
    DEFAULT_DETECTION_OPTIONS,
    type DetectionRuntimeOptions,
    DetectionService,
    getTextDetectionPreset,
    getTextDetectionPresetOptions,
    type ImageClassificationService,
    type OrtInferenceSession,
    type OrtModule,
    type PreprocessDetectionResult,
    type RecognitionOptions,
    type RecognitionOrderingOptions,
    type RecognitionResult,
    type RecognitionRuntimeOptions,
    type RecognitionService,
} from "../src/index.ts";
import {
    boxScoreFast,
    hasOfficialQuadSize,
    orderPointsClockwise,
} from "../src/modules/text-detection/postprocess.ts";
import {
    calculateDetectionResizeDimensions,
    preprocessDetection,
} from "../src/modules/text-detection/preprocess.ts";

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

test("text detection presets expose official DB parameters", () => {
    const tinyText = getTextDetectionPreset("PP-OCRv6_tiny_det");
    const smallText = getTextDetectionPreset("PP-OCRv6_small_det");
    const mediumText = getTextDetectionPreset("PP-OCRv6_medium_det");
    const textOptions = getTextDetectionPresetOptions("PP-OCRv6_small_det");
    const mobileSeal = getTextDetectionPreset("PP-OCRv4_mobile_seal_det");
    const serverSeal = getTextDetectionPreset("PP-OCRv4_server_seal_det");
    const sealOptions = getTextDetectionPresetOptions("PP-OCRv4_mobile_seal_det");

    assert.equal(tinyText.module, "text_detection");
    assert.equal(smallText.module, "text_detection");
    assert.equal(mediumText.module, "text_detection");
    assert.deepEqual(textOptions, {
        channelOrder: "bgr",
        maxSideLength: 736,
        limitType: "min",
        maxSideLimit: 4000,
        textPixelThreshold: 0.2,
        boxScoreThreshold: 0.45,
        maxCandidates: 3000,
        unclipRatio: 1.4,
    });
    assert.equal(tinyText.options.boxScoreThreshold, 0.4);
    assert.equal(mobileSeal.module, "seal_text_detection");
    assert.equal(serverSeal.module, "seal_text_detection");
    assert.deepEqual(sealOptions, {
        channelOrder: "bgr",
        maxSideLength: 736,
        limitType: "resize_long",
        maxSideLimit: 4000,
        textPixelThreshold: 0.2,
        boxScoreThreshold: 0.6,
        maxCandidates: 1000,
        unclipRatio: 0.5,
        boxType: "poly",
    });

    textOptions.unclipRatio = 9;
    sealOptions.unclipRatio = 9;
    assert.equal(getTextDetectionPreset("PP-OCRv6_small_det").options.unclipRatio, 1.4);
    assert.equal(getTextDetectionPreset("PP-OCRv4_mobile_seal_det").options.unclipRatio, 0.5);
});

test("DetectionService emits progress and forwards merged runtime options including zero-valued overrides", async () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        { minimumAreaThreshold: 20 }
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const events: unknown[] = [];
    const seenOptions: DetectionRuntimeOptions[] = [];
    const detectedBoxes = [{ x: 1, y: 2, width: 3, height: 4 }];

    detectionServiceInternals.preprocessDetection = async (_image, runtimeOptions) => {
        seenOptions.push(runtimeOptions);
        return {
            tensor: new Float32Array([1]),
            resizeParams: {
                srcWidth: 1,
                srcHeight: 1,
                resizeSourceWidth: 1,
                resizeSourceHeight: 1,
                dstWidth: 1,
                dstHeight: 1,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        };
    };
    detectionServiceInternals.runInference = async () => new Float32Array([1]);
    detectionServiceInternals.postprocessDetection = (_detection, _input, runtimeOptions) => {
        seenOptions.push(runtimeOptions);
        return detectedBoxes;
    };

    const result = await detectionService.run(
        {} as unknown as Parameters<DetectionService["run"]>[0],
        {
            minimumAreaThreshold: 9,
            paddingBoxVertical: 0,
            paddingBoxHorizontal: 0,
            dilationKernelSize: 3,
            onProgress: (event) => events.push(event),
        }
    );

    assert.deepEqual(result, detectedBoxes);
    assert.deepEqual(seenOptions, [
        {
            ...DEFAULT_DETECTION_OPTIONS,
            minimumAreaThreshold: 9,
            paddingBoxVertical: 0,
            paddingBoxHorizontal: 0,
            dilationKernelSize: 3,
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            minimumAreaThreshold: 9,
            paddingBoxVertical: 0,
            paddingBoxHorizontal: 0,
            dilationKernelSize: 3,
        },
    ]);
    assert.deepEqual(events, [
        {
            type: "det",
            stage: "preprocess",
            progress: { current: 1, remain: 2, total: 3 },
        },
        {
            type: "det",
            stage: "infer",
            progress: { current: 2, remain: 1, total: 3 },
        },
        {
            type: "det",
            stage: "postprocess",
            progress: { current: 3, remain: 0, total: 3 },
            detectedCount: 1,
        },
    ]);
});

test("DetectionService throws when the configured output tensor is missing", async () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        {
            outputNames: ["missing"],
            run: async () => ({
                actual: { data: new Float32Array([1]), dims: [1] },
            }),
        } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;

    await assert.rejects(
        () =>
            detectionServiceInternals.runInference(new Float32Array([1]), {
                srcWidth: 1,
                srcHeight: 1,
                resizeSourceWidth: 1,
                resizeSourceHeight: 1,
                dstWidth: 1,
                dstHeight: 1,
                scaleWidth: 1,
                scaleHeight: 1,
            }),
        /Detection output tensor 'missing' not found\. Available keys: actual/
    );
});

test("DetectionService fails fast for unsupported DB output tensors", async () => {
    const resizeParams = {
        srcWidth: 3,
        srcHeight: 2,
        resizeSourceWidth: 3,
        resizeSourceHeight: 2,
        dstWidth: 3,
        dstHeight: 2,
        scaleWidth: 1,
        scaleHeight: 1,
    };
    const createService = (output: { data: unknown; dims: readonly number[] }) =>
        new DetectionService(
            { Tensor: class Tensor {} } as unknown as OrtModule,
            {
                outputNames: ["maps"],
                run: async () => ({
                    maps: output,
                }),
            } as unknown as OrtInferenceSession,
            {}
        ) as unknown as DetectionServiceInternals;

    await assert.rejects(
        () =>
            createService({ data: new Int32Array(6), dims: [1, 1, 2, 3] }).runInference(
                new Float32Array(3 * 2 * 3),
                resizeParams
            ),
        /Detection output tensor must contain Float32Array data/
    );
    await assert.rejects(
        () =>
            createService({ data: new Float32Array(6), dims: [1, 2, 3, 1] }).runInference(
                new Float32Array(3 * 2 * 3),
                resizeParams
            ),
        /must be DB maps in \[1,C,2,3\] layout/
    );
    await assert.rejects(
        () =>
            createService({ data: new Float32Array(5), dims: [1, 1, 2, 3] }).runInference(
                new Float32Array(3 * 2 * 3),
                resizeParams
            ),
        /does not match data length 5/
    );
});

test("calculateDetectionResizeDimensions mirrors PaddleOCR limit_type strategies", () => {
    const image = new Image(200, 100, 3, new Uint8Array(200 * 100 * 3));

    assert.deepEqual(
        calculateDetectionResizeDimensions(image, {
            ...DEFAULT_DETECTION_OPTIONS,
            maxSideLength: 160,
            limitType: "max",
        }),
        {
            srcWidth: 200,
            srcHeight: 100,
            resizeSourceWidth: 200,
            resizeSourceHeight: 100,
            dstWidth: 160,
            dstHeight: 96,
            scaleWidth: 0.8,
            scaleHeight: 0.96,
        }
    );
    assert.deepEqual(
        calculateDetectionResizeDimensions(image, {
            ...DEFAULT_DETECTION_OPTIONS,
            maxSideLength: 160,
            limitType: "min",
        }),
        {
            srcWidth: 200,
            srcHeight: 100,
            resizeSourceWidth: 200,
            resizeSourceHeight: 100,
            dstWidth: 320,
            dstHeight: 160,
            scaleWidth: 1.6,
            scaleHeight: 1.6,
        }
    );
    assert.deepEqual(
        calculateDetectionResizeDimensions(image, {
            ...DEFAULT_DETECTION_OPTIONS,
            maxSideLength: 128,
            limitType: "resize_long",
        }),
        {
            srcWidth: 200,
            srcHeight: 100,
            resizeSourceWidth: 200,
            resizeSourceHeight: 100,
            dstWidth: 128,
            dstHeight: 64,
            scaleWidth: 0.64,
            scaleHeight: 0.64,
        }
    );
});

test("calculateDetectionResizeDimensions caps resized dimensions with maxSideLimit", () => {
    const image = new Image(5000, 1000, 3, new Uint8Array(5000 * 1000 * 3));

    const resizeParams = calculateDetectionResizeDimensions(image, {
        ...DEFAULT_DETECTION_OPTIONS,
        maxSideLength: 3000,
        limitType: "min",
        maxSideLimit: 4000,
    });

    assert.deepEqual(resizeParams, {
        srcWidth: 5000,
        srcHeight: 1000,
        resizeSourceWidth: 5000,
        resizeSourceHeight: 1000,
        dstWidth: 4000,
        dstHeight: 800,
        scaleWidth: 0.8,
        scaleHeight: 0.8,
    });
});

test("calculateDetectionResizeDimensions honors fixed detection inputShape", () => {
    const image = new Image(200, 100, 3, new Uint8Array(200 * 100 * 3));

    assert.deepEqual(
        calculateDetectionResizeDimensions(image, {
            ...DEFAULT_DETECTION_OPTIONS,
            inputShape: [3, 64, 96],
            maxSideLength: 960,
            limitType: "max",
        }),
        {
            srcWidth: 200,
            srcHeight: 100,
            resizeSourceWidth: 200,
            resizeSourceHeight: 100,
            dstWidth: 96,
            dstHeight: 64,
            scaleWidth: 0.48,
            scaleHeight: 0.64,
        }
    );
});

test("preprocessDetection pads very small images before resizing like PaddleOCR", () => {
    const image = new Image(10, 12, 3, new Uint8Array(10 * 12 * 3).fill(255));
    const input = preprocessDetection(image, {
        ...DEFAULT_DETECTION_OPTIONS,
        mean: [0, 0, 0],
        stdDeviation: [1, 1, 1],
        limitType: "min",
        maxSideLength: 960,
    });

    assert.deepEqual(input.resizeParams, {
        srcWidth: 10,
        srcHeight: 12,
        resizeSourceWidth: 32,
        resizeSourceHeight: 32,
        dstWidth: 960,
        dstHeight: 960,
        scaleWidth: 30,
        scaleHeight: 30,
    });
    assert.equal(input.tensor[0], 255);
    assert.equal(input.tensor[960 * 960 - 1], 0);
});

test("DetectionService uses fixed ONNX detection input shape metadata", async () => {
    let seenDims: readonly number[] | undefined;
    const detectionService = new DetectionService(
        {
            Tensor: class Tensor {
                dims: readonly number[];
                data: Float32Array;
                constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                    this.data = data;
                    this.dims = dims;
                    seenDims = dims;
                }
            },
        } as unknown as OrtModule,
        {
            inputMetadata: [
                {
                    shape: ["batch", 3, 64, 96],
                },
            ],
            outputNames: ["output"],
            run: async () => ({
                output: {
                    data: new Float32Array(64 * 96),
                    dims: [1, 1, 64, 96],
                },
            }),
        } as unknown as OrtInferenceSession,
        {
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
        }
    );
    const image = new Image(200, 100, 3, new Uint8Array(200 * 100 * 3).fill(255));

    await detectionService.run(image);

    assert.deepEqual(seenDims, [1, 3, 64, 96]);
});

test("DetectionService postprocesses DB score maps into quadrilateral boxes", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 16;
    const height = 16;
    const detection = new Float32Array(width * height);
    for (let y = 4; y <= 9; y++) {
        for (let x = 3; x <= 11; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
        }
    );

    assert.equal(boxes.length, 1);
    assert.ok(boxes[0]?.points);
    assert.equal(boxes[0]?.points?.length, 4);
    assert.ok((boxes[0]?.width ?? 0) > 8);
    assert.ok((boxes[0]?.height ?? 0) > 5);
});

test("DetectionService reads the first DB output channel like official pred[:, 0]", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 16;
    const height = 16;
    const pixelCount = width * height;
    const detection = new Float32Array(pixelCount * 3);
    for (let y = 4; y <= 9; y++) {
        for (let x = 3; x <= 11; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
        }
    );

    assert.equal(boxes.length, 1);
});

test("DetectionService rejects incomplete DB score map channels", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 16;
    const height = 16;
    const pixelCount = width * height;
    const input = {
        tensor: new Float32Array(),
        resizeParams: {
            srcWidth: width,
            srcHeight: height,
            resizeSourceWidth: width,
            resizeSourceHeight: height,
            dstWidth: width,
            dstHeight: height,
            scaleWidth: 1,
            scaleHeight: 1,
        },
    };
    const options = {
        ...DEFAULT_DETECTION_OPTIONS,
        minimumAreaThreshold: 1,
        dilationKernelSize: 0,
    };

    assert.throws(
        () =>
            detectionServiceInternals.postprocessDetection(
                new Float32Array(pixelCount - 1),
                input,
                options
            ),
        /Invalid DB output length/
    );
    assert.throws(
        () =>
            detectionServiceInternals.postprocessDetection(
                new Float32Array(pixelCount + 1),
                input,
                options
            ),
        /complete channels/
    );
});

test("DetectionService thresholds DB maps from raw floats like official pred > thresh", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 16;
    const height = 16;
    const detection = new Float32Array(width * height);
    for (let y = 4; y <= 9; y++) {
        for (let x = 3; x <= 11; x++) {
            detection[y * width + x] = 0.5;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            textPixelThreshold: 0.5,
            boxScoreThreshold: 0.5,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
        }
    );

    assert.equal(boxes.length, 0);
});

test("DetectionService treats zero dilation kernel as official no-dilate path", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 12;
    const height = 12;
    const detection = new Float32Array(width * height);
    for (let y = 3; y <= 8; y++) {
        for (let x = 3; x <= 8; x++) {
            detection[y * width + x] = 0.95;
        }
    }
    const input = {
        tensor: new Float32Array(),
        resizeParams: {
            srcWidth: width,
            srcHeight: height,
            resizeSourceWidth: width,
            resizeSourceHeight: height,
            dstWidth: width,
            dstHeight: height,
            scaleWidth: 1,
            scaleHeight: 1,
        },
    };
    const options = {
        ...DEFAULT_DETECTION_OPTIONS,
        boxScoreThreshold: 0.5,
        minimumAreaThreshold: 1,
        unclipRatio: 0,
    };

    const withoutDilation = detectionServiceInternals.postprocessDetection(detection, input, {
        ...options,
        dilationKernelSize: 0,
    });
    const withDilation = detectionServiceInternals.postprocessDetection(detection, input, {
        ...options,
        dilationKernelSize: 2,
    });

    assert.equal(withoutDilation.length, 1);
    assert.equal(withDilation.length, 1);
    assert.ok((withDilation[0]?.width ?? 0) > (withoutDilation[0]?.width ?? 0));
    assert.throws(
        () =>
            detectionServiceInternals.postprocessDetection(detection, input, {
                ...options,
                dilationKernelSize: -1,
            }),
        /Invalid DB dilationKernelSize/
    );
});

test("DetectionService supports official DB slow contour score mode", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 20;
    const height = 20;
    const detection = new Float32Array(width * height);
    for (let y = 3; y <= 14; y++) {
        for (let x = 3; x <= 14; x++) {
            if (x <= 7 || y <= 7) {
                detection[y * width + x] = 0.95;
            }
        }
    }
    const input = {
        tensor: new Float32Array(),
        resizeParams: {
            srcWidth: width,
            srcHeight: height,
            resizeSourceWidth: width,
            resizeSourceHeight: height,
            dstWidth: width,
            dstHeight: height,
            scaleWidth: 1,
            scaleHeight: 1,
        },
    };
    const options = {
        ...DEFAULT_DETECTION_OPTIONS,
        boxScoreThreshold: 0.6,
        minimumAreaThreshold: 1,
        dilationKernelSize: 0,
    };

    const fastBoxes = detectionServiceInternals.postprocessDetection(detection, input, {
        ...options,
        scoreMode: "fast",
    });
    const slowBoxes = detectionServiceInternals.postprocessDetection(detection, input, {
        ...options,
        scoreMode: "slow",
    });

    assert.equal(fastBoxes.length, 0);
    assert.equal(slowBoxes.length, 1);
    assert.throws(
        () =>
            detectionServiceInternals.postprocessDetection(detection, input, {
                ...options,
                scoreMode: "middle" as "fast",
            }),
        /Unsupported DB scoreMode/
    );
    assert.throws(
        () =>
            detectionServiceInternals.postprocessDetection(detection, input, {
                ...options,
                boxType: "curve" as "quad",
            }),
        /Unsupported DB boxType/
    );
});

test("DetectionService rounds and clips DB box points to the final image pixel boundary", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 16;
    const height = 16;
    const detection = new Float32Array(width * height);
    for (let y = 9; y <= 15; y++) {
        for (let x = 9; x <= 15; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            boxScoreThreshold: 0.5,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
        }
    );

    assert.equal(boxes.length, 1);
    const points = boxes[0]?.points ?? [];
    assert.equal(Math.max(...points.map((point) => point.x)), width - 1);
    assert.equal(Math.max(...points.map((point) => point.y)), height - 1);
    assert.ok(points.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y)));
});

test("DetectionService filters thin DB quad contours before unclip like official min_size", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 20;
    const height = 20;
    const detection = new Float32Array(width * height);
    for (let y = 3; y <= 15; y++) {
        for (let x = 8; x <= 9; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            boxScoreThreshold: 0.5,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
            unclipRatio: 8,
        }
    );

    assert.equal(boxes.length, 0);
});

test("DetectionService can postprocess DB score maps as polygons", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 20;
    const height = 20;
    const detection = new Float32Array(width * height);
    for (let y = 4; y <= 12; y++) {
        for (let x = 3; x <= 8; x++) {
            detection[y * width + x] = 0.95;
        }
    }
    for (let y = 9; y <= 14; y++) {
        for (let x = 9; x <= 15; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            boxType: "poly",
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
        }
    );

    assert.equal(boxes.length, 1);
    assert.ok((boxes[0]?.polygon?.length ?? 0) >= 8);
    assert.equal(boxes[0]?.points, undefined);
    assert.ok((boxes[0]?.width ?? 0) > 12);
    assert.ok((boxes[0]?.height ?? 0) > 10);
});

test("DetectionService approximates DB contours only for polygon output", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 12;
    const height = 12;
    const detection = new Float32Array(width * height);
    for (let y = 3; y <= 7; y++) {
        for (let x = 2; x <= 6; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            boxType: "poly",
            boxScoreThreshold: 0.5,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
            unclipRatio: 0,
        }
    );

    assert.equal(boxes.length, 1);
    assert.equal(boxes[0]?.polygon?.length, 4);
});

test("DetectionService only clips final DB polygons like official det_box_type poly", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 20;
    const height = 20;
    const detection = new Float32Array(width * height);
    for (let y = 4; y <= 10; y++) {
        for (let x = 4; x <= 10; x++) {
            detection[y * width + x] = 0.95;
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: 3,
                srcHeight: 3,
                resizeSourceWidth: 3,
                resizeSourceHeight: 3,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 4,
                scaleHeight: 4,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            boxType: "poly",
            boxScoreThreshold: 0.5,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
            unclipRatio: 0,
        }
    );

    assert.equal(boxes.length, 1);
    assert.ok(boxes[0]?.polygon);
    assert.ok((boxes[0]?.width ?? Infinity) <= 3);
    assert.ok((boxes[0]?.height ?? Infinity) <= 3);
});

test("DetectionService scores DB polygons through filled masks instead of component pixels", () => {
    const detectionService = new DetectionService(
        { Tensor: class Tensor {} } as unknown as OrtModule,
        { outputNames: [], run: async () => ({}) } as unknown as OrtInferenceSession,
        {}
    );
    const detectionServiceInternals = detectionService as unknown as DetectionServiceInternals;
    const width = 12;
    const height = 12;
    const detection = new Float32Array(width * height);
    for (let y = 2; y <= 9; y++) {
        for (let x = 2; x <= 9; x++) {
            if (x === 2 || x === 9 || y === 2 || y === 9) {
                detection[y * width + x] = 0.95;
            }
        }
    }

    const boxes = detectionServiceInternals.postprocessDetection(
        detection,
        {
            tensor: new Float32Array(),
            resizeParams: {
                srcWidth: width,
                srcHeight: height,
                resizeSourceWidth: width,
                resizeSourceHeight: height,
                dstWidth: width,
                dstHeight: height,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        {
            ...DEFAULT_DETECTION_OPTIONS,
            boxType: "poly",
            boxScoreThreshold: 0.6,
            minimumAreaThreshold: 1,
            dilationKernelSize: 0,
        }
    );

    assert.equal(boxes.length, 0);
});

test("DetectionService scores boxes through polygon mask averages", () => {
    const width = 5;
    const height = 5;
    const scoreMap = new Float32Array(width * height);
    for (let y = 1; y < 4; y++) {
        for (let x = 1; x < 4; x++) {
            scoreMap[y * width + x] = 1;
        }
    }

    const score = boxScoreFast(scoreMap, width, height, [
        { x: 1, y: 1 },
        { x: 4, y: 1 },
        { x: 4, y: 4 },
        { x: 1, y: 4 },
    ]);

    assert.equal(score, 9 / 16);
});

test("DetectionService truncates DB score polygon points like cv2.fillPoly", () => {
    const width = 5;
    const height = 5;
    const scoreMap = new Float32Array(width * height);
    for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
            scoreMap[y * width + x] = 1;
        }
    }

    const score = boxScoreFast(scoreMap, width, height, [
        { x: 1.8, y: 1.8 },
        { x: 3.8, y: 1.8 },
        { x: 3.8, y: 3.8 },
        { x: 1.8, y: 3.8 },
    ]);

    assert.equal(score, 1);
});

test("DetectionService orders DB mini boxes like official get_mini_boxes", () => {
    const points = [
        { x: 10, y: 0 },
        { x: 0, y: 10 },
        { x: 11, y: 9 },
        { x: 1, y: 19 },
    ];

    assert.deepEqual(orderPointsClockwise(points), [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
        { x: 11, y: 9 },
        { x: 1, y: 19 },
    ]);
});

test("DetectionService filters final DB quads by official clipped side lengths", () => {
    assert.equal(
        hasOfficialQuadSize([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 3.9 },
            { x: 0, y: 3.9 },
        ]),
        false
    );
    assert.equal(
        hasOfficialQuadSize([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 4.1 },
            { x: 0, y: 4.1 },
        ]),
        true
    );
});

test("approxPolyDP simplifies closed DB contours as rings", () => {
    const contour: Array<{ x: number; y: number }> = [];
    for (let x = 0; x <= 10; x++) {
        contour.push({ x, y: 0 });
    }
    for (let y = 1; y <= 10; y++) {
        contour.push({ x: 10, y });
    }
    for (let x = 9; x >= 0; x--) {
        contour.push({ x, y: 10 });
    }
    for (let y = 9; y >= 1; y--) {
        contour.push({ x: 0, y });
    }

    assert.deepEqual(approxPolyDP(contour, 1, true), [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
    ]);
});
