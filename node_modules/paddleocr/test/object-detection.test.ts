import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "../src/core/image.ts";
import {
    type DetectionRuntimeOptions,
    type DetectionService,
    getObjectDetectionPreset,
    getObjectDetectionPresetOptions,
    type ImageClassificationService,
    ObjectDetectionService,
    type OrtInferenceSession,
    type OrtModule,
    type PreprocessDetectionResult,
    type RecognitionOptions,
    type RecognitionOrderingOptions,
    type RecognitionResult,
    type RecognitionRuntimeOptions,
    type RecognitionService,
} from "../src/index.ts";
import { postprocessObjectDetection } from "../src/modules/object-detection/postprocess.ts";
import {
    calculateObjectDetectionResizeParams,
    createObjectDetectionInputFeeds,
    preprocessObjectDetection,
} from "../src/modules/object-detection/preprocess.ts";

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

test("object detection presets expose official object detector contracts", () => {
    const layout = getObjectDetectionPreset("PP-DocLayout_plus-L");
    const docLayoutL = getObjectDetectionPreset("PP-DocLayout-L");
    const docLayoutM = getObjectDetectionPreset("PP-DocLayout-M");
    const docLayoutS = getObjectDetectionPreset("PP-DocLayout-S");
    const docBlockLayout = getObjectDetectionPreset("PP-DocBlockLayout");
    const docBlockLayoutOptions = getObjectDetectionPresetOptions("PP-DocBlockLayout");
    const wiredTableCells = getObjectDetectionPreset("RT-DETR-L_wired_table_cell_det");
    const wirelessTableCells = getObjectDetectionPreset("RT-DETR-L_wireless_table_cell_det");
    const layoutOptions = getObjectDetectionPresetOptions("PP-DocLayout_plus-L");

    assert.equal(layout.module, "layout_detection");
    assert.equal(layout.architecture, "DETR");
    assert.deepEqual(layout.requiredInputNames, ["image", "im_shape", "scale_factor"]);
    assert.equal(layout.options.imageHeight, 800);
    assert.equal(layout.options.imageWidth, 800);
    assert.equal(layout.options.channelOrder, "bgr");
    assert.deepEqual(layout.options.stdDeviation, [1 / 255, 1 / 255, 1 / 255]);
    assert.equal(layout.options.threshold, 0.5);
    assert.equal(layout.options.outputLayout, "class-score-xyxy");
    assert.equal(layout.options.labels?.length, 20);
    assert.deepEqual(layout.options.labels?.slice(0, 5), [
        "paragraph_title",
        "image",
        "text",
        "number",
        "abstract",
    ]);
    assert.deepEqual(layout.options.labels?.slice(-3), [
        "formula_number",
        "aside_text",
        "reference_content",
    ]);
    assert.equal(docLayoutL.module, "layout_detection");
    assert.equal(docLayoutL.architecture, "DETR");
    assert.deepEqual(docLayoutL.requiredInputNames, ["image", "im_shape", "scale_factor"]);
    assert.deepEqual(docLayoutL.options.requiredInputNames, ["image", "im_shape", "scale_factor"]);
    assert.equal(docLayoutL.options.imageHeight, 640);
    assert.equal(docLayoutL.options.imageWidth, 640);
    assert.equal(docLayoutL.options.labels?.length, 23);
    assert.deepEqual(docLayoutL.options.labels?.slice(-3), [
        "header_image",
        "footer_image",
        "aside_text",
    ]);
    assert.equal(docLayoutM.architecture, "GFL");
    assert.deepEqual(docLayoutM.requiredInputNames, ["image", "scale_factor"]);
    assert.deepEqual(docLayoutM.options.requiredInputNames, ["image", "scale_factor"]);
    assert.equal(docLayoutM.options.imageHeight, 640);
    assert.equal(docLayoutM.options.imageWidth, 640);
    assert.deepEqual(docLayoutM.options.mean, [0.485 * 255, 0.456 * 255, 0.406 * 255]);
    assert.deepEqual(docLayoutM.options.stdDeviation, [
        1 / 0.229 / 255,
        1 / 0.224 / 255,
        1 / 0.225 / 255,
    ]);
    assert.equal(docLayoutS.architecture, "GFL");
    assert.equal(docLayoutS.options.imageHeight, 480);
    assert.equal(docLayoutS.options.imageWidth, 480);
    assert.equal(docLayoutS.options.labels?.length, 23);
    assert.equal(docBlockLayout.module, "layout_detection");
    assert.equal(docBlockLayout.architecture, "DETR");
    assert.equal(docBlockLayout.options.imageHeight, 640);
    assert.equal(docBlockLayout.options.imageWidth, 640);
    assert.deepEqual(docBlockLayout.options.stdDeviation, [1 / 255, 1 / 255, 1 / 255]);
    assert.equal(docBlockLayout.options.threshold, 0.5);
    assert.equal(docBlockLayout.options.outputLayout, "class-score-xyxy");
    assert.deepEqual(docBlockLayout.options.labels, ["Region"]);
    assert.notEqual(docBlockLayoutOptions.labels, docBlockLayout.options.labels);

    assert.equal(wiredTableCells.module, "table_cells_detection");
    assert.equal(wiredTableCells.options.imageHeight, 640);
    assert.equal(wiredTableCells.options.imageWidth, 640);
    assert.deepEqual(wiredTableCells.options.stdDeviation, [1 / 255, 1 / 255, 1 / 255]);
    assert.equal(wiredTableCells.options.threshold, 0.5);
    assert.equal(wiredTableCells.options.outputLayout, "class-score-xyxy");
    assert.deepEqual(wiredTableCells.options.labels, ["cell"]);
    assert.deepEqual(wirelessTableCells.options.labels, ["cell"]);
    assert.notEqual(layoutOptions.labels, layout.options.labels);
    assert.notEqual(layoutOptions.requiredInputNames, layout.options.requiredInputNames);
});

