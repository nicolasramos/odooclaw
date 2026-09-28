import type {
    ImageClassificationPresetName,
    ImageClassificationRuntimeOptions,
    ImageClassificationServiceOptions,
    ImageInput,
    ObjectDetectionRuntimeOptions,
    ObjectDetectionServiceOptions,
    OrtModule,
    PaddleOptions,
    RecognitionOptions,
    TableStructureRecognitionPresetName,
    TableStructureRecognitionRuntimeOptions,
    TableStructureRecognitionServiceOptions,
} from "../interface.ts";
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
import type { RecognitionResult } from "../modules/text-recognition/service.ts";
import { PaddleOcrService } from "./ocr.ts";
import {
    recoverTableHtmlFromCells,
    type TableRecognitionV2Cell,
} from "./table-recognition-v2-recovery.ts";

export type TableRecognitionV2TableType = "wired" | "wireless";

export interface TableRecognitionV2ClassificationOptions
    extends Partial<ImageClassificationRuntimeOptions> {
    enabled?: boolean;
}

export interface TableRecognitionV2OcrOptions extends RecognitionOptions {
    enabled?: boolean;
}

export interface TableRecognitionV2RunOptions {
    tableType?: TableRecognitionV2TableType;
    tableClassification?: TableRecognitionV2ClassificationOptions;
    wiredTableStructure?: Partial<TableStructureRecognitionRuntimeOptions>;
    wirelessTableStructure?: Partial<TableStructureRecognitionRuntimeOptions>;
    wiredTableCellsDetection?: Partial<ObjectDetectionRuntimeOptions>;
    wirelessTableCellsDetection?: Partial<ObjectDetectionRuntimeOptions>;
    ocr?: TableRecognitionV2OcrOptions;
    useE2eWiredTableRecModel?: boolean;
    useE2eWirelessTableRecModel?: boolean;
    useWiredTableCellsTransToHtml?: boolean;
    useWirelessTableCellsTransToHtml?: boolean;
    useOcrResultsWithTableCells?: boolean;
}

export interface TableRecognitionV2ClassificationCreateOptions
    extends Partial<ImageClassificationServiceOptions> {
    preset?: ImageClassificationPresetName;
}

export interface TableRecognitionV2StructureCreateOptions
    extends Partial<TableStructureRecognitionServiceOptions> {
    preset?: TableStructureRecognitionPresetName;
}

export interface TableRecognitionV2CellsCreateOptions
    extends Partial<ObjectDetectionServiceOptions> {
    preset?: "RT-DETR-L_wired_table_cell_det" | "RT-DETR-L_wireless_table_cell_det";
}

export interface TableRecognitionV2CreateOptions {
    ort: OrtModule;
    tableClassification?: TableRecognitionV2ClassificationCreateOptions;
    wiredTableStructure?: TableRecognitionV2StructureCreateOptions;
    wirelessTableStructure?: TableRecognitionV2StructureCreateOptions;
    wiredTableCellsDetection?: TableRecognitionV2CellsCreateOptions;
    wirelessTableCellsDetection?: TableRecognitionV2CellsCreateOptions;
    ocr?: PaddleOptions;
    options?: TableRecognitionV2RunOptions;
}

export interface TableRecognitionV2Services {
    tableClassification?: {
        run(
            input: ImageInput,
            options?: Partial<ImageClassificationRuntimeOptions>
        ): Promise<ImageClassificationResult[]>;
    };
    wiredTableStructure?: {
        run(
            input: ImageInput,
            options?: Partial<TableStructureRecognitionRuntimeOptions>
        ): Promise<TableStructureRecognitionResult>;
    };
    wirelessTableStructure?: {
        run(
            input: ImageInput,
            options?: Partial<TableStructureRecognitionRuntimeOptions>
        ): Promise<TableStructureRecognitionResult>;
    };
    wiredTableCellsDetection?: {
        run(
            input: ImageInput,
            options?: Partial<ObjectDetectionRuntimeOptions>
        ): Promise<ObjectDetectionBox[]>;
    };
    wirelessTableCellsDetection?: {
        run(
            input: ImageInput,
            options?: Partial<ObjectDetectionRuntimeOptions>
        ): Promise<ObjectDetectionBox[]>;
    };
    ocr?: {
        recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
    };
}

export interface TableRecognitionV2Result {
    tableType: TableRecognitionV2TableType;
    classification?: ImageClassificationResult;
    structure?: TableStructureRecognitionResult;
    cellBoxes: ObjectDetectionBox[];
    cells: TableRecognitionV2Cell[];
    ocr?: RecognitionResult[];
    matched?: TableStructureOcrMatchResult;
    predHtml: string;
    cellBoxList: number[][];
    tableOcrPred?: {
        text: string[];
        confidence: number[];
    };
}

