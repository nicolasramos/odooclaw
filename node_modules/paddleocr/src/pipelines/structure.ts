import type { Image } from "../core/image.ts";
import { normalizeInputToRgb } from "../core/input.ts";
import type {
    Box,
    DetectionRuntimeOptions,
    DetectionServiceOptions,
    FormulaRecognitionPresetName,
    FormulaRecognitionRuntimeOptions,
    FormulaRecognitionServiceOptions,
    ImageClassificationPresetName,
    ImageClassificationRuntimeOptions,
    ImageClassificationServiceOptions,
    ImageInput,
    ObjectDetectionPresetName,
    ObjectDetectionRuntimeOptions,
    ObjectDetectionServiceOptions,
    OrtModule,
    PaddleOptions,
    Point,
    RecognitionOptions,
    RecognitionServiceOptions,
    TableStructureRecognitionPresetName,
    TableStructureRecognitionRuntimeOptions,
    TableStructureRecognitionServiceOptions,
    TextDetectionPresetName,
    TextImageUnwarpingPresetName,
    TextImageUnwarpingRuntimeOptions,
    TextImageUnwarpingServiceOptions,
    TextRecognitionPresetName,
} from "../interface.ts";
import type { FormulaRecognitionResult } from "../modules/formula-recognition/postprocess.ts";
import { getFormulaRecognitionPresetOptions } from "../modules/formula-recognition/preset.ts";
import { FormulaRecognitionService } from "../modules/formula-recognition/service.ts";
import { getImageClassificationPresetOptions } from "../modules/image-classification/preset.ts";
import {
    type ImageClassificationResult,
    ImageClassificationService,
} from "../modules/image-classification/service.ts";
import type { ObjectDetectionBox } from "../modules/object-detection/postprocess.ts";
import { getObjectDetectionPresetOptions } from "../modules/object-detection/preset.ts";
import { ObjectDetectionService } from "../modules/object-detection/service.ts";
import {
    matchTableStructureToOcr,
    type TableStructureOcrMatchResult,
    type TableStructureRecognitionResult,
} from "../modules/table-structure/postprocess.ts";
import { getTableStructureRecognitionPresetOptions } from "../modules/table-structure/preset.ts";
import { TableStructureRecognitionService } from "../modules/table-structure/service.ts";
import { getTextDetectionPresetOptions } from "../modules/text-detection/preset.ts";
import { DetectionService } from "../modules/text-detection/service.ts";
import type { TextImageUnwarpingResult } from "../modules/text-image-unwarping/postprocess.ts";
import { getTextImageUnwarpingPresetOptions } from "../modules/text-image-unwarping/preset.ts";
import { TextImageUnwarpingService } from "../modules/text-image-unwarping/service.ts";
import { getTextRecognitionPresetOptions } from "../modules/text-recognition/preset.ts";
import { type RecognitionResult, RecognitionService } from "../modules/text-recognition/service.ts";
import { PaddleOcrService } from "./ocr.ts";

export type PaddleStructureRegionStatus = "applied" | "skipped";

export type PaddleStructureRegionType =
    | "text"
    | "title"
    | "table"
    | "formula"
    | "seal"
    | "image"
    | "unknown"
    | (string & {});

export interface PaddleStructureDocumentOrientationOptions
    extends Partial<ImageClassificationRuntimeOptions> {
    enabled?: boolean;
    threshold?: number;
}

export interface PaddleStructureTextImageUnwarpingOptions
    extends Partial<TextImageUnwarpingRuntimeOptions> {
    enabled?: boolean;
}

export interface PaddleStructureLayoutOptions extends Partial<ObjectDetectionRuntimeOptions> {
    enabled?: boolean;
    fallbackRegionType?: PaddleStructureRegionType | false;
}

export interface PaddleStructureReadingOrderOptions {
    enabled?: boolean;
}

export interface PaddleStructureRegionDetectionOptions
    extends Partial<ObjectDetectionRuntimeOptions> {
    enabled?: boolean;
}

export interface PaddleStructureOcrOptions extends RecognitionOptions {
    enabled?: boolean;
    stripStyleTokens?: boolean;
}

export interface PaddleStructureTableOptions
    extends Partial<TableStructureRecognitionRuntimeOptions> {
    enabled?: boolean;
    ocr?: PaddleStructureOcrOptions;
}

export interface PaddleStructureFormulaOptions extends Partial<FormulaRecognitionRuntimeOptions> {
    enabled?: boolean;
}

export interface PaddleStructureSealOptions {
    enabled?: boolean;
    detection?: Partial<DetectionRuntimeOptions>;
    recognition?: RecognitionOptions;
}

export interface PaddleStructureMarkdownOptions {
    enabled?: boolean;
    ignoreLabels?: readonly string[];
}

export interface PaddleStructureRunOptions {
    documentOrientation?: PaddleStructureDocumentOrientationOptions;
    textImageUnwarping?: PaddleStructureTextImageUnwarpingOptions;
    regionDetection?: PaddleStructureRegionDetectionOptions;
    layout?: PaddleStructureLayoutOptions;
    readingOrder?: PaddleStructureReadingOrderOptions;
    ocr?: PaddleStructureOcrOptions;
    table?: PaddleStructureTableOptions;
    formula?: PaddleStructureFormulaOptions;
    seal?: PaddleStructureSealOptions;
    markdown?: PaddleStructureMarkdownOptions;
    includeRegionImage?: boolean;
}