test("preprocessObjectDetection creates official DETR input tensor specs", () => {
    const image = new Image(2, 2, 3, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));

    const result = preprocessObjectDetection(image, {
        imageHeight: 2,
        imageWidth: 2,
        mean: [0, 0, 0],
        stdDeviation: [1, 1, 1],
        channelOrder: "bgr",
    });

    assert.deepEqual(result.image.dims, [1, 3, 2, 2]);
    assert.deepEqual(Array.from(result.image.data), [3, 6, 9, 12, 2, 5, 8, 11, 1, 4, 7, 10]);
    assert.deepEqual(result.imShape.dims, [1, 2]);
    assert.deepEqual(Array.from(result.imShape.data), [2, 2]);
    assert.deepEqual(result.scaleFactor.dims, [1, 2]);
    assert.deepEqual(Array.from(result.scaleFactor.data), [1, 1]);
});

test("calculateObjectDetectionResizeParams follows fixed-size DETR resize", () => {
    const image = new Image(2, 1, 3, new Uint8Array(2 * 1 * 3));

    const resizeParams = calculateObjectDetectionResizeParams(image, {
        imageHeight: 4,
        imageWidth: 6,
    });

    assert.deepEqual(resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        dstWidth: 6,
        dstHeight: 4,
        scaleWidth: 3,
        scaleHeight: 4,
    });
    assert.throws(
        () =>
            calculateObjectDetectionResizeParams(image, {
                imageHeight: 0,
                imageWidth: 6,
            }),
        /Invalid object detection imageHeight/
    );
});

