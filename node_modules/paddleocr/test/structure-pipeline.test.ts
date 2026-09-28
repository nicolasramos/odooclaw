import assert from "node:assert/strict";
import test from "node:test";
import { Image } from "../src/core/image.ts";
import {
    type DetectionRuntimeOptions,
    type DetectionService,
    type ImageClassificationService,
    type OrtModule,
    PaddleStructureService,
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

test("PaddleStructureService follows official structure pipeline order and region dispatch", async () => {
    const calls: string[] = [];
    const image = new Image(8, 6, 3, new Uint8Array(8 * 6 * 3));
    const service = new PaddleStructureService({
        documentOrientation: {
            run: async () => {
                calls.push("orientation");
                return [{ classId: 1, label: "180", score: 0.99 }];
            },
        },
        textImageUnwarping: {
            run: async (input) => {
                calls.push(`unwarp:${input.width}x${input.height}`);
                return { doctrImage: input };
            },
        },
        regionDetection: {
            run: async (input) => {
                calls.push(`region:${input.width}x${input.height}`);
                return [{ classId: 0, label: "Region", score: 0.95, coordinate: [0, 0, 8, 6] }];
            },
        },
        layout: {
            run: async (input) => {
                calls.push(`layout:${input.width}x${input.height}`);
                return [
                    { classId: 1, label: "table", score: 0.9, coordinate: [0, 0, 4, 3] },
                    { classId: 2, label: "equation", score: 0.8, coordinate: [4, 0, 8, 3] },
                    { classId: 3, label: "text", score: 0.7, coordinate: [4, 3, 8, 6] },
                ];
            },
        },
        ocr: {
            recognize: async (input) => {
                calls.push(`ocr:${input.width}x${input.height}`);
                return [
                    {
                        text: "<b>Hello</b>",
                        confidence: 0.92,
                        box: { x: 5, y: 4, width: 2, height: 1 },
                    },
                ];
            },
        },
        tableOcr: {
            recognize: async (input) => {
                calls.push(`tableOcr:${input.width}x${input.height}`);
                return [
                    {
                        text: "cell",
                        confidence: 0.88,
                        box: { x: 0, y: 0, width: 2, height: 1 },
                    },
                ];
            },
        },
        tableStructure: {
            run: async (input) => {
                calls.push(`table:${input.width}x${input.height}`);
                return {
                    bbox: [[0, 0, 4, 3]],
                    structure: ["<tr>", "<td></td>", "</tr>"],
                    html: "<tr><td></td></tr>",
                    fullHtml: "<html><body><table><tr><td></td></tr></table></body></html>",
                    structureScore: 0.8,
                };
            },
        },
        formulaRecognition: {
            run: async (input) => {
                calls.push(`formula:${input.width}x${input.height}`);
                return { formula: "x+y", tokenIds: [1], tokens: ["x+y"] };
            },
        },
    });

    const result = await service.run(image);

    assert.deepEqual(calls, [
        "orientation",
        "unwarp:8x6",
        "region:8x6",
        "layout:8x6",
        "ocr:8x6",
        "table:4x3",
        "tableOcr:4x3",
        "formula:4x3",
    ]);
    assert.equal(result.stages.documentOrientation.result?.angle, 180);
    assert.equal(result.stages.regionDetection.status, "applied");
    assert.equal(result.stages.readingOrder.status, "applied");
    assert.equal(result.stages.markdown.status, "applied");
    assert.equal(result.regionDetections[0]?.type, "region");
    assert.equal(result.regions.length, 3);
    assert.equal(result.regions[0]?.type, "table");
    assert.equal(result.regions[0]?.layout, "double");
    assert.equal(result.regions[0]?.blockOrder, 0);
    assert.equal(result.regions[0]?.table?.matched?.cellTexts[0], "cell");
    assert.equal(result.regions[1]?.type, "formula");
    assert.equal(result.regions[1]?.formula?.formula, "x+y");
    assert.equal(result.regions[2]?.type, "text");
    assert.equal(result.regions[2]?.ocr?.[0]?.text, "Hello");
    assert.equal(result.regions[2]?.ocr?.[0]?.box.x, 1);
    assert.equal(
        result.markdown?.text,
        "<html><body><table><tr><td>cell</td></tr></table></body></html>\n\n$$x+y$$\n\nHello"
    );
});

test("PaddleStructureService exposes official full-page table fallback without layout", async () => {
    const calls: string[] = [];
    const image = new Image(5, 4, 3, new Uint8Array(5 * 4 * 3));
    const service = new PaddleStructureService({
        tableStructure: {
            run: async (input) => {
                calls.push(`table:${input.width}x${input.height}`);
                return {
                    bbox: [],
                    structure: ["<tr>", "<td></td>", "</tr>"],
                    html: "<tr><td></td></tr>",
                    fullHtml: "<html><body><table><tr><td></td></tr></table></body></html>",
                    structureScore: 1,
                };
            },
        },
    });

    const result = await service.run(image, {
        documentOrientation: { enabled: false },
        textImageUnwarping: { enabled: false },
        ocr: { enabled: false },
    });

    assert.equal(result.stages.layout.status, "skipped");
    assert.deepEqual(result.stages.layout.result?.[0]?.bbox, [0, 0, 5, 4]);
    assert.equal(result.regions[0]?.type, "table");
    assert.equal(result.regions[0]?.status, "applied");
    assert.deepEqual(calls, ["table:5x4"]);
});

test("PaddleStructureService.createInstance builds configured module services from model buffers", async () => {
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
    const documentOrientation = new ArrayBuffer(1);
    const layout = new ArrayBuffer(2);
    const tableStructure = new ArrayBuffer(3);
    const formula = new ArrayBuffer(4);
    const det = new ArrayBuffer(5);
    const rec = new ArrayBuffer(6);

    const service = await PaddleStructureService.createInstance({
        ort,
        documentOrientation: { modelBuffer: documentOrientation },
        layout: {
            modelBuffer: layout,
            preset: "PP-DocLayout_plus-L",
        },
        tableStructure: {
            modelBuffer: tableStructure,
            preset: "SLANet",
        },
        formulaRecognition: {
            modelBuffer: formula,
            preset: "PP-FormulaNet_plus-M",
            tokenizerVocabulary: ["<s>", "</s>"],
        },
        ocr: {
            modelPreset: "PP-OCRv6_small",
            detection: { modelBuffer: det },
            recognition: {
                modelBuffer: rec,
                charactersDictionary: ["a"],
            },
        },
    });

    assert.ok(service instanceof PaddleStructureService);
    assert.deepEqual(created, [documentOrientation, layout, det, rec, tableStructure, formula]);
    assert.rejects(
        () => PaddleStructureService.createInstance({ ort }),
        /requires at least one modelBuffer/
    );
});