export interface PaddleStructureClassificationCreateOptions
    extends Partial<ImageClassificationServiceOptions> {
    preset?: ImageClassificationPresetName;
}

export interface PaddleStructureTextImageUnwarpingCreateOptions
    extends Partial<TextImageUnwarpingServiceOptions> {
    preset?: TextImageUnwarpingPresetName;
}

export interface PaddleStructureObjectDetectionCreateOptions
    extends Partial<ObjectDetectionServiceOptions> {
    preset?: ObjectDetectionPresetName;
}

export interface PaddleStructureTableCreateOptions
    extends Partial<TableStructureRecognitionServiceOptions> {
    preset?: TableStructureRecognitionPresetName;
}

export interface PaddleStructureFormulaCreateOptions
    extends Partial<FormulaRecognitionServiceOptions> {
    preset?: FormulaRecognitionPresetName;
}

export interface PaddleStructureTextDetectionCreateOptions
    extends Partial<DetectionServiceOptions> {
    preset?: TextDetectionPresetName;
}

export interface PaddleStructureTextRecognitionCreateOptions
    extends Partial<RecognitionServiceOptions> {
    preset?: TextRecognitionPresetName;
}

export interface PaddleStructureCreateOptions {
    ort: OrtModule;
    documentOrientation?: PaddleStructureClassificationCreateOptions;
    textImageUnwarping?: PaddleStructureTextImageUnwarpingCreateOptions;
    regionDetection?: PaddleStructureObjectDetectionCreateOptions;
    layout?: PaddleStructureObjectDetectionCreateOptions;
    ocr?: PaddleOptions;
    tableOcr?: PaddleOptions;
    tableStructure?: PaddleStructureTableCreateOptions;
    formulaRecognition?: PaddleStructureFormulaCreateOptions;
    sealTextDetection?: PaddleStructureTextDetectionCreateOptions;
    sealTextRecognition?: PaddleStructureTextRecognitionCreateOptions;
    options?: PaddleStructureRunOptions;
}

export interface PaddleStructureServices {
    documentOrientation?: {
        run(
            input: ImageInput,
            options?: Partial<ImageClassificationRuntimeOptions>
        ): Promise<ImageClassificationResult[]>;
    };
    textImageUnwarping?: {
        run(
            input: ImageInput,
            options?: Partial<TextImageUnwarpingRuntimeOptions>
        ): Promise<TextImageUnwarpingResult>;
    };
    regionDetection?: {
        run(
            input: ImageInput,
            options?: Partial<ObjectDetectionRuntimeOptions>
        ): Promise<ObjectDetectionBox[]>;
    };
    layout?: {
        run(
            input: ImageInput,
            options?: Partial<ObjectDetectionRuntimeOptions>
        ): Promise<ObjectDetectionBox[]>;
    };
    ocr?: {
        recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
    };
    tableOcr?: {
        recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
    };
    tableStructure?: {
        run(
            input: ImageInput,
            options?: Partial<TableStructureRecognitionRuntimeOptions>
        ): Promise<TableStructureRecognitionResult>;
    };
    formulaRecognition?: {
        run(
            input: ImageInput,
            options?: Partial<FormulaRecognitionRuntimeOptions>
        ): Promise<FormulaRecognitionResult>;
    };
    sealTextDetection?: {
        run(input: ImageInput, options?: Partial<DetectionRuntimeOptions>): Promise<Box[]>;
    };
    sealTextRecognition?: {
        run(
            image: Image,
            detection: Box[],
            options?: RecognitionOptions
        ): Promise<RecognitionResult[]>;
    };
}

export interface PaddleStructureStageResult<T = unknown> {
    status: PaddleStructureRegionStatus;
    reason?: string;
    result?: T;
}

export interface PaddleStructureLayoutRegion {
    type: PaddleStructureRegionType;
    label: string;
    score: number;
    bbox: [number, number, number, number];
    layout?: PaddleStructureRegionLayout;
    blockOrder?: number;
}

export interface PaddleStructureTableResult {
    structure?: TableStructureRecognitionResult;
    ocr?: RecognitionResult[];
    matched?: TableStructureOcrMatchResult;
}

export interface PaddleStructureSealResult {
    boxes: Box[];
    recognition: RecognitionResult[];
}

export interface PaddleStructureRegionResult {
    type: PaddleStructureRegionType;
    label: string;
    score: number;
    bbox: [number, number, number, number];
    layout?: PaddleStructureRegionLayout;
    blockOrder?: number;
    status: PaddleStructureRegionStatus;
    reason?: string;
    image?: ImageInput;
    ocr?: RecognitionResult[];
    table?: PaddleStructureTableResult;
    formula?: FormulaRecognitionResult;
    seal?: PaddleStructureSealResult;
}

export type PaddleStructureRegionLayout = "single" | "double";

export interface PaddleStructureMarkdownResult {
    text: string;
}

