import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "../src/core/image.ts";
import {
    calculateTableStructureResizeParams,
    createTableStructureHtmlDocument,
    type DetectionRuntimeOptions,
    type DetectionService,
    getTableStructureRecognitionPreset,
    getTableStructureRecognitionPresetOptions,
    type ImageClassificationService,
    matchTableStructureToOcr,
    type OrtInferenceSession,
    type OrtModule,
    type PreprocessDetectionResult,
    postprocessTableStructure,
    preprocessTableStructure,
    type RecognitionOptions,
    type RecognitionOrderingOptions,
    type RecognitionResult,
    type RecognitionRuntimeOptions,
    type RecognitionService,
    recoverTableHtmlFromCells,
    TableRecognitionV2Service,
    TableStructureRecognitionService,
} from "../src/index.ts";
import { createTableStructureInputFeeds } from "../src/modules/table-structure/preprocess.ts";

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

test("table structure recognition preset exposes official SLANet contract", () => {
    const preset = getTableStructureRecognitionPreset("SLANet");
    const wired = getTableStructureRecognitionPreset("SLANeXt_wired");
    const wireless = getTableStructureRecognitionPreset("SLANeXt_wireless");
    const options = getTableStructureRecognitionPresetOptions("SLANet");
    const wiredOptions = getTableStructureRecognitionPresetOptions("SLANeXt_wired");

    assert.equal(preset.module, "table_structure_recognition");
    assert.equal(preset.architecture, "SLANet");
    assert.equal(preset.options.imageHeight, 488);
    assert.equal(preset.options.imageWidth, 488);
    assert.equal(preset.options.maxSideLength, 488);
    assert.deepEqual(preset.options.mean, [0.485 * 255, 0.456 * 255, 0.406 * 255]);
    assert.deepEqual(preset.options.stdDeviation, [
        1 / 0.229 / 255,
        1 / 0.224 / 255,
        1 / 0.225 / 255,
    ]);
    assert.equal(preset.options.channelOrder, "bgr");
    assert.equal(preset.options.maxTextLength, 500);
    assert.equal(preset.options.locRegNum, 8);
    assert.equal(preset.options.mergeNoSpanStructure, true);
    assert.equal(preset.options.replaceEmptyCellToken, false);
    assert.equal(preset.options.learnEmptyBox, false);
    assert.equal(preset.options.structureDictionary?.length, 48);
    assert.deepEqual(preset.options.structureDictionary?.slice(0, 10), [
        "<thead>",
        "</thead>",
        "<tbody>",
        "</tbody>",
        "<tr>",
        "</tr>",
        "<td>",
        "<td",
        ">",
        "</td>",
    ]);
    assert.deepEqual(preset.options.structureDictionary?.slice(-3), [
        ' rowspan="18"',
        ' rowspan="19"',
        ' rowspan="20"',
    ]);
    assert.notEqual(options.structureDictionary, preset.options.structureDictionary);
    assert.equal(wired.module, "table_structure_recognition");
    assert.equal(wired.architecture, "SLANeXt");
    assert.equal(wired.options.imageHeight, 512);
    assert.equal(wired.options.imageWidth, 512);
    assert.equal(wired.options.maxSideLength, 512);
    assert.equal(wired.options.ignoreBboxes, true);
    assert.equal(wireless.architecture, "SLANeXt");
    assert.equal(wireless.options.ignoreBboxes, true);
    assert.deepEqual(wired.options.structureDictionary, preset.options.structureDictionary);
    assert.notEqual(wiredOptions.structureDictionary, wired.options.structureDictionary);
});

test("preprocessTableStructure follows official SLANet resize, normalize, and padding order", () => {
    const image = new Image(2, 1, 3, new Uint8Array([1, 2, 3, 4, 5, 6]));

    const result = preprocessTableStructure(image, {
        imageHeight: 2,
        imageWidth: 2,
        maxSideLength: 2,
        mean: [10, 20, 30],
        stdDeviation: [1, 1, 1],
        channelOrder: "bgr",
    });

    assert.deepEqual(result.image.dims, [1, 3, 2, 2]);
    assert.deepEqual(Array.from(result.image.data), [-7, -4, 0, 0, -18, -15, 0, 0, -29, -26, 0, 0]);
    assert.deepEqual(result.shape.dims, [1, 6]);
    assert.deepEqual(Array.from(result.shape.data), [1, 2, 1, 1, 2, 2]);
    assert.deepEqual(result.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        resizedWidth: 2,
        resizedHeight: 1,
        paddedWidth: 2,
        paddedHeight: 2,
        ratioWidth: 1,
        ratioHeight: 1,
    });
});