test("createObjectDetectionInputFeeds wires official DETR ONNX inputs", () => {
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

    const feeds = createObjectDetectionInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image", "im_shape", "scale_factor"],
            outputNames: [],
            run: async () => ({}),
        },
        {
            image: { data: new Float32Array([1, 2, 3, 4]), dims: [1, 1, 2, 2] },
            imShape: { data: new Float32Array([2, 2]), dims: [1, 2] },
            scaleFactor: { data: new Float32Array([1, 1]), dims: [1, 2] },
            resizeParams: {
                srcWidth: 2,
                srcHeight: 2,
                dstWidth: 2,
                dstHeight: 2,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        }
    );

    assert.deepEqual(Object.keys(feeds), ["image", "im_shape", "scale_factor"]);
    assert.deepEqual(feeds.image.dims, [1, 1, 2, 2]);
    assert.deepEqual(Array.from(feeds.im_shape.data as Float32Array), [2, 2]);
    assert.deepEqual(Array.from(feeds.scale_factor.data as Float32Array), [1, 1]);
    const gflFeeds = createObjectDetectionInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image", "scale_factor"],
            outputNames: [],
            run: async () => ({}),
        },
        {
            image: { data: new Float32Array([1, 2, 3, 4]), dims: [1, 1, 2, 2] },
            imShape: { data: new Float32Array([2, 2]), dims: [1, 2] },
            scaleFactor: { data: new Float32Array([1, 1]), dims: [1, 2] },
            resizeParams: {
                srcWidth: 2,
                srcHeight: 2,
                dstWidth: 2,
                dstHeight: 2,
                scaleWidth: 1,
                scaleHeight: 1,
            },
        },
        ["image", "scale_factor"]
    );

    assert.deepEqual(Object.keys(gflFeeds), ["image", "scale_factor"]);
    assert.deepEqual(Array.from(gflFeeds.scale_factor?.data as Float32Array), [1, 1]);
    assert.throws(
        () =>
            createObjectDetectionInputFeeds(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["image"],
                    outputNames: [],
                    run: async () => ({}),
                },
                {
                    image: { data: new Float32Array(), dims: [1, 3, 2, 2] },
                    imShape: { data: new Float32Array(), dims: [1, 2] },
                    scaleFactor: { data: new Float32Array(), dims: [1, 2] },
                    resizeParams: {
                        srcWidth: 2,
                        srcHeight: 2,
                        dstWidth: 2,
                        dstHeight: 2,
                        scaleWidth: 1,
                        scaleHeight: 1,
                    },
                },
                ["image", "im_shape", "scale_factor"]
            ),
        /Object detection input tensor 'im_shape' not found/
    );
    assert.throws(
        () =>
            createObjectDetectionInputFeeds(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["x"],
                    outputNames: [],
                    run: async () => ({}),
                },
                {
                    image: { data: new Float32Array(), dims: [1, 3, 2, 2] },
                    imShape: { data: new Float32Array(), dims: [1, 2] },
                    scaleFactor: { data: new Float32Array(), dims: [1, 2] },
                    resizeParams: {
                        srcWidth: 2,
                        srcHeight: 2,
                        dstWidth: 2,
                        dstHeight: 2,
                        scaleWidth: 1,
                        scaleHeight: 1,
                    },
                }
            ),
        /does not expose supported input tensors/
    );
});

test("postprocessObjectDetection decodes PaddleX-style class-score boxes", () => {
    const boxes = postprocessObjectDetection(
        {
            bbox: {
                data: new Float32Array([2, 0.9, 10, 20, 30, 40, 1, 0.95, 5, 6, 7, 8]),
                dims: [2, 6],
            },
            bbox_num: {
                data: new Int32Array([1]),
                dims: [1],
            },
        },
        {
            labels: ["title", "image", "text"],
            threshold: { 1: 0.5, 2: 0.5 },
        }
    );

    assert.deepEqual(boxes, [
        {
            classId: 2,
            label: "text",
            score: 0.8999999761581421,
            coordinate: [10, 20, 30, 40],
        },
    ]);
});

test("postprocessObjectDetection accepts PaddleX per-class threshold arrays", () => {
    const boxes = postprocessObjectDetection(
        {
            bbox: {
                data: new Float32Array([0, 0.6, 0, 0, 10, 10, 1, 0.6, 1, 1, 11, 11]),
                dims: [2, 6],
            },
        },
        {
            labels: ["text", "table"],
            threshold: [0.5, 0.7],
        }
    );

    assert.deepEqual(boxes, [
        {
            classId: 0,
            label: "text",
            score: 0.6000000238418579,
            coordinate: [0, 0, 10, 10],
        },
    ]);
});