const DEFAULT_TABLE_RECOGNITION_V2_OPTIONS: TableRecognitionV2RunOptions = {
    tableClassification: { enabled: true },
    ocr: { enabled: true },
    useE2eWiredTableRecModel: false,
    useE2eWirelessTableRecModel: false,
    useWiredTableCellsTransToHtml: false,
    useWirelessTableCellsTransToHtml: false,
    useOcrResultsWithTableCells: true,
};

export class TableRecognitionV2Service {
    private readonly services: TableRecognitionV2Services;
    private readonly options: TableRecognitionV2RunOptions;

    constructor(
        services: TableRecognitionV2Services = {},
        options: TableRecognitionV2RunOptions = {}
    ) {
        this.services = { ...services };
        this.options = mergeTableRecognitionV2Options(
            DEFAULT_TABLE_RECOGNITION_V2_OPTIONS,
            options
        );
    }

    static async createInstance(
        options: TableRecognitionV2CreateOptions
    ): Promise<TableRecognitionV2Service> {
        if (!options.ort) {
            throw new Error(
                "TableRecognitionV2Service.createInstance requires the 'ort' option to be set."
            );
        }

        const services: TableRecognitionV2Services = {};
        if (options.tableClassification?.modelBuffer) {
            services.tableClassification = await createImageClassificationService(
                options.ort,
                options.tableClassification,
                "PP-LCNet_x1_0_table_cls"
            );
        }
        if (options.wiredTableStructure?.modelBuffer) {
            services.wiredTableStructure = await createTableStructureService(
                options.ort,
                options.wiredTableStructure,
                "SLANeXt_wired"
            );
        }
        if (options.wirelessTableStructure?.modelBuffer) {
            services.wirelessTableStructure = await createTableStructureService(
                options.ort,
                options.wirelessTableStructure,
                "SLANeXt_wireless"
            );
        }
        if (options.wiredTableCellsDetection?.modelBuffer) {
            services.wiredTableCellsDetection = await createObjectDetectionService(
                options.ort,
                options.wiredTableCellsDetection,
                "RT-DETR-L_wired_table_cell_det"
            );
        }
        if (options.wirelessTableCellsDetection?.modelBuffer) {
            services.wirelessTableCellsDetection = await createObjectDetectionService(
                options.ort,
                options.wirelessTableCellsDetection,
                "RT-DETR-L_wireless_table_cell_det"
            );
        }
        if (options.ocr?.detection?.modelBuffer || options.ocr?.recognition?.modelBuffer) {
            services.ocr = await PaddleOcrService.createInstance({
                ...options.ocr,
                ort: options.ort,
            });
        }

        if (Object.keys(services).length === 0) {
            throw new Error(
                "TableRecognitionV2Service.createInstance requires at least one modelBuffer for table classification, table structure, table cell detection, or OCR."
            );
        }

        return new TableRecognitionV2Service(services, options.options);
    }

    async run(
        input: ImageInput,
        options: TableRecognitionV2RunOptions = {}
    ): Promise<TableRecognitionV2Result> {
        const runtimeOptions = mergeTableRecognitionV2Options(this.options, options);
        const classification = await this.runTableClassification(input, runtimeOptions);
        const tableType = runtimeOptions.tableType ?? inferTableType(classification);
        const structure = await this.runTableStructure(input, tableType, runtimeOptions);
        const cellBoxes = await this.runTableCellsDetection(input, tableType, runtimeOptions);
        const ocr = await this.runOcr(input, runtimeOptions);
        const cellHtml = cellBoxes.length
            ? recoverTableHtmlFromCells(
                  cellBoxes,
                  runtimeOptions.useOcrResultsWithTableCells === false ? [] : (ocr ?? [])
              )
            : undefined;
        const matched =
            structure && ocr?.length && structure.bbox.length
                ? matchTableStructureToOcr(structure, ocr)
                : undefined;
        const predHtml = resolvePredHtml({
            tableType,
            structure,
            matched,
            cellHtml,
            options: runtimeOptions,
        });

        if (!predHtml) {
            throw new Error(
                `TableRecognitionV2Service could not produce predHtml for ${tableType} table. Configure table structure recognition or table cell detection.`
            );
        }

        return {
            tableType,
            classification,
            structure,
            cellBoxes,
            cells: cellHtml?.cells ?? [],
            ocr,
            matched,
            predHtml,
            cellBoxList: cellBoxes.map((box) => [...box.coordinate]),
            tableOcrPred: ocr
                ? {
                      text: ocr.map((item) => item.text),
                      confidence: ocr.map((item) => item.confidence),
                  }
                : undefined,
        };
    }