test("calculateTableStructureResizeParams mirrors official long-side floor resize", () => {
    const image = new Image(2, 3, 3, new Uint8Array(2 * 3 * 3));

    const resizeParams = calculateTableStructureResizeParams(image, {
        imageHeight: 5,
        imageWidth: 5,
        maxSideLength: 5,
    });

    assert.deepEqual(resizeParams, {
        srcWidth: 2,
        srcHeight: 3,
        resizedWidth: 3,
        resizedHeight: 5,
        paddedWidth: 5,
        paddedHeight: 5,
        ratioWidth: 5 / 3,
        ratioHeight: 5 / 3,
    });
    assert.throws(
        () =>
            calculateTableStructureResizeParams(image, {
                imageHeight: 0,
                imageWidth: 5,
                maxSideLength: 5,
            }),
        /Invalid table structure imageHeight/
    );
});

test("createTableStructureInputFeeds wires SLANet single input tensors", () => {
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
        shape: { data: new Float32Array([1, 2, 1, 1, 2, 2]), dims: [1, 6] },
        resizeParams: {
            srcWidth: 2,
            srcHeight: 1,
            resizedWidth: 2,
            resizedHeight: 1,
            paddedWidth: 2,
            paddedHeight: 2,
            ratioWidth: 1,
            ratioHeight: 1,
        },
    };

    const defaultFeeds = createTableStructureInputFeeds(
        { Tensor } as unknown as OrtModule,
        {
            outputNames: [],
            run: async () => ({}),
        } as unknown as OrtInferenceSession,
        input
    );
    const namedFeeds = createTableStructureInputFeeds(
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

test("TableStructureRecognitionService runs raw SLANet sessions", async () => {
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
    const service = new TableStructureRecognitionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["x"],
            outputNames: ["structure_probs"],
            run: async (feeds) => {
                seenFeeds = feeds;
                return { structure_probs: output };
            },
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 2,
            imageWidth: 2,
            maxSideLength: 2,
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

    assert.deepEqual(Object.keys(seenFeeds ?? {}), ["x"]);
    assert.deepEqual(seenFeeds?.x.dims, [1, 3, 2, 2]);
    assert.deepEqual(
        Array.from(seenFeeds?.x.data as Float32Array),
        [3, 6, 0, 0, 2, 5, 0, 0, 1, 4, 0, 0]
    );
    assert.deepEqual(result.outputs, { structure_probs: output });
    assert.deepEqual(Array.from(result.shape.data), [1, 2, 1, 1, 2, 2]);
    assert.deepEqual(result.resizeParams, {
        srcWidth: 2,
        srcHeight: 1,
        resizedWidth: 2,
        resizedHeight: 1,
        paddedWidth: 2,
        paddedHeight: 2,
        ratioWidth: 1,
        ratioHeight: 1,
    });
});

test("postprocessTableStructure decodes SLANet structure tokens and cell boxes", () => {
    const structureData = new Float32Array(4 * 6);
    structureData[0] = 0.99;
    structureData[6 + 1] = 0.9;
    structureData[12 + 2] = 0.8;
    structureData[18 + 5] = 0.7;
    const locData = new Float32Array(4 * 8);
    locData.set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], 8);

    const result = postprocessTableStructure(
        {
            structure_probs: { data: structureData, dims: [1, 4, 6] },
            loc_preds: { data: locData, dims: [1, 4, 8] },
        },
        {
            data: new Float32Array([10, 20, 2, 2, 4, 4]),
            dims: [1, 6],
        },
        {
            structureDictionary: ["<td>", "<td", ">", "</td>"],
            mergeNoSpanStructure: true,
            locRegNum: 8,
        }
    );

    assert.deepEqual(result.structure, ["<td", ">"]);
    assert.equal(result.html, "<td>");
    assert.equal(result.fullHtml, "<html><body><table><td></table></body></html>");
    assert.deepEqual(
        result.bbox.map((row) => row.map((value) => Number(value.toFixed(2)))),
        [[0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6]]
    );
    assert.equal(Number(result.structureScore.toFixed(2)), 0.85);
});