test("postprocessObjectDetection infers unnamed PaddleX bbox count tensors", () => {
    const boxes = postprocessObjectDetection(
        {
            fetch_name_0: {
                data: new Float32Array([0, 0.9, 10, 20, 30, 40, 0, 0.1, 1, 2, 3, 4]),
                dims: [2, 6],
            },
            fetch_name_1: {
                data: new Int32Array([1]),
                dims: [1],
            },
        },
        {
            labels: ["cell"],
            threshold: 0.5,
        }
    );

    assert.deepEqual(boxes, [
        {
            classId: 0,
            label: "cell",
            score: 0.8999999761581421,
            coordinate: [10, 20, 30, 40],
        },
    ]);
});

test("postprocessObjectDetection rejects invalid bbox_num tensors", () => {
    assert.throws(
        () =>
            postprocessObjectDetection({
                bbox: {
                    data: new Float32Array([2, 0.9, 10, 20, 30, 40]),
                    dims: [1, 6],
                },
                bbox_num: {
                    data: new Int32Array([2]),
                    dims: [1],
                },
            }),
        /Invalid object detection bbox_num: 2/
    );
    assert.throws(
        () =>
            postprocessObjectDetection({
                bbox: {
                    data: new Float32Array([2, 0.9, 10, 20, 30, 40]),
                    dims: [1, 6],
                },
                bbox_num: {
                    data: new Float32Array([1]),
                    dims: [1],
                },
            }),
        /bbox_num tensor must contain integer data/
    );
    assert.throws(
        () =>
            postprocessObjectDetection({
                bbox: {
                    data: new Float32Array([2, 0.9, 10, 20, 30, 40]),
                    dims: [1, 6],
                },
                boxes_num: {
                    data: new Int32Array([1, 0]),
                    dims: [1],
                },
            }),
        /bbox_num shape \[1\] must contain exactly one value/
    );
});

test("postprocessObjectDetection supports explicit score-class box layout", () => {
    const boxes = postprocessObjectDetection(
        {
            output: {
                data: new Float32Array([0.8, 1, 1, 2, 3, 4]),
                dims: [1, 1, 6],
            },
        },
        {
            labels: ["bg", "cell"],
            outputLayout: "score-class-xyxy",
        }
    );

    assert.deepEqual(boxes, [
        {
            classId: 1,
            label: "cell",
            score: 0.800000011920929,
            coordinate: [1, 2, 3, 4],
        },
    ]);
});

test("postprocessObjectDetection applies layout NMS per class", () => {
    const boxes = postprocessObjectDetection(
        {
            bbox: {
                data: new Float32Array([
                    0, 0.9, 0, 0, 10, 10, 0, 0.8, 1, 1, 11, 11, 1, 0.7, 1, 1, 11, 11,
                ]),
                dims: [3, 6],
            },
        },
        {
            labels: ["text", "table"],
            threshold: 0.5,
            layoutNms: true,
        }
    );

    assert.deepEqual(
        boxes.map((box) => ({
            classId: box.classId,
            label: box.label,
            score: Number(box.score.toFixed(1)),
            coordinate: box.coordinate,
        })),
        [
            { classId: 0, label: "text", score: 0.9, coordinate: [0, 0, 10, 10] },
            { classId: 1, label: "table", score: 0.7, coordinate: [1, 1, 11, 11] },
        ]
    );
});

test("postprocessObjectDetection applies layout unclip ratios and merge modes", () => {
    const boxes = postprocessObjectDetection(
        {
            bbox: {
                data: new Float32Array([
                    0, 0.6, 0, 0, 100, 100, 0, 0.9, 10, 10, 20, 20, 1, 0.8, 10, 10, 30, 20,
                ]),
                dims: [3, 6],
            },
        },
        {
            labels: ["outer", "scaled"],
            threshold: 0.5,
            layoutUnclipRatio: { 1: [2, 3] },
            layoutMergeBboxesMode: { 0: "large", 1: "union" },
        }
    );

    assert.deepEqual(
        boxes.map((box) => ({
            classId: box.classId,
            label: box.label,
            score: Number(box.score.toFixed(1)),
            coordinate: box.coordinate,
        })),
        [
            { classId: 0, label: "outer", score: 0.6, coordinate: [0, 0, 100, 100] },
            { classId: 1, label: "scaled", score: 0.8, coordinate: [0, 0, 40, 30] },
        ]
    );
});

