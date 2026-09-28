import assert from "node:assert/strict";
import test from "node:test";
import { offsetClosedPolygonRound } from "../src/core/geometry/clipper-offset.ts";
import { findContours } from "../src/core/geometry/contours.ts";
import { Image } from "../src/core/image.ts";
import { createInputFeeds, getFixedInputDimension, getFixedInputShape } from "../src/core/onnx.ts";
import type {
    DetectionRuntimeOptions,
    DetectionService,
    ImageClassificationService,
    PreprocessDetectionResult,
    RecognitionOptions,
    RecognitionOrderingOptions,
    RecognitionResult,
    RecognitionRuntimeOptions,
    RecognitionService,
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

test("createInputFeeds uses ONNX input metadata when available", () => {
    const tensor = { data: new Float32Array([1]), dims: [1] };

    assert.deepEqual(
        createInputFeeds(
            {
                inputNames: ["image"],
                outputNames: [],
                run: async () => ({}),
            },
            tensor
        ),
        { image: tensor }
    );
    assert.deepEqual(
        createInputFeeds(
            {
                outputNames: [],
                run: async () => ({}),
            },
            tensor
        ),
        { x: tensor }
    );
});

test("getFixedInputDimension reads only positive numeric ONNX shape dimensions", () => {
    const session = {
        inputMetadata: [
            {
                shape: ["batch", 3, 48, 320],
            },
        ],
        outputNames: [],
        run: async () => ({}),
    };

    assert.equal(getFixedInputDimension(session, 0), undefined);
    assert.equal(getFixedInputDimension(session, 2), 48);
    assert.equal(getFixedInputDimension(session, 3), 320);
    assert.deepEqual(getFixedInputShape(session), {
        channels: 3,
        height: 48,
        width: 320,
    });
    assert.equal(
        getFixedInputDimension(
            {
                inputMetadata: [
                    {
                        shape: [1, 3, 48, "DynamicDimension.1"],
                    },
                ],
                outputNames: [],
                run: async () => ({}),
            },
            3
        ),
        undefined
    );
});

test("offsetClosedPolygonRound mirrors Clipper2 round offset for closed rectangles", () => {
    const result = offsetClosedPolygonRound(
        [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ],
        2
    );

    assert.deepEqual(result, [
        { x: -2, y: 0 },
        { x: -1, y: -2 },
        { x: 10, y: -2 },
        { x: 12, y: -1 },
        { x: 12, y: 10 },
        { x: 11, y: 12 },
        { x: 0, y: 12 },
        { x: -2, y: 11 },
    ]);
});

test("offsetClosedPolygonRound mirrors Clipper2 concave join cleanup", () => {
    const result = offsetClosedPolygonRound(
        [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 10 },
            { x: 0, y: 10 },
        ],
        2
    );

    assert.deepEqual(result, [
        { x: -2, y: 0 },
        { x: -1, y: -2 },
        { x: 10, y: -2 },
        { x: 12, y: -1 },
        { x: 12, y: 4 },
        { x: 11, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 10 },
        { x: 5, y: 12 },
        { x: 0, y: 12 },
        { x: -2, y: 11 },
    ]);
});

test("offsetClosedPolygonRound treats sub-pixel deltas as Clipper2 insignificant offsets", () => {
    const path = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
    ];

    assert.deepEqual(offsetClosedPolygonRound(path, 0.49), path);
});

test("findContours extracts ordered raw boundary contours from binary masks", () => {
    const width = 8;
    const height = 8;
    const bitmap = new Uint8Array(width * height);
    for (let y = 2; y <= 5; y++) {
        for (let x = 2; x <= 5; x++) {
            bitmap[y * width + x] = 255;
        }
    }

    const contours = findContours(bitmap, width, height, {
        minimumAreaThreshold: 1,
    });

    assert.equal(contours.length, 1);
    assert.equal(contours[0]?.area, 16);
    assert.equal(contours[0]?.points.length, 16);
});

test("findContours keeps inner boundary loops like OpenCV RETR_LIST", () => {
    const width = 9;
    const height = 9;
    const bitmap = new Uint8Array(width * height);
    for (let y = 1; y <= 7; y++) {
        for (let x = 1; x <= 7; x++) {
            if (x === 1 || x === 7 || y === 1 || y === 7) {
                bitmap[y * width + x] = 255;
            }
        }
    }

    const contours = findContours(bitmap, width, height, {
        minimumAreaThreshold: 1,
    });

    assert.equal(contours.length, 2);
    assert.deepEqual(
        contours.map((contour) => contour.area),
        [49, 25]
    );
});