test("postprocessTableStructure skips invalid SLANeXt cell boxes", () => {
    const structureData = new Float32Array(4 * 6);
    structureData[0] = 0.99;
    structureData[6 + 1] = 0.9;
    structureData[12 + 2] = 0.8;
    structureData[18 + 5] = 0.7;
    const locData = new Float32Array(4 * 8);
    locData.set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], 8);

    const result = postprocessTableStructure(
        {
            structure_probs: { data: structureData, dims: [1, 4, 6] },
            loc_preds: { data: locData, dims: [1, 4, 8] },
        },
        {
            data: new Float32Array([10, 20, 2, 2, 4, 4]),
            dims: [1, 6],
        },
        {
            structureDictionary: ["<td>", "<td", ">", "</td>"],
            mergeNoSpanStructure: true,
            locRegNum: 8,
            ignoreBboxes: true,
        }
    );

    assert.deepEqual(result.structure, ["<td", ">"]);
    assert.equal(result.html, "<td>");
    assert.deepEqual(result.bbox, []);
});

test("matchTableStructureToOcr fills SLANet cells with OCR text", () => {
    const result = matchTableStructureToOcr(
        {
            structure: [
                "<tbody>",
                "<tr>",
                "<td></td>",
                "<td",
                ' colspan="2"',
                ">",
                "</td>",
                "</tr>",
                "</tbody>",
            ],
            bbox: [
                [0, 0, 100, 0, 100, 50, 0, 50],
                [100, 0, 220, 0, 220, 50, 100, 50],
            ],
        },
        [
            { text: "ignored title", box: { x: 0, y: -30, width: 80, height: 10 } },
            { text: " medal", box: { x: 10, y: 8, width: 40, height: 20 } },
            { text: "<gold>", box: { x: 116, y: 8, width: 44, height: 16 } },
            { text: "score", box: { x: 166, y: 8, width: 40, height: 16 } },
        ],
        { filterOcrAboveTable: true }
    );

    assert.deepEqual(result.cellTexts, [" medal", "<gold> score"]);
    assert.deepEqual(result.matches[0].ocrIndices, [1]);
    assert.deepEqual(result.matches[1].ocrIndices, [2, 3]);
    assert.equal(
        result.html,
        '<tbody><tr><td> medal</td><td colspan="2">&lt;gold&gt; score</td></tr></tbody>'
    );
    assert.equal(
        result.fullHtml,
        '<html><body><table><tbody><tr><td> medal</td><td colspan="2">&lt;gold&gt; score</td></tr></tbody></table></body></html>'
    );
});

test("matchTableStructureToOcr preserves official multiline bold cell markup", () => {
    const result = matchTableStructureToOcr(
        {
            structure: ["<tbody>", "<tr>", "<td></td>", "</tr>", "</tbody>"],
            bbox: [[0, 0, 120, 0, 120, 40, 0, 40]],
        },
        [
            { text: "<b>Total", box: { x: 4, y: 4, width: 40, height: 12 } },
            { text: " <sum></b>", box: { x: 48, y: 4, width: 52, height: 12 } },
        ]
    );

    assert.deepEqual(result.cellTexts, ["Total <sum>"]);
    assert.equal(result.matches[0].text, "Total <sum>");
    assert.equal(result.html, "<tbody><tr><td><b>Total &lt;sum&gt;</b></td></tr></tbody>");
});

test("matchTableStructureToOcr handles empty cells and validates box shape", () => {
    const result = matchTableStructureToOcr(
        {
            structure: ["<tr>", "<td></td>", "</tr>"],
            bbox: [[0, 0, 10, 10]],
        },
        []
    );

    assert.deepEqual(result.cellTexts, [""]);
    assert.equal(result.html, "<tr><td></td></tr>");
    assert.equal(result.fullHtml, "<html><body><table><tr><td></td></tr></table></body></html>");

    assert.throws(
        () =>
            matchTableStructureToOcr(
                {
                    structure: ["<td></td>"],
                    bbox: [[0, 0, 1]],
                },
                []
            ),
        /Invalid table cell 0 coordinate length 3/
    );
});

