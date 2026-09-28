import type { RecognitionResult } from "../modules/text-recognition/service.ts";
import type {
    TextLineOrientationClassifier,
    TextLineOrientationResult,
    TextLineOrientationRuntimeOptions,
    TextLineOrientationServiceOptions,
} from "./classification.ts";
import type { Box } from "./common.ts";
import type { OrtModule } from "./ort.ts";
import type { DetectionRuntimeOptions, DetectionServiceOptions } from "./text-detection.ts";
import type {
    RecognitionOrderingOptions,
    RecognitionRuntimeOptions,
    RecognitionServiceOptions,
} from "./text-recognition.ts";

export type PaddleOcrModelPresetName =
    | "PP-OCRv5"
    | "PP-OCRv5_mobile"
    | "PP-OCRv5_server"
    | "PP-OCRv6"
    | "PP-OCRv6_tiny"
    | "PP-OCRv6_small"
    | "PP-OCRv6_medium";

/**
 * Full configuration for the PaddleOCR service.
 * Combines model file paths with detection, recognition, and debugging parameters.
 */
export interface PaddleOptions {
    /**
     * onnxruntime module
     */
    ort?: OrtModule;

    /**
     * Built-in PaddleOCR model preset. Explicit detection/recognition options still win.
     */
    modelPreset?: PaddleOcrModelPresetName;

    /**
     * Controls parameters for text detection.
     */
    detection?: Partial<DetectionServiceOptions>;

    /**
     * Controls parameters for text recognition.
     */
    recognition?: Partial<RecognitionServiceOptions>;

    /**
     * Optional textline orientation classifier used between detection crop and recognition.
     * Mirrors PaddleOCR `use_angle_cls`; omitted by default to keep the core OCR path minimal.
     */
    textlineOrientation?: Partial<TextLineOrientationServiceOptions>;
}

/**
 * Options for each recognition task.
 */
export interface RecognitionOptions {
    charWhiteList?: string[];
    onProgress?: (event: PaddleOcrProgressEvent) => void;
    detection?: Partial<DetectionRuntimeOptions>;
    recognition?: Partial<RecognitionRuntimeOptions>;
    ordering?: Partial<RecognitionOrderingOptions>;
    textlineOrientation?: Partial<TextLineOrientationRuntimeOptions>;
    textlineOrientationClassifier?: TextLineOrientationClassifier;
}

export interface OcrProgress {
    current: number;
    remain: number;
    total: number;
}

export type PaddleOcrProgressEvent =
    | {
          type: "det";
          stage: "preprocess" | "infer" | "postprocess";
          progress: OcrProgress;
          detectedCount?: number;
      }
    | {
          type: "rec";
          stage: "start" | "item" | "complete";
          progress: OcrProgress;
          index?: number;
          box?: Box;
          result?: RecognitionResult;
          textlineOrientation?: TextLineOrientationResult;
      };
