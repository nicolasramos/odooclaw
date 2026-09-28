import { normalizeInputToRgb } from "../../core/input.ts";
import type {
    ImageChannelOrder,
    ImageInput,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
    TableStructureRecognitionRuntimeOptions,
} from "../../interface.ts";
import { postprocessTableStructure, type TableStructureRecognitionResult } from "./postprocess.ts";
import {
    createTableStructureInputFeeds,
    preprocessTableStructure,
    type TableStructureResizeParams,
    type TableStructureTensorSpec,
} from "./preprocess.ts";

type RequiredTableStructurePreprocessOptions = Required<
    Pick<
        TableStructureRecognitionRuntimeOptions,
        "imageHeight" | "imageWidth" | "maxSideLength" | "mean" | "stdDeviation" | "channelOrder"
    >
>;

export interface TableStructureRecognitionRawResult {
    outputs: Record<string, OrtTensor>;
    resizeParams: TableStructureResizeParams;
    shape: TableStructureTensorSpec;
}

/**
 * Lightweight raw runner for PaddleOCR/PaddleX table-structure recognition modules.
 */
export class TableStructureRecognitionService {
    private readonly options: Partial<TableStructureRecognitionRuntimeOptions>;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<TableStructureRecognitionRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;
        this.options = { ...options };
    }

    async runRaw(
        input: ImageInput,
        options: Partial<TableStructureRecognitionRuntimeOptions> = {}
    ): Promise<TableStructureRecognitionRawResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        return this.runRawWithRuntimeOptions(input, runtimeOptions);
    }

    async run(
        input: ImageInput,
        options: Partial<TableStructureRecognitionRuntimeOptions> = {}
    ): Promise<TableStructureRecognitionResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        const raw = await this.runRawWithRuntimeOptions(input, runtimeOptions);
        return postprocessTableStructure(raw.outputs, raw.shape, runtimeOptions);
    }

    private async runRawWithRuntimeOptions(
        input: ImageInput,
        runtimeOptions: RequiredTableStructurePreprocessOptions &
            Partial<TableStructureRecognitionRuntimeOptions>
    ): Promise<TableStructureRecognitionRawResult> {
        const preprocessed = preprocessTableStructure(normalizeInputToRgb(input), runtimeOptions);
        const outputs = await this.session.run(
            createTableStructureInputFeeds(this.ortModule, this.session, preprocessed)
        );

        if (Object.keys(outputs).length === 0) {
            throw new Error("Table structure recognition session returned no output tensors.");
        }

        return {
            outputs,
            resizeParams: preprocessed.resizeParams,
            shape: preprocessed.shape,
        };
    }

    private resolveRuntimeOptions(
        options: Partial<TableStructureRecognitionRuntimeOptions>
    ): RequiredTableStructurePreprocessOptions & Partial<TableStructureRecognitionRuntimeOptions> {
        const runtimeOptions = {
            ...this.options,
            ...options,
        };

        return {
            imageHeight: this.requirePositiveInteger(runtimeOptions.imageHeight, "imageHeight"),
            imageWidth: this.requirePositiveInteger(runtimeOptions.imageWidth, "imageWidth"),
            maxSideLength: this.requirePositiveInteger(
                runtimeOptions.maxSideLength,
                "maxSideLength"
            ),
            mean: this.requireTriple(runtimeOptions.mean, "mean"),
            stdDeviation: this.requireTriple(runtimeOptions.stdDeviation, "stdDeviation"),
            channelOrder: this.requireChannelOrder(runtimeOptions.channelOrder),
            maxTextLength: runtimeOptions.maxTextLength,
            locRegNum: runtimeOptions.locRegNum,
            mergeNoSpanStructure: runtimeOptions.mergeNoSpanStructure,
            replaceEmptyCellToken: runtimeOptions.replaceEmptyCellToken,
            learnEmptyBox: runtimeOptions.learnEmptyBox,
            structureDictionary: runtimeOptions.structureDictionary,
            ignoreBboxes: runtimeOptions.ignoreBboxes,
        };
    }

    private requirePositiveInteger(value: unknown, name: string): number {
        if (!Number.isInteger(value) || (value as number) <= 0) {
            throw new Error(
                `Invalid table structure recognition ${name}: ${value}. Expected a positive integer.`
            );
        }
        return value as number;
    }

    private requireTriple(value: unknown, name: string): [number, number, number] {
        if (
            !Array.isArray(value) ||
            value.length !== 3 ||
            value.some((item) => !Number.isFinite(item))
        ) {
            throw new Error(
                `Invalid table structure recognition ${name}: ${String(value)}. Expected three finite numbers.`
            );
        }
        return [value[0], value[1], value[2]];
    }

    private requireChannelOrder(value: unknown): ImageChannelOrder {
        if (value !== "rgb" && value !== "bgr") {
            throw new Error(
                `Unsupported table structure recognition channelOrder: ${value}. Expected "rgb" or "bgr".`
            );
        }
        return value;
    }
}