test("findContours keeps discovery order instead of sorting by area", () => {
    const width = 10;
    const height = 10;
    const bitmap = new Uint8Array(width * height);
    for (let y = 1; y <= 2; y++) {
        for (let x = 1; x <= 2; x++) {
            bitmap[y * width + x] = 255;
        }
    }
    for (let y = 5; y <= 8; y++) {
        for (let x = 5; x <= 8; x++) {
            bitmap[y * width + x] = 255;
        }
    }

    const contours = findContours(bitmap, width, height, {
        minimumAreaThreshold: 1,
    });

    assert.equal(contours.length, 2);
    assert.equal(contours[0]?.area, 4);
    assert.equal(contours[1]?.area, 16);
});

test("Image.padding preserves channel layout", () => {
    const image = new Image(1, 1, 3, new Uint8Array([1, 2, 3]));
    const padded = image.padding({
        padding: 1,
        color: [9, 8, 7],
    });
    const centerIndex = (1 * padded.width + 1) * padded.channels;

    assert.equal(padded.width, 3);
    assert.equal(padded.height, 3);
    assert.equal(padded.channels, 3);
    assert.equal(padded.data.length, 27);
    assert.deepEqual(Array.from(padded.data.slice(0, 3)), [9, 8, 7]);
    assert.deepEqual(Array.from(padded.data.slice(centerIndex, centerIndex + 3)), [1, 2, 3]);
});

test("Image.tensor can emit RGB or BGR channel order", () => {
    const image = new Image(2, 1, 3, new Uint8Array([1, 2, 3, 4, 5, 6]));
    const options = {
        mean_values: [0, 0, 0] as [number, number, number],
        norm_values: [1, 1, 1] as [number, number, number],
    };

    assert.deepEqual(
        Array.from(image.tensor({ ...options, channel_order: "rgb" })),
        [1, 4, 2, 5, 3, 6]
    );
    assert.deepEqual(
        Array.from(image.tensor({ ...options, channel_order: "bgr" })),
        [3, 6, 2, 5, 1, 4]
    );
});

test("Image.resize defaults to OpenCV-style bilinear interpolation", () => {
    const image = new Image(4, 1, 1, new Uint8Array([0, 100, 200, 255]));
    const resized = image.resize({ width: 2, height: 1 });

    assert.deepEqual(Array.from(resized.data), [50, 228]);
});

test("Image.dilate uses OpenCV-style square kernel semantics", () => {
    const image = new Image(
        4,
        4,
        1,
        new Uint8Array([0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    );

    const dilated = image.dilate({ k: 2 });

    assert.deepEqual(
        Array.from(dilated.data),
        [0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0]
    );
});

test("Image.dilate keeps a 1x1 kernel as an identity operation", () => {
    const data = new Uint8Array([0, 255, 0, 0]);
    const image = new Image(2, 2, 1, data);

    const dilated = image.dilate({ k: 1 });

    assert.deepEqual(Array.from(dilated.data), Array.from(data));
});

test("Image.cropRotated crops quadrilateral regions with perspective mapping", () => {
    const width = 6;
    const height = 6;
    const data = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 3;
            data[index] = x * 20 + y;
            data[index + 1] = x * 20 + y;
            data[index + 2] = x * 20 + y;
        }
    }
    const image = new Image(width, height, 3, data);

    const crop = image.cropRotated([
        { x: 1, y: 1 },
        { x: 5, y: 1 },
        { x: 5, y: 4 },
        { x: 1, y: 4 },
    ]);

    assert.equal(crop.width, 4);
    assert.equal(crop.height, 3);
    assert.deepEqual(Array.from(crop.data.slice(0, 3)), [21, 21, 21]);

    const fractionalCrop = image.cropRotated([
        { x: 0.2, y: 0.2 },
        { x: 4.8, y: 0.2 },
        { x: 4.8, y: 3.8 },
        { x: 0.2, y: 3.8 },
    ]);

    assert.equal(fractionalCrop.width, 4);
    assert.equal(fractionalCrop.height, 3);
});