export interface PaddleStructureResult {
    image: ImageInput;
    stages: {
        documentOrientation: PaddleStructureStageResult<{
            classification: ImageClassificationResult;
            angle: number;
        }>;
        textImageUnwarping: PaddleStructureStageResult<TextImageUnwarpingResult>;
        regionDetection: PaddleStructureStageResult<PaddleStructureLayoutRegion[]>;
        layout: PaddleStructureStageResult<PaddleStructureLayoutRegion[]>;
        readingOrder: PaddleStructureStageResult<PaddleStructureLayoutRegion[]>;
        ocr: PaddleStructureStageResult<RecognitionResult[]>;
        markdown: PaddleStructureStageResult<PaddleStructureMarkdownResult>;
    };
    regionDetections: PaddleStructureLayoutRegion[];
    regions: PaddleStructureRegionResult[];
    markdown?: PaddleStructureMarkdownResult;
}

const DEFAULT_STRUCTURE_OPTIONS: PaddleStructureRunOptions = {
    documentOrientation: { enabled: true, threshold: 0 },
    textImageUnwarping: { enabled: true },
    regionDetection: { enabled: true },
    layout: { enabled: true, fallbackRegionType: "table" },
    readingOrder: { enabled: true },
    ocr: { enabled: true, stripStyleTokens: true },
    table: { enabled: true },
    formula: { enabled: true },
    seal: { enabled: true },
    markdown: { enabled: true },
    includeRegionImage: false,
};

const TABLE_REGION_TYPES = new Set(["table"]);
const FORMULA_REGION_TYPES = new Set(["formula", "equation"]);
const SEAL_REGION_TYPES = new Set(["seal"]);
const STYLE_TOKENS = [
    "<strike>",
    "</strike>",
    "<sup>",
    "</sub>",
    "<b>",
    "</b>",
    "<sub>",
    "</sup>",
    "<overline>",
    "</overline>",
    "<underline>",
    "</underline>",
    "<i>",
    "</i>",
];

export class PaddleStructureService {
    private readonly services: PaddleStructureServices;
    private readonly options: PaddleStructureRunOptions;

    constructor(services: PaddleStructureServices = {}, options: PaddleStructureRunOptions = {}) {
        this.services = { ...services };
        this.options = mergeStructureOptions(DEFAULT_STRUCTURE_OPTIONS, options);
    }

    static async createInstance(
        options: PaddleStructureCreateOptions
    ): Promise<PaddleStructureService> {
        if (!options.ort) {
            throw new Error(
                "PaddleStructureService.createInstance requires the 'ort' option to be set."
            );
        }

        const services: PaddleStructureServices = {};
        if (options.documentOrientation?.modelBuffer) {
            services.documentOrientation = await createImageClassificationService(
                options.ort,
                options.documentOrientation,
                "PP-LCNet_x1_0_doc_ori"
            );
        }
        if (options.textImageUnwarping?.modelBuffer) {
            services.textImageUnwarping = await createTextImageUnwarpingService(
                options.ort,
                options.textImageUnwarping,
                "UVDoc"
            );
        }
        if (options.regionDetection?.modelBuffer) {
            services.regionDetection = await createObjectDetectionService(
                options.ort,
                options.regionDetection,
                "PP-DocBlockLayout"
            );
        }
        if (options.layout?.modelBuffer) {
            services.layout = await createObjectDetectionService(
                options.ort,
                options.layout,
                "PP-DocLayout_plus-L"
            );
        }
        if (options.ocr?.detection?.modelBuffer || options.ocr?.recognition?.modelBuffer) {
            services.ocr = await PaddleOcrService.createInstance({
                ...options.ocr,
                ort: options.ort,
            });
        }
        if (
            options.tableOcr?.detection?.modelBuffer ||
            options.tableOcr?.recognition?.modelBuffer
        ) {
            services.tableOcr = await PaddleOcrService.createInstance({
                ...options.tableOcr,
                ort: options.ort,
            });
        }
        if (options.tableStructure?.modelBuffer) {
            services.tableStructure = await createTableStructureService(
                options.ort,
                options.tableStructure,
                "SLANet"
            );
        }
        if (options.formulaRecognition?.modelBuffer) {
            services.formulaRecognition = await createFormulaRecognitionService(
                options.ort,
                options.formulaRecognition,
                "PP-FormulaNet_plus-M"
            );
        }
        if (options.sealTextDetection?.modelBuffer) {
            services.sealTextDetection = await createTextDetectionService(
                options.ort,
                options.sealTextDetection,
                "PP-OCRv4_mobile_seal_det"
            );
        }
        if (options.sealTextRecognition?.modelBuffer) {
            services.sealTextRecognition = await createTextRecognitionService(
                options.ort,
                options.sealTextRecognition,
                "PP-OCRv6_small_rec"
            );
        }

        if (Object.keys(services).length === 0) {
            throw new Error(
                "PaddleStructureService.createInstance requires at least one modelBuffer or OCR model pair."
            );
        }

        return new PaddleStructureService(services, options.options);
    }

