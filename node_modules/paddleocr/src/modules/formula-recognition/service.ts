import { normalizeInputToRgb } from "../../core/input.ts";
import type {
    FormulaRecognitionRuntimeOptions,
    ImageInput,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
} from "../../interface.ts";
import { type FormulaRecognitionResult, postprocessFormulaRecognition } from "./postprocess.ts";
import {
    createFormulaRecognitionInputFeeds,
    type FormulaRecognitionResizeParams,
    preprocessFormulaRecognition,
} from "./preprocess.ts";

type RequiredFormulaRecognitionPreprocessOptions = Required<
    Pick<
        FormulaRecognitionRuntimeOptions,
        | "imageHeight"
        | "imageWidth"
        | "inputChannels"
        | "grayscaleMean"
        | "grayscaleStdDeviation"
        | "cropMarginThreshold"
        | "cropMarginMaxAspectRatio"
        | "imagePaddingValue"
        | "latexPaddingValue"
    >
>;

export interface FormulaRecognitionRawResult {
    outputs: Record<string, OrtTensor>;
    resizeParams: FormulaRecognitionResizeParams;
}

/**
 * Lightweight raw runner for PaddleOCR/PaddleX formula recognition modules.
 */
export class FormulaRecognitionService {
    private readonly options: Partial<FormulaRecognitionRuntimeOptions>;
    private readonly session: OrtInferenceSession;
    private readonly ortModule: OrtModule;

    constructor(
        ortModule: OrtModule,
        session: OrtInferenceSession,
        options: Partial<FormulaRecognitionRuntimeOptions> = {}
    ) {
        this.session = session;
        this.ortModule = ortModule;
        this.options = { ...options };
    }

    async runRaw(
        input: ImageInput,
        options: Partial<FormulaRecognitionRuntimeOptions> = {}
    ): Promise<FormulaRecognitionRawResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        const preprocessed = preprocessFormulaRecognition(
            normalizeInputToRgb(input),
            runtimeOptions
        );
        const outputs = await this.session.run(
            createFormulaRecognitionInputFeeds(
                this.ortModule,
                this.session,
                preprocessed,
                runtimeOptions
            )
        );

        if (Object.keys(outputs).length === 0) {
            throw new Error("Formula recognition session returned no output tensors.");
        }

        return {
            outputs,
            resizeParams: preprocessed.resizeParams,
        };
    }

    async run(
        input: ImageInput,
        options: Partial<FormulaRecognitionRuntimeOptions> = {}
    ): Promise<FormulaRecognitionResult> {
        const runtimeOptions = this.resolveRuntimeOptions(options);
        const preprocessed = preprocessFormulaRecognition(
            normalizeInputToRgb(input),
            runtimeOptions
        );
        const outputs = await this.session.run(
            createFormulaRecognitionInputFeeds(
                this.ortModule,
                this.session,
                preprocessed,
                runtimeOptions
            )
        );

        if (Object.keys(outputs).length === 0) {
            throw new Error("Formula recognition session returned no output tensors.");
        }

        return postprocessFormulaRecognition(outputs, runtimeOptions);
    }

    private resolveRuntimeOptions(
        options: Partial<FormulaRecognitionRuntimeOptions>
    ): RequiredFormulaRecognitionPreprocessOptions & Partial<FormulaRecognitionRuntimeOptions> {
        const runtimeOptions = {
            ...this.options,
            ...options,
        };

        return {
            imageHeight: this.requirePositiveInteger(runtimeOptions.imageHeight, "imageHeight"),
            imageWidth: this.requirePositiveInteger(runtimeOptions.imageWidth, "imageWidth"),
            inputChannels: this.requireInputChannels(runtimeOptions.inputChannels),
            grayscaleMean: this.requireFiniteNumber(runtimeOptions.grayscaleMean, "grayscaleMean"),
            grayscaleStdDeviation: this.requireNonZeroFiniteNumber(
                runtimeOptions.grayscaleStdDeviation,
                "grayscaleStdDeviation"
            ),
            cropMarginThreshold: this.requireFiniteNumber(
                runtimeOptions.cropMarginThreshold,
                "cropMarginThreshold"
            ),
            cropMarginMaxAspectRatio: this.requirePositiveNumber(
                runtimeOptions.cropMarginMaxAspectRatio,
                "cropMarginMaxAspectRatio"
            ),
            imagePaddingValue: this.requireFiniteNumber(
                runtimeOptions.imagePaddingValue,
                "imagePaddingValue"
            ),
            latexPaddingValue: this.requireFiniteNumber(
                runtimeOptions.latexPaddingValue,
                "latexPaddingValue"
            ),
            inputName: runtimeOptions.inputName,
            maxSequenceLength: runtimeOptions.maxSequenceLength,
            preprocessPipeline: runtimeOptions.preprocessPipeline,
            decoderName: runtimeOptions.decoderName,
            tokenizerType: runtimeOptions.tokenizerType,
            tokenizerPath: runtimeOptions.tokenizerPath,
            tokenizerVocabulary: runtimeOptions.tokenizerVocabulary,
            specialTokenIds: runtimeOptions.specialTokenIds,
        };
    }

    private requirePositiveInteger(value: unknown, name: string): number {
        if (!Number.isInteger(value) || (value as number) <= 0) {
            throw new Error(
                `Invalid formula recognition ${name}: ${value}. Expected a positive integer.`
            );
        }
        return value as number;
    }

    private requireInputChannels(value: unknown): number {
        if (value !== 1) {
            throw new Error(`Unsupported formula recognition inputChannels: ${value}. Expected 1.`);
        }
        return value;
    }

    private requireFiniteNumber(value: unknown, name: string): number {
        if (!Number.isFinite(value)) {
            throw new Error(
                `Invalid formula recognition ${name}: ${value}. Expected a finite number.`
            );
        }
        return value as number;
    }

    private requireNonZeroFiniteNumber(value: unknown, name: string): number {
        const numberValue = this.requireFiniteNumber(value, name);
        if (numberValue === 0) {
            throw new Error(
                `Invalid formula recognition ${name}: ${value}. Expected a non-zero finite number.`
            );
        }
        return numberValue;
    }

    private requirePositiveNumber(value: unknown, name: string): number {
        const numberValue = this.requireFiniteNumber(value, name);
        if (numberValue <= 0) {
            throw new Error(
                `Invalid formula recognition ${name}: ${value}. Expected a positive finite number.`
            );
        }
        return numberValue;
    }
}