test("postprocessObjectDetection fails fast for unsupported object output tensors", () => {
    assert.throws(
        () =>
            postprocessObjectDetection({
                scores: {
                    data: new Float32Array([0.1, 0.2]),
                    dims: [1, 2],
                },
            }),
        /Object detection output tensor with shape \[N,6\] or \[1,N,6\] not found/
    );
    assert.throws(
        () =>
            postprocessObjectDetection({
                bbox: {
                    data: new Float32Array([0.9, 0.8, 1, 2, 3, 4]),
                    dims: [1, 6],
                },
            }),
        /Unable to infer object detection output layout/
    );
    assert.throws(
        () =>
            postprocessObjectDetection({
                bbox: {
                    data: new Float32Array([0, 0.9, 1, 2, 3, 4]),
                    dims: [-1, 6],
                },
            }),
        /must contain positive integer dimensions/
    );
    assert.throws(
        () =>
            postprocessObjectDetection({
                bbox: {
                    data: new Float32Array([0, 0.9, 1, 2, 3, 4, 0, 0.8, 2, 3, 4, 5]),
                    dims: [1, 6],
                },
            }),
        /expects 6 values but got 12/
    );
});

test("ObjectDetectionService runs raw DETR sessions with official inputs", async () => {
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
    const output = { data: new Float32Array([0.1, 0.9]), dims: [1, 2] };
    const service = new ObjectDetectionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image", "im_shape", "scale_factor"],
            outputNames: ["boxes"],
            run: async (feeds) => {
                seenFeeds = feeds;
                return { boxes: output };
            },
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 2,
            imageWidth: 2,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "bgr",
        }
    );

    const result = await service.runRaw({
        width: 2,
        height: 1,
        data: new Uint8Array([1, 2, 3, 4, 5, 6]),
    });

    assert.deepEqual(Object.keys(seenFeeds ?? {}), ["image", "im_shape", "scale_factor"]);
    assert.deepEqual(seenFeeds?.image.dims, [1, 3, 2, 2]);
    assert.deepEqual(Array.from(seenFeeds?.im_shape.data as Float32Array), [2, 2]);
    assert.deepEqual(Array.from(seenFeeds?.scale_factor.data as Float32Array), [2, 1]);
    assert.deepEqual(result.outputs, { boxes: output });
    assert.deepEqual(result.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        dstWidth: 2,
        dstHeight: 2,
        scaleWidth: 1,
        scaleHeight: 2,
    });
});

test("ObjectDetectionService can return decoded object boxes", async () => {
    class Tensor {}
    const service = new ObjectDetectionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image", "im_shape", "scale_factor"],
            outputNames: ["bbox"],
            run: async () => ({
                bbox: {
                    data: new Float32Array([0, 0.7, 1, 2, 3, 4]),
                    dims: [1, 6],
                },
            }),
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 2,
            imageWidth: 2,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "rgb",
            labels: ["paragraph_title"],
            threshold: 0.5,
        }
    );

    const boxes = await service.run({
        width: 1,
        height: 1,
        data: new Uint8Array([255, 255, 255]),
    });

    assert.deepEqual(boxes, [
        {
            classId: 0,
            label: "paragraph_title",
            score: 0.699999988079071,
            coordinate: [1, 2, 3, 4],
        },
    ]);
});

test("ObjectDetectionService fails fast for incomplete raw DETR options or empty outputs", async () => {
    class Tensor {}
    const service = new ObjectDetectionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["image", "im_shape", "scale_factor"],
            outputNames: [],
            run: async () => ({}),
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 2,
            imageWidth: 2,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "rgb",
        }
    );

    await assert.rejects(
        () =>
            new ObjectDetectionService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["image", "im_shape", "scale_factor"],
                    outputNames: [],
                    run: async () => ({}),
                } as unknown as OrtInferenceSession,
                {}
            ).runRaw({ width: 1, height: 1, data: new Uint8Array([255, 255, 255]) }),
        /Invalid object detection imageHeight/
    );
    await assert.rejects(
        () => service.runRaw({ width: 1, height: 1, data: new Uint8Array([255, 255, 255]) }),
        /Object detection session returned no output tensors/
    );
});