    async run(
        input: ImageInput,
        options: PaddleStructureRunOptions = {}
    ): Promise<PaddleStructureResult> {
        const runtimeOptions = mergeStructureOptions(this.options, options);
        let image = normalizeInputToRgb(input);

        const documentOrientation = await this.runDocumentOrientation(image, runtimeOptions);
        if (documentOrientation.result?.angle) {
            image = rotateImageByAngle(image, documentOrientation.result.angle);
        }

        const textImageUnwarping = await this.runTextImageUnwarping(image, runtimeOptions);
        if (textImageUnwarping.result) {
            image = normalizeInputToRgb(textImageUnwarping.result.doctrImage);
        }

        const regionDetection = await this.runRegionDetection(image, runtimeOptions);
        const layout = await this.runLayout(image, runtimeOptions);
        const readingOrder = this.runReadingOrder(layout.result ?? [], image, runtimeOptions);
        const pageOcr = await this.runPageOcr(image, runtimeOptions);
        const regions: PaddleStructureRegionResult[] = [];
        for (const region of readingOrder.result ?? []) {
            regions.push(await this.runRegion(image, region, pageOcr.result, runtimeOptions));
        }
        const markdown = this.runMarkdown(regions, runtimeOptions);

        return {
            image: imageToInput(image),
            stages: {
                documentOrientation,
                textImageUnwarping,
                regionDetection,
                layout,
                readingOrder,
                ocr: pageOcr,
                markdown,
            },
            regionDetections: regionDetection.result ?? [],
            regions,
            markdown: markdown.result,
        };
    }

    private async runDocumentOrientation(
        image: Image,
        options: PaddleStructureRunOptions
    ): Promise<PaddleStructureResult["stages"]["documentOrientation"]> {
        if (!isEnabled(options.documentOrientation)) {
            return { status: "skipped", reason: "document orientation disabled" };
        }
        if (!this.services.documentOrientation) {
            return { status: "skipped", reason: "document orientation service not configured" };
        }
        const {
            enabled: _enabled,
            threshold,
            ...classificationOptions
        } = options.documentOrientation ?? {};
        const results = await this.services.documentOrientation.run(image, classificationOptions);
        const topResult = results[0];
        if (!topResult || topResult.score < (threshold ?? 0)) {
            return { status: "skipped", reason: "document orientation score below threshold" };
        }
        const angle = parseOrientationAngle(topResult.label);
        if (angle === 0) {
            return { status: "applied", result: { classification: topResult, angle } };
        }
        return { status: "applied", result: { classification: topResult, angle } };
    }

    private async runTextImageUnwarping(
        image: Image,
        options: PaddleStructureRunOptions
    ): Promise<PaddleStructureResult["stages"]["textImageUnwarping"]> {
        if (!isEnabled(options.textImageUnwarping)) {
            return { status: "skipped", reason: "text image unwarping disabled" };
        }
        if (!this.services.textImageUnwarping) {
            return { status: "skipped", reason: "text image unwarping service not configured" };
        }
        const { enabled: _enabled, ...unwarpingOptions } = options.textImageUnwarping ?? {};
        const result = await this.services.textImageUnwarping.run(image, unwarpingOptions);
        return { status: "applied", result };
    }

    private async runLayout(
        image: Image,
        options: PaddleStructureRunOptions
    ): Promise<PaddleStructureResult["stages"]["layout"]> {
        const fallbackRegionType = options.layout?.fallbackRegionType ?? "table";
        if (!isEnabled(options.layout)) {
            return fallbackRegionType === false
                ? { status: "skipped", reason: "layout disabled", result: [] }
                : {
                      status: "skipped",
                      reason: "layout disabled",
                      result: [createFullPageRegion(image, fallbackRegionType)],
                  };
        }
        if (!this.services.layout) {
            return fallbackRegionType === false
                ? { status: "skipped", reason: "layout service not configured", result: [] }
                : {
                      status: "skipped",
                      reason: "layout service not configured",
                      result: [createFullPageRegion(image, fallbackRegionType)],
                  };
        }
        const {
            enabled: _enabled,
            fallbackRegionType: _fallbackRegionType,
            ...layoutOptions
        } = options.layout ?? {};
        const regions = (await this.services.layout.run(image, layoutOptions))
            .map((box) => objectBoxToRegion(box, image))
            .filter((region): region is PaddleStructureLayoutRegion => Boolean(region));
        return { status: "applied", result: regions };
    }

    private runReadingOrder(
        regions: PaddleStructureLayoutRegion[],
        image: Image,
        options: PaddleStructureRunOptions
    ): PaddleStructureResult["stages"]["readingOrder"] {
        if (!isEnabled(options.readingOrder)) {
            return {
                status: "skipped",
                reason: "reading order disabled",
                result: assignBlockOrder(regions),
            };
        }
        return {
            status: "applied",
            result: assignBlockOrder(sortLayoutRegionsByReadingOrder(regions, image.width)),
        };
    }

    private async runRegionDetection(
        image: Image,
        options: PaddleStructureRunOptions
    ): Promise<PaddleStructureResult["stages"]["regionDetection"]> {
        if (!isEnabled(options.regionDetection)) {
            return { status: "skipped", reason: "region detection disabled", result: [] };
        }
        if (!this.services.regionDetection) {
            return {
                status: "skipped",
                reason: "region detection service not configured",
                result: [],
            };
        }
        const { enabled: _enabled, ...regionDetectionOptions } = options.regionDetection ?? {};
        const regions = (await this.services.regionDetection.run(image, regionDetectionOptions))
            .map((box) => objectBoxToRegion(box, image))
            .filter((region): region is PaddleStructureLayoutRegion => Boolean(region));
        return { status: "applied", result: regions };
    }