test("recoverTableHtmlFromCells restores spans and fills OCR text", () => {
    const result = recoverTableHtmlFromCells(
        [
            { classId: 0, label: "cell", score: 0.99, coordinate: [0, 0, 100, 20] },
            { classId: 0, label: "cell", score: 0.99, coordinate: [0, 20, 50, 40] },
            { classId: 0, label: "cell", score: 0.99, coordinate: [50, 20, 100, 40] },
            { classId: 0, label: "cell", score: 0.99, coordinate: [0, 40, 50, 80] },
            { classId: 0, label: "cell", score: 0.99, coordinate: [50, 40, 100, 60] },
            { classId: 0, label: "cell", score: 0.99, coordinate: [50, 60, 100, 80] },
        ],
        [
            { text: "Header", box: [10, 5, 90, 15] },
            { text: "B", box: [10, 25, 40, 35] },
            { text: "C", box: [60, 25, 90, 35] },
            { text: "D", box: [10, 50, 40, 70] },
            { text: "E", box: [60, 45, 90, 55] },
            { text: "F", box: [60, 65, 90, 75] },
        ]
    );

    assert.equal(
        result.html,
        '<tbody><tr><td colspan="2">Header</td></tr><tr><td>B</td><td>C</td></tr><tr><td rowspan="2">D</td><td>E</td></tr><tr><td>F</td></tr></tbody>'
    );
    assert.equal(result.cells[0]?.colspan, 2);
    assert.equal(result.cells[3]?.rowspan, 2);
});

test("TableRecognitionV2Service composes wireless SLANeXt with cell detector HTML recovery", async () => {
    const calls: string[] = [];
    const image = new Image(100, 40, 3, new Uint8Array(100 * 40 * 3));
    const service = new TableRecognitionV2Service({
        tableClassification: {
            run: async () => {
                calls.push("classify");
                return [{ classId: 1, label: "wireless", score: 0.98 }];
            },
        },
        wirelessTableStructure: {
            run: async () => {
                calls.push("structure:wireless");
                return {
                    bbox: [],
                    structure: ["<tbody>", "<tr>", "<td></td>", "</tr>", "</tbody>"],
                    html: "<tbody><tr><td></td></tr></tbody>",
                    fullHtml:
                        "<html><body><table><tbody><tr><td></td></tr></tbody></table></body></html>",
                    structureScore: 0.9,
                };
            },
        },
        wirelessTableCellsDetection: {
            run: async () => {
                calls.push("cells:wireless");
                return [
                    { classId: 0, label: "cell", score: 0.99, coordinate: [0, 0, 50, 40] },
                    { classId: 0, label: "cell", score: 0.99, coordinate: [50, 0, 100, 40] },
                ];
            },
        },
        ocr: {
            recognize: async () => {
                calls.push("ocr");
                return [
                    { text: "left", confidence: 0.9, box: { x: 10, y: 10, width: 10, height: 10 } },
                    {
                        text: "right",
                        confidence: 0.8,
                        box: { x: 60, y: 10, width: 10, height: 10 },
                    },
                ];
            },
        },
    });

    const result = await service.run(image, { useWirelessTableCellsTransToHtml: true });

    assert.deepEqual(calls, ["classify", "structure:wireless", "cells:wireless", "ocr"]);
    assert.equal(result.tableType, "wireless");
    assert.equal(result.cellBoxList.length, 2);
    assert.equal(result.tableOcrPred?.text.join(","), "left,right");
    assert.equal(
        result.predHtml,
        "<html><body><table><tbody><tr><td>left</td><td>right</td></tr></tbody></table></body></html>"
    );
});

test("TableRecognitionV2Service.createInstance builds module services from model buffers", async () => {
    const created: ArrayBuffer[] = [];
    const ort: OrtModule = {
        Tensor: class {
            data: Float32Array;
            dims: readonly number[];

            constructor(_type: string, data: Float32Array, dims: readonly number[]) {
                this.data = data;
                this.dims = dims;
            }
        },
        InferenceSession: {
            create: async (modelBuffer) => {
                created.push(modelBuffer);
                return {
                    outputNames: ["out"],
                    run: async () => ({}),
                };
            },
        },
    };
    const wiredStructure = new ArrayBuffer(1);
    const wiredCells = new ArrayBuffer(2);

    const service = await TableRecognitionV2Service.createInstance({
        ort,
        wiredTableStructure: {
            modelBuffer: wiredStructure,
            preset: "SLANeXt_wired",
        },
        wiredTableCellsDetection: {
            modelBuffer: wiredCells,
            preset: "RT-DETR-L_wired_table_cell_det",
        },
        options: {
            tableClassification: { enabled: false },
            ocr: { enabled: false },
        },
    });

    assert.ok(service instanceof TableRecognitionV2Service);
    assert.deepEqual(created, [wiredStructure, wiredCells]);
    assert.rejects(
        () => TableRecognitionV2Service.createInstance({ ort }),
        /requires at least one modelBuffer/
    );
});

