import type {
    DetectionRuntimeOptions,
    ImageClassificationRuntimeOptions,
    PaddleOptions,
    ProcessRecognitionOptions,
    RecognitionOrderingOptions,
    RecognitionRuntimeOptions,
    TextLineOrientationRuntimeOptions,
} from "./interface.ts";

type DetectionDefaults = Required<Omit<DetectionRuntimeOptions, "inputShape">> &
    Pick<DetectionRuntimeOptions, "inputShape">;
type ImageClassificationDefaults = Required<ImageClassificationRuntimeOptions>;
type RecognitionDefaults = Required<RecognitionRuntimeOptions>;
type RecognitionOrderingDefaults = Required<
    Pick<RecognitionOrderingOptions, "sameLinePixelThreshold" | "sortByReadingOrder">
>;
type ProcessRecognitionDefaults = Required<ProcessRecognitionOptions>;
type TextLineOrientationDefaults = Required<TextLineOrientationRuntimeOptions>;

export const DEFAULT_DETECTION_OPTIONS: DetectionDefaults = {
    padding: 0,
    mean: [0.485 * 255, 0.456 * 255, 0.406 * 255],
    stdDeviation: [1 / 0.229 / 255, 1 / 0.224 / 255, 1 / 0.225 / 255],
    channelOrder: "rgb",
    maxSideLength: 960,
    limitType: "max",
    maxSideLimit: 4000,
    textPixelThreshold: 0.3,
    boxScoreThreshold: 0.6,
    scoreMode: "fast",
    unclipRatio: 1.5,
    maxCandidates: 1000,
    minimumAreaThreshold: 20,
    paddingBoxVertical: 0.4,
    paddingBoxHorizontal: 0.6,
    dilationKernelSize: 0,
    boxType: "quad",
};

export const DEFAULT_RECOGNITION_OPTIONS: RecognitionDefaults = {
    mean: [127.5, 127.5, 127.5],
    stdDeviation: [1.0 / 127.5, 1.0 / 127.5, 1.0 / 127.5],
    channelOrder: "rgb",
    outputSelectionStrategy: "first",
    imageHeight: 48,
    imageWidth: 320,
    charactersDictionary: [],
    reverseText: false,
};

export const DEFAULT_IMAGE_CLASSIFICATION_OPTIONS: ImageClassificationDefaults = {
    mean: [0.485 * 255, 0.456 * 255, 0.406 * 255],
    stdDeviation: [1 / 0.229 / 255, 1 / 0.224 / 255, 1 / 0.225 / 255],
    channelOrder: "bgr",
    resizeMode: "stretch",
    resizeShort: 256,
    imageHeight: 224,
    imageWidth: 224,
    labels: [],
    topK: 1,
};

export const DEFAULT_TEXTLINE_ORIENTATION_OPTIONS: TextLineOrientationDefaults = {
    ...DEFAULT_IMAGE_CLASSIFICATION_OPTIONS,
    imageHeight: 80,
    imageWidth: 160,
    labels: ["0_degree", "180_degree"],
    topK: 1,
    threshold: 0.9,
    enabled: true,
};

export const DEFAULT_RECOGNITION_ORDERING_OPTIONS: RecognitionOrderingDefaults = {
    sortByReadingOrder: true,
    sameLinePixelThreshold: 10,
};

export const DEFAULT_PROCESS_RECOGNITION_OPTIONS: ProcessRecognitionDefaults = {
    recognitionScoreThreshold: 0.5,
    lineMergeThresholdRatio: 0.5,
};

export const DEFAULT_PADDLE_OPTIONS: Partial<PaddleOptions> = {
    detection: DEFAULT_DETECTION_OPTIONS,
    recognition: DEFAULT_RECOGNITION_OPTIONS,
};