    private async runPageOcr(
        image: Image,
        options: PaddleStructureRunOptions
    ): Promise<PaddleStructureResult["stages"]["ocr"]> {
        if (!isEnabled(options.ocr)) {
            return { status: "skipped", reason: "ocr disabled" };
        }
        if (!this.services.ocr) {
            return { status: "skipped", reason: "ocr service not configured" };
        }
        const {
            enabled: _enabled,
            stripStyleTokens: _stripStyleTokens,
            ...ocrOptions
        } = options.ocr ?? {};
        const result = sanitizeRecognitionResults(
            await this.services.ocr.recognize(image, ocrOptions),
            shouldStripStyleTokens(options.ocr)
        );
        return { status: "applied", result };
    }

    private async runRegion(
        image: Image,
        region: PaddleStructureLayoutRegion,
        pageOcr: RecognitionResult[] | undefined,
        options: PaddleStructureRunOptions
    ): Promise<PaddleStructureRegionResult> {
        const crop = cropRegion(image, region.bbox);
        const base = createRegionBase(region, crop, options.includeRegionImage);
        if (TABLE_REGION_TYPES.has(region.type)) {
            return { ...base, ...(await this.runTableRegion(crop, options)) };
        }
        if (FORMULA_REGION_TYPES.has(region.type)) {
            return { ...base, ...(await this.runFormulaRegion(crop, options)) };
        }
        if (SEAL_REGION_TYPES.has(region.type)) {
            return { ...base, ...(await this.runSealRegion(crop, options)) };
        }
        const filteredOcr = pageOcr
            ? filterRecognitionByRegion(pageOcr, region.bbox).map((result) =>
                  localizeRecognitionResult(result, region.bbox)
              )
            : undefined;
        return filteredOcr
            ? { ...base, status: "applied", ocr: filteredOcr }
            : { ...base, status: "skipped", reason: "ocr service not configured" };
    }

    private async runTableRegion(
        crop: Image,
        options: PaddleStructureRunOptions
    ): Promise<Pick<PaddleStructureRegionResult, "status" | "reason" | "table">> {
        if (!isEnabled(options.table)) {
            return { status: "skipped", reason: "table recognition disabled" };
        }
        if (!this.services.tableStructure) {
            return { status: "skipped", reason: "table structure service not configured" };
        }
        const { enabled: _enabled, ocr: tableOcrOptions, ...tableOptions } = options.table ?? {};
        const structure = await this.services.tableStructure.run(crop, tableOptions);
        const tableOcrService = this.services.tableOcr ?? this.services.ocr;
        if (!tableOcrService || !isEnabled(tableOcrOptions ?? options.ocr)) {
            return { status: "applied", table: { structure } };
        }
        const {
            enabled: _ocrEnabled,
            stripStyleTokens: _stripStyleTokens,
            ...ocrOptions
        } = tableOcrOptions ?? options.ocr ?? {};
        const ocr = sanitizeRecognitionResults(
            await tableOcrService.recognize(crop, ocrOptions),
            shouldStripStyleTokens(tableOcrOptions ?? options.ocr)
        );
        return {
            status: "applied",
            table: {
                structure,
                ocr,
                matched: matchTableStructureToOcr(structure, ocr),
            },
        };
    }

    private async runFormulaRegion(
        crop: Image,
        options: PaddleStructureRunOptions
    ): Promise<Pick<PaddleStructureRegionResult, "status" | "reason" | "formula">> {
        if (!isEnabled(options.formula)) {
            return { status: "skipped", reason: "formula recognition disabled" };
        }
        if (!this.services.formulaRecognition) {
            return { status: "skipped", reason: "formula recognition service not configured" };
        }
        const { enabled: _enabled, ...formulaOptions } = options.formula ?? {};
        return {
            status: "applied",
            formula: await this.services.formulaRecognition.run(crop, formulaOptions),
        };
    }

    private async runSealRegion(
        crop: Image,
        options: PaddleStructureRunOptions
    ): Promise<Pick<PaddleStructureRegionResult, "status" | "reason" | "seal">> {
        if (!isEnabled(options.seal)) {
            return { status: "skipped", reason: "seal recognition disabled" };
        }
        if (!this.services.sealTextDetection || !this.services.sealTextRecognition) {
            return {
                status: "skipped",
                reason: "seal text detection or recognition service not configured",
            };
        }
        const boxes = await this.services.sealTextDetection.run(crop, options.seal?.detection);
        const recognition = await this.services.sealTextRecognition.run(
            crop,
            boxes,
            options.seal?.recognition
        );
        return {
            status: "applied",
            seal: { boxes, recognition },
        };
    }

    private runMarkdown(
        regions: PaddleStructureRegionResult[],
        options: PaddleStructureRunOptions
    ): PaddleStructureResult["stages"]["markdown"] {
        if (!isEnabled(options.markdown)) {
            return { status: "skipped", reason: "markdown disabled" };
        }
        return {
            status: "applied",
            result: {
                text: createStructureMarkdown(regions, options.markdown?.ignoreLabels),
            },
        };
    }
}

async function createImageClassificationService(
    ort: OrtModule,
    options: PaddleStructureClassificationCreateOptions,
    defaultPreset: ImageClassificationPresetName
): Promise<ImageClassificationService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new ImageClassificationService(ort, session, {
        ...getImageClassificationPresetOptions(preset),
        ...runtimeOptions,
    });
}