test("TableStructureRecognitionService can return decoded SLANet structures", async () => {
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

    const structureData = new Float32Array(4 * 6);
    structureData[0] = 0.99;
    structureData[6 + 1] = 0.9;
    structureData[12 + 2] = 0.8;
    structureData[18 + 5] = 0.7;
    const locData = new Float32Array(4 * 8);
    locData.set([0.5, 0.5, 0.75, 0.75, 0.8, 0.8, 0.9, 0.9], 8);
    const service = new TableStructureRecognitionService(
        { Tensor } as unknown as OrtModule,
        {
            inputNames: ["x"],
            outputNames: ["structure_probs", "loc_preds"],
            run: async () => ({
                structure_probs: { data: structureData, dims: [1, 4, 6] },
                loc_preds: { data: locData, dims: [1, 4, 8] },
            }),
        } as unknown as OrtInferenceSession,
        {
            imageHeight: 2,
            imageWidth: 2,
            maxSideLength: 2,
            mean: [0, 0, 0],
            stdDeviation: [1, 1, 1],
            channelOrder: "bgr",
            structureDictionary: ["<td>", "<td", ">", "</td>"],
            mergeNoSpanStructure: true,
            locRegNum: 8,
        }
    );

    const result = await service.run({
        width: 2,
        height: 1,
        data: new Uint8Array([1, 2, 3, 4, 5, 6]),
    });

    assert.deepEqual(result.structure, ["<td", ">"]);
    assert.equal(result.html, "<td>");
    assert.equal(result.fullHtml, "<html><body><table><td></table></body></html>");
    assert.deepEqual(
        result.bbox.map((row) => row.map((value) => Number(value.toFixed(2)))),
        [[1, 1, 1.5, 1.5, 1.6, 1.6, 1.8, 1.8]]
    );
});

test("createTableStructureHtmlDocument wraps table structure like official predict_structure", () => {
    assert.equal(
        createTableStructureHtmlDocument(["<tbody>", "<tr>", "<td></td>", "</tr>", "</tbody>"]),
        "<html><body><table><tbody><tr><td></td></tr></tbody></table></body></html>"
    );
    assert.equal(
        createTableStructureHtmlDocument("<tr><td>A</td></tr>"),
        "<html><body><table><tr><td>A</td></tr></table></body></html>"
    );
});

test("postprocessTableStructure fails fast for unsupported table output tensors", () => {
    assert.throws(
        () =>
            postprocessTableStructure(
                {
                    structure_probs: { data: new Float32Array([1, 0, 0]), dims: [1, 1, 3] },
                },
                {
                    data: new Float32Array([1, 1, 1, 1, 1, 1]),
                    dims: [1, 6],
                },
                {
                    structureDictionary: ["<td"],
                    locRegNum: 8,
                }
            ),
        /Table structure output tensor 'loc_preds' not found/
    );
    assert.throws(
        () =>
            postprocessTableStructure(
                {
                    structure_probs: { data: new Float32Array([1, 0]), dims: [1, 1, 2] },
                    loc_preds: { data: new Float32Array(8), dims: [1, 1, 8] },
                },
                {
                    data: new Float32Array([1, 1, 1, 1, 1, 1]),
                    dims: [1, 6],
                },
                {
                    locRegNum: 8,
                }
            ),
        /structureDictionary is required/
    );
});

test("TableStructureRecognitionService fails fast for incomplete options or empty outputs", async () => {
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
        data: new Uint8Array([1, 2, 3]),
    };

    await assert.rejects(
        () =>
            new TableStructureRecognitionService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["x"],
                    outputNames: [],
                    run: async () => ({}),
                } as unknown as OrtInferenceSession,
                {
                    imageHeight: 2,
                    imageWidth: 2,
                    maxSideLength: 2,
                    mean: [0, 0, 0],
                    stdDeviation: [1, 1, 1],
                }
            ).runRaw(input),
        /Unsupported table structure recognition channelOrder/
    );
    await assert.rejects(
        () =>
            new TableStructureRecognitionService(
                { Tensor } as unknown as OrtModule,
                {
                    inputNames: ["x"],
                    outputNames: [],
                    run: async () => ({}),
                } as unknown as OrtInferenceSession,
                {
                    imageHeight: 2,
                    imageWidth: 2,
                    maxSideLength: 2,
                    mean: [0, 0, 0],
                    stdDeviation: [1, 1, 1],
                    channelOrder: "bgr",
                }
            ).runRaw(input),
        /Table structure recognition session returned no output tensors/
    );
});