    private async runTableClassification(
        input: ImageInput,
        options: TableRecognitionV2RunOptions
    ): Promise<ImageClassificationResult | undefined> {
        if (options.tableType || options.tableClassification?.enabled === false) {
            return undefined;
        }
        if (!this.services.tableClassification) {
            return undefined;
        }
        const { enabled: _enabled, ...classificationOptions } = options.tableClassification ?? {};
        return (await this.services.tableClassification.run(input, classificationOptions))[0];
    }

    private async runTableStructure(
        input: ImageInput,
        tableType: TableRecognitionV2TableType,
        options: TableRecognitionV2RunOptions
    ): Promise<TableStructureRecognitionResult | undefined> {
        const service =
            tableType === "wired"
                ? this.services.wiredTableStructure
                : this.services.wirelessTableStructure;
        if (!service) {
            return undefined;
        }
        return service.run(
            input,
            tableType === "wired" ? options.wiredTableStructure : options.wirelessTableStructure
        );
    }

    private async runTableCellsDetection(
        input: ImageInput,
        tableType: TableRecognitionV2TableType,
        options: TableRecognitionV2RunOptions
    ): Promise<ObjectDetectionBox[]> {
        const service =
            tableType === "wired"
                ? this.services.wiredTableCellsDetection
                : this.services.wirelessTableCellsDetection;
        if (!service) {
            return [];
        }
        return service.run(
            input,
            tableType === "wired"
                ? options.wiredTableCellsDetection
                : options.wirelessTableCellsDetection
        );
    }

    private async runOcr(
        input: ImageInput,
        options: TableRecognitionV2RunOptions
    ): Promise<RecognitionResult[] | undefined> {
        if (options.ocr?.enabled === false || !this.services.ocr) {
            return undefined;
        }
        const { enabled: _enabled, ...ocrOptions } = options.ocr ?? {};
        return this.services.ocr.recognize(input, ocrOptions);
    }
}

async function createImageClassificationService(
    ort: OrtModule,
    options: TableRecognitionV2ClassificationCreateOptions,
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

async function createTableStructureService(
    ort: OrtModule,
    options: TableRecognitionV2StructureCreateOptions,
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

async function createObjectDetectionService(
    ort: OrtModule,
    options: TableRecognitionV2CellsCreateOptions,
    defaultPreset: "RT-DETR-L_wired_table_cell_det" | "RT-DETR-L_wireless_table_cell_det"
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

function mergeTableRecognitionV2Options(
    defaults: TableRecognitionV2RunOptions,
    options: TableRecognitionV2RunOptions
): TableRecognitionV2RunOptions {
    return {
        ...defaults,
        ...options,
        tableClassification: {
            ...defaults.tableClassification,
            ...options.tableClassification,
        },
        ocr: {
            ...defaults.ocr,
            ...options.ocr,
        },
    };
}

function inferTableType(
    classification: ImageClassificationResult | undefined
): TableRecognitionV2TableType {
    const label = classification?.label.toLowerCase();
    return label?.includes("wireless") ? "wireless" : "wired";
}

function resolvePredHtml(args: {
    tableType: TableRecognitionV2TableType;
    structure: TableStructureRecognitionResult | undefined;
    matched: TableStructureOcrMatchResult | undefined;
    cellHtml: ReturnType<typeof recoverTableHtmlFromCells> | undefined;
    options: TableRecognitionV2RunOptions;
}): string | undefined {
    const useCells =
        args.tableType === "wired"
            ? args.options.useWiredTableCellsTransToHtml
            : args.options.useWirelessTableCellsTransToHtml;
    const useE2e =
        args.tableType === "wired"
            ? args.options.useE2eWiredTableRecModel
            : args.options.useE2eWirelessTableRecModel;

    if (useCells && args.cellHtml) {
        return args.cellHtml.fullHtml;
    }
    if (useE2e && args.matched) {
        return args.matched.fullHtml;
    }
    if (useE2e && args.structure) {
        return args.structure.fullHtml;
    }
    if (args.matched) {
        return args.matched.fullHtml;
    }
    if (args.structure?.bbox.length || !args.cellHtml) {
        return args.structure?.fullHtml;
    }
    return args.cellHtml.fullHtml;
}