async function createTextImageUnwarpingService(
    ort: OrtModule,
    options: PaddleStructureTextImageUnwarpingCreateOptions,
    defaultPreset: TextImageUnwarpingPresetName
): Promise<TextImageUnwarpingService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new TextImageUnwarpingService(ort, session, {
        ...getTextImageUnwarpingPresetOptions(preset),
        ...runtimeOptions,
    });
}

async function createObjectDetectionService(
    ort: OrtModule,
    options: PaddleStructureObjectDetectionCreateOptions,
    defaultPreset: ObjectDetectionPresetName
): Promise<ObjectDetectionService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new ObjectDetectionService(ort, session, {
        ...getObjectDetectionPresetOptions(preset),
        ...runtimeOptions,
    });
}

async function createTableStructureService(
    ort: OrtModule,
    options: PaddleStructureTableCreateOptions,
    defaultPreset: TableStructureRecognitionPresetName
): Promise<TableStructureRecognitionService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new TableStructureRecognitionService(ort, session, {
        ...getTableStructureRecognitionPresetOptions(preset),
        ...runtimeOptions,
    });
}

async function createFormulaRecognitionService(
    ort: OrtModule,
    options: PaddleStructureFormulaCreateOptions,
    defaultPreset: FormulaRecognitionPresetName
): Promise<FormulaRecognitionService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new FormulaRecognitionService(ort, session, {
        ...getFormulaRecognitionPresetOptions(preset),
        ...runtimeOptions,
    });
}

async function createTextDetectionService(
    ort: OrtModule,
    options: PaddleStructureTextDetectionCreateOptions,
    defaultPreset: TextDetectionPresetName
): Promise<DetectionService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new DetectionService(ort, session, {
        ...getTextDetectionPresetOptions(preset),
        ...runtimeOptions,
    });
}

async function createTextRecognitionService(
    ort: OrtModule,
    options: PaddleStructureTextRecognitionCreateOptions,
    defaultPreset: TextRecognitionPresetName
): Promise<RecognitionService> {
    const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
    if (!modelBuffer) {
        throw new Error(`${preset} modelBuffer is required.`);
    }
    const session = await ort.InferenceSession.create(modelBuffer);
    return new RecognitionService(ort, session, {
        ...getTextRecognitionPresetOptions(preset),
        ...runtimeOptions,
    });
}

function mergeStructureOptions(
    defaults: PaddleStructureRunOptions,
    options: PaddleStructureRunOptions
): PaddleStructureRunOptions {
    return {
        ...defaults,
        ...options,
        documentOrientation: {
            ...defaults.documentOrientation,
            ...options.documentOrientation,
        },
        textImageUnwarping: {
            ...defaults.textImageUnwarping,
            ...options.textImageUnwarping,
        },
        regionDetection: {
            ...defaults.regionDetection,
            ...options.regionDetection,
        },
        layout: {
            ...defaults.layout,
            ...options.layout,
        },
        readingOrder: {
            ...defaults.readingOrder,
            ...options.readingOrder,
        },
        ocr: {
            ...defaults.ocr,
            ...options.ocr,
        },
        table: {
            ...defaults.table,
            ...options.table,
            ocr: options.table?.ocr
                ? {
                      ...defaults.table?.ocr,
                      ...options.table.ocr,
                  }
                : defaults.table?.ocr,
        },
        formula: {
            ...defaults.formula,
            ...options.formula,
        },
        seal: {
            ...defaults.seal,
            ...options.seal,
        },
        markdown: {
            ...defaults.markdown,
            ...options.markdown,
        },
    };
}

function isEnabled(options: { enabled?: boolean } | undefined): boolean {
    return options?.enabled !== false;
}

function shouldStripStyleTokens(options: PaddleStructureOcrOptions | undefined): boolean {
    return options?.stripStyleTokens !== false;
}

function parseOrientationAngle(label: string): number {
    const match = label.match(/(?:^|[^0-9])(90|180|270)(?:[^0-9]|$)/);
    return match ? Number(match[1]) : 0;
}

function rotateImageByAngle(image: Image, angle: number): Image {
    if (angle === 90) {
        return image.rotateCounterClockwise();
    }
    if (angle === 180) {
        return image.rotate180();
    }
    if (angle === 270) {
        return image.rotateClockwise();
    }
    return image;
}

function createFullPageRegion(
    image: Image,
    type: PaddleStructureRegionType
): PaddleStructureLayoutRegion {
    return {
        type,
        label: type,
        score: 0,
        bbox: [0, 0, image.width, image.height],
    };
}

function assignBlockOrder(regions: PaddleStructureLayoutRegion[]): PaddleStructureLayoutRegion[] {
    return regions.map((region, index) => ({
        ...region,
        blockOrder: index,
    }));
}

function sortLayoutRegionsByReadingOrder(
    regions: PaddleStructureLayoutRegion[],
    width: number
): PaddleStructureLayoutRegion[] {
    const numBoxes = regions.length;
    if (numBoxes === 0) {
        return [];
    }
    if (numBoxes === 1) {
        return [{ ...regions[0], layout: "single" }];
    }

    const boxes = [...regions]
        .sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0])
        .map((region) => ({ ...region }));

    const sortedRegions: PaddleStructureLayoutRegion[] = [];
    let leftColumn: PaddleStructureLayoutRegion[] = [];
    let rightColumn: PaddleStructureLayoutRegion[] = [];
    let index = 0;

    while (index < numBoxes) {
        const region = boxes[index];
        if (index === numBoxes - 1) {
            if (
                region.bbox[1] > boxes[index - 1].bbox[3] &&
                region.bbox[0] < width / 2 &&
                region.bbox[2] > width / 2
            ) {
                sortedRegions.push(...leftColumn, ...rightColumn, { ...region, layout: "single" });
            } else if (region.bbox[2] > width / 2) {
                rightColumn.push({ ...region, layout: "double" });
                sortedRegions.push(...leftColumn, ...rightColumn);
            } else if (region.bbox[0] < width / 2) {
                leftColumn.push({ ...region, layout: "double" });
                sortedRegions.push(...leftColumn, ...rightColumn);
            }
            leftColumn = [];
            rightColumn = [];
            break;
        }

        if (region.bbox[0] < width / 4 && region.bbox[2] < (3 * width) / 4) {
            leftColumn.push({ ...region, layout: "double" });
            index += 1;
        } else if (region.bbox[0] > width / 4 && region.bbox[2] > width / 2) {
            rightColumn.push({ ...region, layout: "double" });
            index += 1;
        } else {
            sortedRegions.push(...leftColumn, ...rightColumn, { ...region, layout: "single" });
            leftColumn = [];
            rightColumn = [];
            index += 1;
        }
    }

    if (leftColumn.length) {
        sortedRegions.push(...leftColumn);
    }
    if (rightColumn.length) {
        sortedRegions.push(...rightColumn);
    }
    return sortedRegions;
}

function objectBoxToRegion(
    box: ObjectDetectionBox,
    image: Image
): PaddleStructureLayoutRegion | null {
    const bbox = clipXyxy(box.coordinate, image);
    if (!bbox) {
        return null;
    }
    return {
        type: normalizeRegionType(box.label),
        label: box.label,
        score: box.score,
        bbox,
    };
}

function normalizeRegionType(label: string): PaddleStructureRegionType {
    const lower = label.toLowerCase().replace(/[\s-]+/g, "_");
    if (lower === "equation") {
        return "formula";
    }
    return lower;
}

function clipXyxy(
    coordinate: readonly [number, number, number, number],
    image: Image
): [number, number, number, number] | null {
    const x1 = Math.max(0, Math.min(image.width, Math.floor(coordinate[0])));
    const y1 = Math.max(0, Math.min(image.height, Math.floor(coordinate[1])));
    const x2 = Math.max(0, Math.min(image.width, Math.ceil(coordinate[2])));
    const y2 = Math.max(0, Math.min(image.height, Math.ceil(coordinate[3])));
    if (x2 <= x1 || y2 <= y1) {
        return null;
    }
    return [x1, y1, x2, y2];
}

function cropRegion(image: Image, bbox: [number, number, number, number]): Image {
    const [x1, y1, x2, y2] = bbox;
    return image.crop({
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
    });
}

function createRegionBase(
    region: PaddleStructureLayoutRegion,
    crop: Image,
    includeRegionImage: boolean | undefined
): Pick<
    PaddleStructureRegionResult,
    "type" | "label" | "score" | "bbox" | "layout" | "blockOrder" | "image"
> {
    return {
        type: region.type,
        label: region.label,
        score: region.score,
        bbox: region.bbox,
        layout: region.layout,
        blockOrder: region.blockOrder,
        image: includeRegionImage ? imageToInput(crop) : undefined,
    };
}

function imageToInput(image: Image): ImageInput {
    return {
        width: image.width,
        height: image.height,
        data: image.data,
    };
}

function createStructureMarkdown(
    regions: readonly PaddleStructureRegionResult[],
    ignoreLabels: readonly string[] | undefined
): string {
    const ignored = new Set((ignoreLabels ?? []).map((label) => label.toLowerCase()));
    const chunks: string[] = [];

    for (const region of regions) {
        const type = region.type.toLowerCase();
        const label = region.label.toLowerCase();
        if (ignored.has(type) || ignored.has(label) || type === "header" || type === "footer") {
            continue;
        }

        const chunk = createRegionMarkdown(region, type);
        if (chunk) {
            chunks.push(chunk);
        }
    }

    return chunks.join("\n\n").replace(/\n{3,}/g, "\n\n");
}

function createRegionMarkdown(
    region: PaddleStructureRegionResult,
    type: string
): string | undefined {
    if (type === "title") {
        const text = joinRecognitionText(region.ocr);
        return text ? `# ${text}` : undefined;
    }
    if (type === "table") {
        return (
            region.table?.matched?.fullHtml ??
            region.table?.structure?.fullHtml ??
            region.table?.matched?.html ??
            region.table?.structure?.html
        );
    }
    if (type === "formula" || type === "equation") {
        return region.formula?.formula ? `$$${region.formula.formula}$$` : undefined;
    }
    if (type === "seal") {
        return joinRecognitionText(region.seal?.recognition);
    }
    if (type === "text") {
        return region.ocr?.length
            ? escapeMarkdownSpecialChars(mergeTextRegionLikeOfficial(region, region.ocr))
            : undefined;
    }
    return joinRecognitionText(region.ocr);
}

function joinRecognitionText(
    results: readonly RecognitionResult[] | undefined
): string | undefined {
    const text = results
        ?.map((result) => result.text)
        .filter(Boolean)
        .join(" ")
        .trim();
    return text || undefined;
}

function escapeMarkdownSpecialChars(content: string): string {
    let output = content;
    for (const char of ["*", "`", "~", "$"]) {
        output = output.replaceAll(char, `\\${char}`);
    }
    return output;
}

function mergeTextRegionLikeOfficial(
    region: PaddleStructureRegionResult,
    lines: readonly RecognitionResult[]
): string {
    return shouldMergeTextByHeadSpace(region, lines)
        ? mergeTextByHeadSpace(lines)
        : mergeTextByTailSpace(region, lines);
}

function shouldMergeTextByHeadSpace(
    region: PaddleStructureRegionResult,
    lines: readonly RecognitionResult[]
): boolean {
    const firstLine = lines[0];
    if (!firstLine) {
        return false;
    }
    const firstLineBox = boxToLocalPoints(firstLine.box);
    const firstLineX1 = firstLineBox[0].x;
    const firstLineHeight = Math.abs(firstLineBox[2].y - firstLineBox[0].y);
    const textX1 = 0;
    const x1Distance = firstLineX1 - textX1;
    return x1Distance > firstLineHeight && region.bbox[2] > region.bbox[0];
}

function mergeTextByHeadSpace(lines: readonly RecognitionResult[]): string {
    let text = "";
    let previousX: number | undefined;
    let firstLine = true;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lineBox = boxToLocalPoints(line.box);
        const x1 = lineBox[0].x;
        const height = Math.abs(lineBox[2].y - lineBox[0].y);

        if (index === 0) {
            text += line.text;
            previousX = x1;
            continue;
        }

        if (firstLine) {
            if (previousX !== undefined && Math.abs(previousX - x1) < height) {
                text += `\n\n${line.text}`;
                firstLine = true;
            } else {
                text += line.text;
                firstLine = false;
            }
        } else if (previousX !== undefined && Math.abs(previousX - x1) < height) {
            text += line.text;
            firstLine = false;
        } else {
            text += `\n\n${line.text}`;
            firstLine = true;
        }
        previousX = x1;
    }

    return text;
}

function mergeTextByTailSpace(
    region: PaddleStructureRegionResult,
    lines: readonly RecognitionResult[]
): string {
    let text = "";
    let firstLine = true;
    const width = region.bbox[2] - region.bbox[0];

    for (const line of lines) {
        const lineBox = boxToLocalPoints(line.box);
        const rowWidth = lineBox[2].x - lineBox[0].x;
        const rowHeight = Math.abs(lineBox[2].y - lineBox[0].y);
        const fullRowThreshold = width - rowHeight;
        const isFull = rowWidth >= fullRowThreshold;

        if (firstLine) {
            text += `\n\n${line.text}`;
        } else {
            text += line.text;
        }
        firstLine = !isFull;
    }

    return text;
}

function boxToLocalPoints(box: Box): [Point, Point, Point, Point] {
    const points = box.polygon ?? box.points;
    if (points?.length >= 4) {
        return [points[0], points[1], points[2], points[3]];
    }
    return [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
    ];
}

function sanitizeRecognitionResults(
    results: RecognitionResult[],
    stripStyleTokens: boolean
): RecognitionResult[] {
    if (!stripStyleTokens) {
        return results;
    }
    return results.map((result) => ({
        ...result,
        text: stripTableStyleTokens(result.text),
    }));
}

function stripTableStyleTokens(text: string): string {
    let output = text;
    for (const token of STYLE_TOKENS) {
        output = output.replaceAll(token, "");
    }
    return output;
}

function filterRecognitionByRegion(
    results: readonly RecognitionResult[],
    bbox: [number, number, number, number]
): RecognitionResult[] {
    return results.filter((result) => rectanglesIntersect(bbox, boxToXyxy(result.box)));
}

function rectanglesIntersect(
    a: [number, number, number, number],
    b: [number, number, number, number]
): boolean {
    return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
}

function boxToXyxy(box: Box): [number, number, number, number] {
    const points = box.polygon ?? box.points;
    if (points?.length) {
        return pointsToXyxy(points);
    }
    return [box.x, box.y, box.x + box.width, box.y + box.height];
}

function pointsToXyxy(points: readonly Point[]): [number, number, number, number] {
    return [
        Math.min(...points.map((point) => point.x)),
        Math.min(...points.map((point) => point.y)),
        Math.max(...points.map((point) => point.x)),
        Math.max(...points.map((point) => point.y)),
    ];
}

function localizeRecognitionResult(
    result: RecognitionResult,
    regionBbox: [number, number, number, number]
): RecognitionResult {
    const [x1, y1] = regionBbox;
    return {
        ...result,
        box: localizeBox(result.box, x1, y1),
    };
}

function localizeBox(box: Box, x: number, y: number): Box {
    return {
        ...box,
        x: box.x - x,
        y: box.y - y,
        points: box.points?.map((point) => localizePoint(point, x, y)) as
            | [Point, Point, Point, Point]
            | undefined,
        polygon: box.polygon?.map((point) => localizePoint(point, x, y)),
    };
}

function localizePoint(point: Point, x: number, y: number): Point {
    return {
        x: point.x - x,
        y: point.y - y,
    };
}
