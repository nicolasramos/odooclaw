//#region src/types/common.d.ts
type ImageChannelOrder = "rgb" | "bgr";
interface ImageInput {
  width: number;
  height: number;
  data: Uint8Array;
}
/**
 * Simple rectangle representation.
 */
interface Box {
  /** X-coordinate of the top-left corner. */
  x: number;
  /** Y-coordinate of the top-left corner. */
  y: number;
  /** Width of the box in pixels. */
  width: number;
  /** Height of the box in pixels. */
  height: number;
  /** Optional four-point text box in clockwise order: top-left, top-right, bottom-right, bottom-left. */
  points?: [Point, Point, Point, Point];
  /** Optional arbitrary polygon, used by DBPostProcess `box_type: poly` modules such as seal text detection. */
  polygon?: Point[];
}
interface Point {
  x: number;
  y: number;
}
//#endregion
//#region src/types/classification.d.ts
type ClassificationResizeMode = "stretch" | "pad" | "resize-short-crop";
type ImageClassificationPresetName = "PP-LCNet_x1_0_doc_ori" | "PP-LCNet_x0_25_textline_ori" | "PP-LCNet_x1_0_textline_ori" | "PP-LCNet_x1_0_table_cls";
/**
 * Runtime parameters for generic image classification modules.
 */
interface ImageClassificationRuntimeOptions {
  /**
   * Fixed classifier input height.
   * @default 224
   */
  imageHeight?: number;
  /**
   * Fixed classifier input width.
   * @default 224
   */
  imageWidth?: number;
  /**
   * Per-channel mean values used to normalize input pixels [R, G, B].
   * @default [123.675, 116.28, 103.53]
   */
  mean?: [number, number, number];
  /**
   * Per-channel standard deviation values used to normalize input pixels [R, G, B].
   * @default [0.017124753831663668, 0.01750700280112045, 0.015378700499807768]
   */
  stdDeviation?: [number, number, number];
  /**
   * Channel order sent to the model after RGB input normalization.
   * @default "bgr"
   */
  channelOrder?: ImageChannelOrder;
  /**
   * Image resize mode before classification.
   * `pad` keeps aspect ratio, resizes to fixed height, and pads right-side pixels with zero.
   * `resize-short-crop` resizes the short side first, then center-crops to imageWidth x imageHeight.
   * @default "stretch"
   */
  resizeMode?: ClassificationResizeMode;
  /**
   * Short-side length used by `resize-short-crop` classification preprocessing.
   * @default 256
   */
  resizeShort?: number;
  /**
   * Labels indexed by classifier class id.
   */
  labels?: string[];
  /**
   * Number of sorted classification results to return.
   * @default 1
   */
  topK?: number;
}
/**
 * Parameters for an image classification service.
 */
interface ImageClassificationServiceOptions extends ImageClassificationRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for image classification.
   */
  modelBuffer?: ArrayBuffer;
}
interface TextLineOrientationResult {
  classId: number;
  label: string;
  score: number;
  rotated: boolean;
}
interface TextLineOrientationRuntimeOptions extends ImageClassificationRuntimeOptions {
  /**
   * Whether to run textline orientation correction before recognition.
   * @default true when a textline orientation model is configured
   */
  enabled?: boolean;
  /**
   * Minimum score required before rotating a crop predicted as 180 degrees.
   * Mirrors PaddleOCR `cls_thresh`.
   * @default 0.9
   */
  threshold?: number;
}
interface TextLineOrientationServiceOptions extends TextLineOrientationRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for textline orientation classification.
   */
  modelBuffer?: ArrayBuffer;
}
interface TextLineOrientationClassifier {
  run(input: ImageInput, options?: Partial<ImageClassificationRuntimeOptions>): Promise<Array<{
    classId: number;
    label: string;
    score: number;
  }>>;
}
//#endregion
//#region src/types/formula-recognition.d.ts
type FormulaRecognitionPresetName = "PP-FormulaNet-S" | "PP-FormulaNet-L" | "PP-FormulaNet_plus-S" | "PP-FormulaNet_plus-M" | "PP-FormulaNet_plus-L";
interface FormulaRecognitionRuntimeOptions {
  /**
   * Fixed formula recognizer input height.
   */
  imageHeight?: number;
  /**
   * Fixed formula recognizer input width.
   */
  imageWidth?: number;
  /**
   * Number of input channels after formula preprocessing.
   */
  inputChannels?: number;
  /**
   * Mean used by UniMERNet grayscale normalization after scaling pixels to [0, 1].
   */
  grayscaleMean?: number;
  /**
   * Standard deviation used by UniMERNet grayscale normalization after scaling pixels to [0, 1].
   */
  grayscaleStdDeviation?: number;
  /**
   * Foreground threshold used by UniMERNet crop-margin normalization.
   */
  cropMarginThreshold?: number;
  /**
   * Maximum accepted crop-margin aspect ratio. More extreme boxes keep the original image.
   */
  cropMarginMaxAspectRatio?: number;
  /**
   * Pixel value used when UniMERNet centers the resized RGB image in the fixed canvas.
   */
  imagePaddingValue?: number;
  /**
   * Tensor value used by LatexImageFormat when padding normalized images to multiples of 16.
   */
  latexPaddingValue?: number;
  /**
   * Default ONNX/Paddle input name used by the exported formula model.
   */
  inputName?: string;
  /**
   * Maximum number of generated formula tokens.
   */
  maxSequenceLength?: number;
  /**
   * Formula preprocessing pipeline name from the official model package.
   */
  preprocessPipeline?: string[];
  /**
   * Postprocess decoder name from the official model package.
   */
  decoderName?: string;
  /**
   * Tokenizer implementation required by the decoder.
   */
  tokenizerType?: string;
  /**
   * Tokenizer asset directory or files required by the decoder.
   */
  tokenizerPath?: string;
  /**
   * Token text indexed by token id, usually derived from the official Nougat tokenizer.json.
   * The runtime intentionally does not bundle the 50k-token vocabulary.
   */
  tokenizerVocabulary?: readonly string[];
  /**
   * Special token ids used by UniMERNet/Nougat-style formula decoding.
   */
  specialTokenIds?: {
    bos: number;
    pad: number;
    eos: number;
    unk: number;
    additional?: readonly number[];
  };
}
/**
 * Parameters for a formula recognition service.
 */
interface FormulaRecognitionServiceOptions extends FormulaRecognitionRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for formula recognition.
   */
  modelBuffer?: ArrayBuffer;
}
//#endregion
//#region src/types/object-detection.d.ts
type ObjectDetectionInputName = "image" | "im_shape" | "scale_factor";
type ObjectDetectionPresetName = "PP-DocLayout_plus-L" | "PP-DocLayout-L" | "PP-DocLayout-M" | "PP-DocLayout-S" | "PP-DocBlockLayout" | "RT-DETR-L_wired_table_cell_det" | "RT-DETR-L_wireless_table_cell_det";
type ObjectDetectionMergeMode = "large" | "small" | "union";
type ObjectDetectionOutputLayout = "class-score-xyxy" | "score-class-xyxy";
interface ObjectDetectionRuntimeOptions {
  /**
   * Fixed object detector input height.
   */
  imageHeight?: number;
  /**
   * Fixed object detector input width.
   */
  imageWidth?: number;
  /**
   * Per-channel mean values used to normalize input pixels [R, G, B].
   */
  mean?: [number, number, number];
  /**
   * Per-channel standard deviation values used to normalize input pixels [R, G, B].
   */
  stdDeviation?: [number, number, number];
  /**
   * Channel order sent to the model after RGB input normalization.
   */
  channelOrder?: ImageChannelOrder;
  /**
   * Official input tensors required by the exported object detection model.
   */
  requiredInputNames?: readonly ObjectDetectionInputName[];
  /**
   * Score threshold for filtering object boxes.
   */
  threshold?: number | readonly number[] | Record<number, number>;
  /**
   * Column layout for 6-value object detection rows.
   * PaddleDetection/PaddleX exported detectors commonly use `[classId, score, xmin, ymin, xmax, ymax]`.
   */
  outputLayout?: ObjectDetectionOutputLayout;
  /**
   * Whether to use layout-aware NMS for layout detection models.
   */
  layoutNms?: boolean;
  /**
   * Layout box expansion ratio. Object detection table-cell presets do not use this by default.
   */
  layoutUnclipRatio?: number | [number, number] | Record<number, [number, number]>;
  /**
   * Layout box merge mode for overlapping boxes.
   */
  layoutMergeBboxesMode?: ObjectDetectionMergeMode | Record<number, ObjectDetectionMergeMode>;
  /**
   * Labels indexed by detector class id.
   */
  labels?: string[];
}
/**
 * Parameters for an object detection service.
 */
interface ObjectDetectionServiceOptions extends ObjectDetectionRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for object detection.
   */
  modelBuffer?: ArrayBuffer;
}
//#endregion
//#region src/core/image.d.ts
interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface ResizeOptions {
  width?: number;
  height?: number;
  filter?: "bilinear" | "triangle";
}
interface PaddingOptions {
  padding?: number;
  vertical?: number;
  horizontal?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  color?: number[];
}
interface TensorOptions {
  mean_values: [number, number, number];
  norm_values: [number, number, number];
  channel_order?: ImageChannelOrder;
}
interface DilateOptions {
  norm?: "LInf";
  k?: number;
}
interface ThresholdOptions {
  threshold?: number;
}
interface ContoursOptions {
  minArea?: number;
}
interface RectOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  lineWidth?: number;
  color?: number[];
}
declare class Image {
  width: number;
  height: number;
  data: Uint8Array;
  depth: 8;
  channels: number;
  /**
   * 创建一个新的 Image 实例。
   * @param width 图像的宽度
   * @param height 图像的高度
   * @param data 图像数据，Uint8Array
   */
  constructor(width: number, height: number, channels: number, data: Uint8Array);
  /**
   * 裁剪
   */
  crop(options: CropOptions): Image;
  cropRotated(points: [Point, Point, Point, Point]): Image;
  rotate180(): Image;
  rotateClockwise(): Image;
  /**
   * 将图片缩放到指定的尺寸w
   * @param options
   */
  resize(options: ResizeOptions): Image;
  private resizeBilinear;
  private resizeTriangle;
  /**
   * 为图片添加指定颜色的边距，默认为透明的
   * @param options
   */
  padding(options: PaddingOptions): Image;
  /**
   * 将当前图像转换为张量格式，以便输入到onnx模型
   * @param options
   */
  tensor(options: TensorOptions): Float32Array;
  /**
   * 灰度图阈值方法，大于阈值的像素点设为255，小于等于阈值的设为0
   * @param options
   */
  threshold(options: ThresholdOptions): Image;
  /**
   * 膨胀操作，使用指定的范数和核大小
   * 进行处理的图片像素是0和255，膨胀255的像素点
   * 返回一个新的图片
   * @param options
   */
  dilate(options?: DilateOptions): Image;
  /**
   * 获取图像中的轮廓
   * @returns
   */
  contours(options?: ContoursOptions): Box[];
  /**
   * 在图像上绘制矩形，支持线宽
   * @param x 左上角x
   * @param y 左上角y
   * @param width 矩形宽度
   * @param height 矩形高度
   * @param color 颜色 [r,g,b,a]
   * @param lineWidth 线宽
   */
  rect(options: RectOptions): void;
  rotateCounterClockwise(): Image;
  private sampleCubicPixel;
}
//#endregion
//#region src/modules/text-recognition/service.d.ts
interface RecognitionResult {
  text: string;
  box: Box;
  confidence: number;
  textlineOrientation?: TextLineOrientationResult;
}
/**
 * Service for detecting and recognizing text in images
 */
declare class RecognitionService {
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<RecognitionRuntimeOptions>);
  /**
   * Main method to run text recognition on an image with detected regions
   * @param image The original image buffer or image in Canvas
   * @param detection Array of bounding boxes from text detection
   * @returns Array of recognition results with text and bounding box, sorted in reading order
   */
  run(image: Image, detection: Box[], options?: RecognitionOptions): Promise<RecognitionResult[]>;
  private resolveRuntimeOptions;
  private resolveOrderingOptions;
  /**
   * Process a single text box
   */
  private processBox;
  private correctTextlineOrientation;
  private calculateBatchMaxWhRatio;
  private calculateBoxWhRatio;
  private distance;
  private padRecognitionTensor;
  /**
   * Sort recognition results by reading order (top to bottom, left to right)
   */
  private sortBoxesByReadingOrder;
  private getBoxTopLeft;
  private resolveSameLineThreshold;
  private createProgress;
  /**
   * Runs the ONNX inference session with the prepared tensor
   */
  private runInference;
  private selectOutputTensor;
  private ctcLabelDecode;
}
//#endregion
//#region src/types/ort.d.ts
interface OrtTensor {
  data: unknown;
  dims: readonly number[];
}
interface OrtTensorMetadata {
  shape?: readonly (number | string | null | undefined)[];
}
interface OrtInferenceSession {
  inputNames?: readonly string[];
  inputMetadata?: readonly OrtTensorMetadata[];
  outputNames: readonly string[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
  release?(): Promise<void>;
}
interface OrtTensorConstructor {
  new (type: string, data: Float32Array, dims: readonly number[]): OrtTensor;
}
interface OrtInferenceSessionConstructor {
  create(modelBuffer: ArrayBuffer): Promise<OrtInferenceSession>;
}
interface OrtModule {
  Tensor: OrtTensorConstructor;
  InferenceSession: OrtInferenceSessionConstructor;
}
//#endregion
//#region src/types/text-detection.d.ts
type TextDetectionPresetName = "PP-OCRv6_tiny_det" | "PP-OCRv6_small_det" | "PP-OCRv6_medium_det" | "PP-OCRv4_mobile_seal_det" | "PP-OCRv4_server_seal_det";
/**
 * Runtime parameters for text detection.
 */
interface DetectionRuntimeOptions {
  padding?: number;
  /**
   * Per-channel mean values used to normalize input pixels [R, G, B].
   * @default [123.675, 116.28, 103.53]
   */
  mean?: [number, number, number];
  /**
   * Per-channel standard deviation values used to normalize input pixels [R, G, B].
   * @default [0.017124753831663668, 0.01750700280112045, 0.015378700499807768]
   */
  stdDeviation?: [number, number, number];
  /**
   * Channel order sent to the model after RGB input normalization.
   * @default "rgb"
   */
  channelOrder?: ImageChannelOrder;
  /**
   * Fixed model input shape `[C, H, W]`. When set, detection preprocessing resizes directly to H x W.
   * Mirrors PaddleOCR text detection `input_shape`.
   */
  inputShape?: [number, number, number];
  /**
   * Side length used by detection resize. Its meaning depends on `limitType`.
   * @default 960
   */
  maxSideLength?: number;
  /**
   * Resize strategy used before text detection, mirroring PaddleOCR DetResizeForTest `limit_type`.
   * `max` scales down when the long side exceeds maxSideLength.
   * `min` scales up when the short side is below maxSideLength.
   * `resize_long` always scales the long side to maxSideLength.
   * @default "max"
   */
  limitType?: "max" | "min" | "resize_long";
  /**
   * Upper bound for resized detection image dimensions, mirroring PaddleOCR `max_side_limit`.
   * @default 4000
   */
  maxSideLimit?: number;
  /**
   * Padding applied to each detected box vertically as a fraction of its height.
   * @default 0.4
   */
  paddingBoxVertical?: number;
  /**
   * Padding applied to each detected box horizontally as a fraction of its height.
   * @default 0.6
   */
  paddingBoxHorizontal?: number;
  /**
   * Remove detected boxes with area below this threshold, in pixels.
   * @default 20
   */
  minimumAreaThreshold?: number;
  textPixelThreshold?: number;
  /**
   * Remove detected boxes whose average model score is below this threshold.
   * Mirrors PaddleOCR DBPostProcess `box_thresh`.
   * @default 0.6
   */
  boxScoreThreshold?: number;
  /**
   * Score mode used by DBPostProcess. PaddleOCR's quad path can score the mini box (`fast`) or
   * the original contour (`slow`).
   * @default "fast"
   */
  scoreMode?: "fast" | "slow";
  /**
   * Expansion ratio used by DB-style box unclipping.
   * @default 1.5
   */
  unclipRatio?: number;
  /**
   * Maximum number of candidate components considered during detection post-processing.
   * @default 1000
   */
  maxCandidates?: number;
  /**
   * Square kernel size used in detection dilation post-processing. PaddleOCR DBPostProcess
   * uses a 2x2 kernel when `use_dilation` is enabled.
   * @default 0
   */
  dilationKernelSize?: number;
  /**
   * DB postprocess output shape. PaddleOCR uses `poly` for seal text detection and `quad` for
   * the general OCR text detector by default.
   * @default "quad"
   */
  boxType?: "quad" | "poly";
}
/**
 * Parameters for the text detection service.
 */
interface DetectionServiceOptions extends DetectionRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for text detection.
   */
  modelBuffer?: ArrayBuffer;
}
//#endregion
//#region src/types/text-recognition.d.ts
type RecognitionOutputSelectionStrategy = "first" | "ctc-logits";
type TextRecognitionPresetName = "PP-OCRv5_mobile_rec" | "PP-OCRv5_server_rec" | "PP-OCRv6_tiny_rec" | "PP-OCRv6_small_rec" | "PP-OCRv6_medium_rec";
/**
 * Runtime parameters for text recognition.
 */
interface RecognitionRuntimeOptions {
  /**
   * Fixed height for input images, in pixels.
   * Models will resize width proportionally.
   * @default 48
   */
  imageHeight?: number;
  /**
   * Minimum padded width for recognition input images, in pixels.
   * Wider text crops may expand this width to preserve aspect ratio, matching PaddleOCR's max_wh_ratio behavior.
   * @default 320
   */
  imageWidth?: number;
  /**
   * Per-channel mean values used to normalize input pixels [R, G, B].
   * @default [127.5, 127.5, 127.5]
   */
  mean?: [number, number, number];
  /**
   * Per-channel standard deviation values used to normalize input pixels [R, G, B].
   * @default [0.00784313725490196, 0.00784313725490196, 0.00784313725490196]
   */
  stdDeviation?: [number, number, number];
  /**
   * Channel order sent to the model after RGB input normalization.
   * @default "rgb"
   */
  channelOrder?: ImageChannelOrder;
  /**
   * Strategy used when recognition models expose multiple ONNX outputs.
   * `ctc-logits` selects the first 3D float tensor shaped like [N, T, C].
   * @default "first"
   */
  outputSelectionStrategy?: RecognitionOutputSelectionStrategy;
  /**
   * A list of loaded character dictionary (string) for
   * recognition result decoding.
   */
  charactersDictionary?: string[];
  /**
   * Reverse decoded CTC text with PaddleOCR's Arabic/right-to-left grouping rule.
   * PaddleOCR enables this automatically when the dictionary path contains `arabic`; this
   * runtime receives dictionaries as arrays, so callers enable it explicitly.
   * @default false
   */
  reverseText?: boolean;
}
/**
 * Parameters for the text recognition service.
 */
interface RecognitionServiceOptions extends RecognitionRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for text recognition.
   */
  modelBuffer?: ArrayBuffer;
}
/**
 * Parameters for sorting detection boxes into reading order.
 */
interface RecognitionOrderingOptions {
  /**
   * Whether recognition results should be sorted in reading order.
   * @default true
   */
  sortByReadingOrder?: boolean;
  /**
   * Pixel threshold used to decide whether two boxes are on the same line, matching PaddleOCR `sorted_boxes`.
   * Ignored when `sameLineThresholdRatio` is provided.
   * @default 10
   */
  sameLinePixelThreshold?: number;
  /**
   * Threshold ratio used to decide whether two boxes are on the same line.
   * The threshold is `(boxA.height + boxB.height) * sameLineThresholdRatio`.
   * When omitted, the official 10px `sameLinePixelThreshold` is used.
   */
  sameLineThresholdRatio?: number;
}
/**
 * Parameters for post-processing recognition results into lines.
 */
interface ProcessRecognitionOptions {
  /**
   * Recognition score threshold used before line grouping.
   * Mirrors PaddleOCR `drop_score` / `text_rec_score_thresh`.
   * @default 0.5
   */
  recognitionScoreThreshold?: number;
  /**
   * Threshold ratio used to merge results into the same line.
   * The threshold is `averageLineHeight * lineMergeThresholdRatio`.
   * @default 0.5
   */
  lineMergeThresholdRatio?: number;
}
//#endregion
//#region src/types/ocr.d.ts
type PaddleOcrModelPresetName = "PP-OCRv5" | "PP-OCRv5_mobile" | "PP-OCRv5_server" | "PP-OCRv6" | "PP-OCRv6_tiny" | "PP-OCRv6_small" | "PP-OCRv6_medium";
/**
 * Full configuration for the PaddleOCR service.
 * Combines model file paths with detection, recognition, and debugging parameters.
 */
interface PaddleOptions {
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
interface RecognitionOptions {
  charWhiteList?: string[];
  onProgress?: (event: PaddleOcrProgressEvent) => void;
  detection?: Partial<DetectionRuntimeOptions>;
  recognition?: Partial<RecognitionRuntimeOptions>;
  ordering?: Partial<RecognitionOrderingOptions>;
  textlineOrientation?: Partial<TextLineOrientationRuntimeOptions>;
  textlineOrientationClassifier?: TextLineOrientationClassifier;
}
interface OcrProgress {
  current: number;
  remain: number;
  total: number;
}
type PaddleOcrProgressEvent = {
  type: "det";
  stage: "preprocess" | "infer" | "postprocess";
  progress: OcrProgress;
  detectedCount?: number;
} | {
  type: "rec";
  stage: "start" | "item" | "complete";
  progress: OcrProgress;
  index?: number;
  box?: Box;
  result?: RecognitionResult;
  textlineOrientation?: TextLineOrientationResult;
};
//#endregion
//#region src/types/table-structure.d.ts
type TableStructureRecognitionPresetName = "SLANet" | "SLANeXt_wired" | "SLANeXt_wireless";
interface TableStructureRecognitionRuntimeOptions {
  /**
   * Padded table-structure model input height.
   */
  imageHeight?: number;
  /**
   * Padded table-structure model input width.
   */
  imageWidth?: number;
  /**
   * Long-side resize target before padding.
   */
  maxSideLength?: number;
  /**
   * Per-channel mean values used to normalize input pixels [R, G, B].
   */
  mean?: [number, number, number];
  /**
   * Per-channel standard deviation values used to normalize input pixels [R, G, B].
   */
  stdDeviation?: [number, number, number];
  /**
   * Channel order sent to the model after RGB input normalization.
   */
  channelOrder?: ImageChannelOrder;
  /**
   * Maximum decoded structure sequence length.
   */
  maxTextLength?: number;
  /**
   * Number of coordinates regressed for each table cell box.
   */
  locRegNum?: number;
  /**
   * Whether PaddleOCR TableLabelDecode merges no-span td structures.
   */
  mergeNoSpanStructure?: boolean;
  /**
   * Whether empty-cell tokens are replaced during table label encoding.
   */
  replaceEmptyCellToken?: boolean;
  /**
   * Whether the table label encoder learns empty boxes.
   */
  learnEmptyBox?: boolean;
  /**
   * Raw structure tokens exported by the model package before TableLabelDecode merge and sos/eos markers.
   */
  structureDictionary?: string[];
  /**
   * Skip decoded cell boxes when the official model marks loc_preds as invalid.
   */
  ignoreBboxes?: boolean;
}
/**
 * Parameters for a table structure recognition service.
 */
interface TableStructureRecognitionServiceOptions extends TableStructureRecognitionRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for table structure recognition.
   */
  modelBuffer?: ArrayBuffer;
}
//#endregion
//#region src/types/text-image-unwarping.d.ts
type TextImageUnwarpingPresetName = "UVDoc";
interface TextImageUnwarpingRuntimeOptions {
  /**
   * Default ONNX/Paddle input name used by the exported image unwarping model.
   */
  inputName?: string;
  /**
   * Per-channel mean values used to normalize input pixels [R, G, B].
   */
  mean?: [number, number, number];
  /**
   * Per-channel standard deviation values used to normalize input pixels [R, G, B].
   */
  stdDeviation?: [number, number, number];
  /**
   * Channel order sent to the model after RGB input normalization.
   */
  channelOrder?: ImageChannelOrder;
  /**
   * Preprocessing pipeline names from the official model package.
   */
  preprocessPipeline?: string[];
  /**
   * Postprocess operator name from the official model package.
   */
  postprocessName?: string;
  /**
   * Multiplier applied to image-to-image model outputs before uint8 conversion.
   */
  outputScale?: number;
  /**
   * Channel order produced by the model output before conversion to caller-facing RGB pixels.
   */
  outputChannelOrder?: ImageChannelOrder;
  /**
   * Result field used by PaddleOCR wrappers for the corrected image.
   */
  resultImageKey?: string;
  /**
   * Dynamic NCHW input shapes advertised by the official inference package.
   */
  dynamicInputShape?: {
    min: [number, number, number, number];
    opt: [number, number, number, number];
    max: [number, number, number, number];
  };
}
/**
 * Parameters for a text image unwarping service.
 */
interface TextImageUnwarpingServiceOptions extends TextImageUnwarpingRuntimeOptions {
  /**
   * ArrayBuffer containing the ONNX model for text image unwarping.
   */
  modelBuffer?: ArrayBuffer;
}
//#endregion
//#region src/constants.d.ts
type DetectionDefaults = Required<Omit<DetectionRuntimeOptions, "inputShape">> & Pick<DetectionRuntimeOptions, "inputShape">;
type ImageClassificationDefaults = Required<ImageClassificationRuntimeOptions>;
type RecognitionDefaults = Required<RecognitionRuntimeOptions>;
type RecognitionOrderingDefaults = Required<Pick<RecognitionOrderingOptions, "sameLinePixelThreshold" | "sortByReadingOrder">>;
type ProcessRecognitionDefaults = Required<ProcessRecognitionOptions>;
type TextLineOrientationDefaults = Required<TextLineOrientationRuntimeOptions>;
declare const DEFAULT_DETECTION_OPTIONS: DetectionDefaults;
declare const DEFAULT_RECOGNITION_OPTIONS: RecognitionDefaults;
declare const DEFAULT_IMAGE_CLASSIFICATION_OPTIONS: ImageClassificationDefaults;
declare const DEFAULT_TEXTLINE_ORIENTATION_OPTIONS: TextLineOrientationDefaults;
declare const DEFAULT_RECOGNITION_ORDERING_OPTIONS: RecognitionOrderingDefaults;
declare const DEFAULT_PROCESS_RECOGNITION_OPTIONS: ProcessRecognitionDefaults;
declare const DEFAULT_PADDLE_OPTIONS: Partial<PaddleOptions>;
//#endregion
//#region src/core/input.d.ts
declare function normalizeInputToRgb(input: ImageInput): Image;
//#endregion
//#region src/modules/formula-recognition/postprocess.d.ts
interface FormulaRecognitionResult {
  formula: string;
  tokenIds: number[];
  tokens: string[];
}
type FormulaRecognitionPostprocessOptions = Pick<FormulaRecognitionRuntimeOptions, "tokenizerVocabulary" | "specialTokenIds" | "maxSequenceLength">;
declare function postprocessFormulaRecognition(outputs: Record<string, OrtTensor>, options: FormulaRecognitionPostprocessOptions): FormulaRecognitionResult;
declare function createFormulaTokenizerVocabulary(tokenizerJson: unknown): string[];
//#endregion
//#region src/modules/formula-recognition/preprocess.d.ts
interface FormulaRecognitionResizeParams {
  srcWidth: number;
  srcHeight: number;
  croppedX: number;
  croppedY: number;
  croppedWidth: number;
  croppedHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  imagePaddedWidth: number;
  imagePaddedHeight: number;
  tensorPaddedWidth: number;
  tensorPaddedHeight: number;
  paddingLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
}
interface FormulaRecognitionTensorSpec {
  data: Float32Array;
  dims: readonly number[];
}
interface PreprocessFormulaRecognitionResult {
  image: FormulaRecognitionTensorSpec;
  resizeParams: FormulaRecognitionResizeParams;
}
interface RequiredFormulaRecognitionPreprocessOptions {
  imageHeight: number;
  imageWidth: number;
  inputChannels: number;
  grayscaleMean: number;
  grayscaleStdDeviation: number;
  cropMarginThreshold: number;
  cropMarginMaxAspectRatio: number;
  imagePaddingValue: number;
  latexPaddingValue: number;
}
interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
declare function preprocessFormulaRecognition(image: Image, runtimeOptions: RequiredFormulaRecognitionPreprocessOptions): PreprocessFormulaRecognitionResult;
declare function createFormulaRecognitionInputFeeds(ortModule: OrtModule, session: OrtInferenceSession, input: PreprocessFormulaRecognitionResult, runtimeOptions?: Pick<FormulaRecognitionRuntimeOptions, "inputName">): Record<string, OrtTensor>;
declare function calculateFormulaCropBox(image: Image, runtimeOptions: Pick<FormulaRecognitionRuntimeOptions, "cropMarginThreshold" | "cropMarginMaxAspectRatio">): CropBox;
//#endregion
//#region src/modules/formula-recognition/preset.d.ts
type FormulaRecognitionModule = "formula_recognition";
type FormulaRecognitionArchitecture = "PP-FormulaNet";
interface FormulaRecognitionPreset {
  name: FormulaRecognitionPresetName;
  module: FormulaRecognitionModule;
  architecture: FormulaRecognitionArchitecture;
  options: Partial<FormulaRecognitionRuntimeOptions>;
}
declare const FORMULA_RECOGNITION_PRESETS: Record<FormulaRecognitionPresetName, FormulaRecognitionPreset>;
declare function getFormulaRecognitionPreset(name: FormulaRecognitionPresetName): FormulaRecognitionPreset;
declare function getFormulaRecognitionPresetOptions(name?: FormulaRecognitionPresetName): Partial<FormulaRecognitionRuntimeOptions>;
//#endregion
//#region src/modules/formula-recognition/service.d.ts
interface FormulaRecognitionRawResult {
  outputs: Record<string, OrtTensor>;
  resizeParams: FormulaRecognitionResizeParams;
}
/**
 * Lightweight raw runner for PaddleOCR/PaddleX formula recognition modules.
 */
declare class FormulaRecognitionService {
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<FormulaRecognitionRuntimeOptions>);
  runRaw(input: ImageInput, options?: Partial<FormulaRecognitionRuntimeOptions>): Promise<FormulaRecognitionRawResult>;
  run(input: ImageInput, options?: Partial<FormulaRecognitionRuntimeOptions>): Promise<FormulaRecognitionResult>;
  private resolveRuntimeOptions;
  private requirePositiveInteger;
  private requireInputChannels;
  private requireFiniteNumber;
  private requireNonZeroFiniteNumber;
  private requirePositiveNumber;
}
//#endregion
//#region src/modules/image-classification/preset.d.ts
interface ImageClassificationPreset {
  name: ImageClassificationPresetName;
  module: "doc_image_orientation_classification" | "textline_orientation_classification" | "table_classification";
  options: Partial<ImageClassificationRuntimeOptions>;
}
declare const IMAGE_CLASSIFICATION_PRESETS: Record<ImageClassificationPresetName, ImageClassificationPreset>;
declare function getImageClassificationPreset(name: ImageClassificationPresetName): ImageClassificationPreset;
declare function getImageClassificationPresetOptions(name?: ImageClassificationPresetName): Partial<ImageClassificationRuntimeOptions>;
//#endregion
//#region src/modules/image-classification/service.d.ts
interface ImageClassificationResult {
  classId: number;
  label: string;
  score: number;
}
/**
 * Lightweight generic service for PaddleOCR image classification modules.
 */
declare class ImageClassificationService {
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<ImageClassificationRuntimeOptions>);
  run(input: ImageInput, options?: Partial<ImageClassificationRuntimeOptions>): Promise<ImageClassificationResult[]>;
  private resolveRuntimeOptions;
  private resolveFixedInputShape;
  private preprocessImage;
  private resizeShortAndCenterCrop;
  private validateRuntimeOptions;
  private runInference;
  private extractScores;
}
//#endregion
//#region src/modules/object-detection/postprocess.d.ts
interface ObjectDetectionBox {
  classId: number;
  label: string;
  score: number;
  coordinate: [number, number, number, number];
}
type ObjectDetectionPostprocessOptions = Pick<ObjectDetectionRuntimeOptions, "labels" | "threshold" | "outputLayout" | "layoutNms" | "layoutUnclipRatio" | "layoutMergeBboxesMode">;
declare function postprocessObjectDetection(outputs: Record<string, OrtTensor>, options?: ObjectDetectionPostprocessOptions): ObjectDetectionBox[];
//#endregion
//#region src/modules/object-detection/preset.d.ts
type ObjectDetectionModule = "layout_detection" | "table_cells_detection";
type ObjectDetectionArchitecture = "DETR" | "GFL";
interface ObjectDetectionPreset {
  name: ObjectDetectionPresetName;
  module: ObjectDetectionModule;
  architecture: ObjectDetectionArchitecture;
  requiredInputNames: readonly ObjectDetectionInputName[];
  options: Partial<ObjectDetectionRuntimeOptions>;
}
declare const OBJECT_DETECTION_PRESETS: Record<ObjectDetectionPresetName, ObjectDetectionPreset>;
declare function getObjectDetectionPreset(name: ObjectDetectionPresetName): ObjectDetectionPreset;
declare function getObjectDetectionPresetOptions(name?: ObjectDetectionPresetName): Partial<ObjectDetectionRuntimeOptions>;
//#endregion
//#region src/modules/object-detection/preprocess.d.ts
interface ObjectDetectionResizeParams {
  srcWidth: number;
  srcHeight: number;
  dstWidth: number;
  dstHeight: number;
  scaleWidth: number;
  scaleHeight: number;
}
//#endregion
//#region src/modules/object-detection/service.d.ts
interface ObjectDetectionRawResult {
  outputs: Record<string, OrtTensor>;
  resizeParams: ObjectDetectionResizeParams;
}
/**
 * Lightweight raw runner for PaddleOCR/PaddleX DETR object-detection modules.
 */
declare class ObjectDetectionService {
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<ObjectDetectionRuntimeOptions>);
  runRaw(input: ImageInput, options?: Partial<ObjectDetectionRuntimeOptions>): Promise<ObjectDetectionRawResult>;
  run(input: ImageInput, options?: Partial<ObjectDetectionRuntimeOptions>): Promise<ObjectDetectionBox[]>;
  private runRawWithRuntimeOptions;
  private resolveRuntimeOptions;
  private requirePositiveInteger;
  private requireTriple;
  private requireChannelOrder;
  private resolveRequiredInputNames;
}
//#endregion
//#region src/modules/table-structure/preprocess.d.ts
interface TableStructureResizeParams {
  srcWidth: number;
  srcHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  paddedWidth: number;
  paddedHeight: number;
  ratioWidth: number;
  ratioHeight: number;
}
interface TableStructureTensorSpec {
  data: Float32Array;
  dims: readonly number[];
}
interface PreprocessTableStructureResult {
  image: TableStructureTensorSpec;
  shape: TableStructureTensorSpec;
  resizeParams: TableStructureResizeParams;
}
interface RequiredTableStructurePreprocessOptions {
  imageHeight: number;
  imageWidth: number;
  maxSideLength: number;
  mean: [number, number, number];
  stdDeviation: [number, number, number];
  channelOrder: ImageChannelOrder;
}
declare function preprocessTableStructure(image: Image, runtimeOptions: RequiredTableStructurePreprocessOptions): PreprocessTableStructureResult;
declare function createTableStructureInputFeeds(ortModule: OrtModule, session: OrtInferenceSession, input: PreprocessTableStructureResult): Record<string, OrtTensor>;
declare function calculateTableStructureResizeParams(image: Image, runtimeOptions: Pick<TableStructureRecognitionRuntimeOptions, "imageHeight" | "imageWidth" | "maxSideLength">): TableStructureResizeParams;
//#endregion
//#region src/modules/table-structure/postprocess.d.ts
interface TableStructureRecognitionResult {
  bbox: number[][];
  structure: string[];
  html: string;
  fullHtml: string;
  structureScore: number;
}
interface TableStructureOcrResult {
  text: string;
  box: Box | readonly number[];
}
interface TableStructureOcrMatch {
  cellIndex: number;
  ocrIndices: number[];
  text: string;
  box: number[];
}
interface TableStructureOcrMatchResult {
  html: string;
  fullHtml: string;
  matches: TableStructureOcrMatch[];
  cellTexts: string[];
}
type TableStructurePostprocessOptions = Pick<TableStructureRecognitionRuntimeOptions, "structureDictionary" | "mergeNoSpanStructure" | "locRegNum" | "ignoreBboxes">;
declare function postprocessTableStructure(outputs: Record<string, OrtTensor>, shape: TableStructureTensorSpec, options: TableStructurePostprocessOptions): TableStructureRecognitionResult;
declare function matchTableStructureToOcr(table: Pick<TableStructureRecognitionResult, "bbox" | "structure">, ocrResults: readonly TableStructureOcrResult[], options?: {
  filterOcrAboveTable?: boolean;
}): TableStructureOcrMatchResult;
declare function createTableStructureHtmlDocument(structure: string | readonly string[]): string;
//#endregion
//#region src/modules/table-structure/preset.d.ts
type TableStructureRecognitionModule = "table_structure_recognition";
type TableStructureRecognitionArchitecture = "SLANet" | "SLANeXt";
interface TableStructureRecognitionPreset {
  name: TableStructureRecognitionPresetName;
  module: TableStructureRecognitionModule;
  architecture: TableStructureRecognitionArchitecture;
  options: Partial<TableStructureRecognitionRuntimeOptions>;
}
declare const TABLE_STRUCTURE_RECOGNITION_PRESETS: Record<TableStructureRecognitionPresetName, TableStructureRecognitionPreset>;
declare function getTableStructureRecognitionPreset(name: TableStructureRecognitionPresetName): TableStructureRecognitionPreset;
declare function getTableStructureRecognitionPresetOptions(name?: TableStructureRecognitionPresetName): Partial<TableStructureRecognitionRuntimeOptions>;
//#endregion
//#region src/modules/table-structure/service.d.ts
interface TableStructureRecognitionRawResult {
  outputs: Record<string, OrtTensor>;
  resizeParams: TableStructureResizeParams;
  shape: TableStructureTensorSpec;
}
/**
 * Lightweight raw runner for PaddleOCR/PaddleX table-structure recognition modules.
 */
declare class TableStructureRecognitionService {
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<TableStructureRecognitionRuntimeOptions>);
  runRaw(input: ImageInput, options?: Partial<TableStructureRecognitionRuntimeOptions>): Promise<TableStructureRecognitionRawResult>;
  run(input: ImageInput, options?: Partial<TableStructureRecognitionRuntimeOptions>): Promise<TableStructureRecognitionResult>;
  private runRawWithRuntimeOptions;
  private resolveRuntimeOptions;
  private requirePositiveInteger;
  private requireTriple;
  private requireChannelOrder;
}
//#endregion
//#region src/modules/text-detection/preset.d.ts
interface TextDetectionPreset {
  name: TextDetectionPresetName;
  module: "text_detection" | "seal_text_detection";
  options: Partial<DetectionRuntimeOptions>;
}
declare const TEXT_DETECTION_PRESETS: Record<TextDetectionPresetName, TextDetectionPreset>;
declare function getTextDetectionPreset(name: TextDetectionPresetName): TextDetectionPreset;
declare function getTextDetectionPresetOptions(name?: TextDetectionPresetName): Partial<DetectionRuntimeOptions>;
//#endregion
//#region src/modules/text-detection/preprocess.d.ts
interface ResizeParams {
  srcWidth: number;
  srcHeight: number;
  resizeSourceWidth: number;
  resizeSourceHeight: number;
  dstWidth: number;
  dstHeight: number;
  scaleWidth: number;
  scaleHeight: number;
}
/**
 * Result of preprocessing an image for text detection
 */
interface PreprocessDetectionResult {
  tensor: Float32Array;
  resizeParams: ResizeParams;
}
//#endregion
//#region src/modules/text-detection/service.d.ts
interface DetectionRunOptions extends Partial<DetectionRuntimeOptions> {
  onProgress?: (event: PaddleOcrProgressEvent) => void;
}
/**
 * Service for detecting text regions in images
 */
declare class DetectionService {
  private static readonly TOTAL_PROGRESS_STEPS;
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<DetectionRuntimeOptions>);
  /**
   * Main method to run text detection on an image
   * @param image ArrayBuffer of the image or Canvas
   */
  run(image: Image, options?: DetectionRunOptions): Promise<Box[]>;
  private resolveRuntimeOptions;
  private resolveFixedInputShape;
  private createProgress;
  /**
   * Preprocess an image for text detection
   */
  private preprocessDetection;
  /**
   * Run the detection model inference
   */
  private runInference;
  /**
   * Process detection results to extract bounding boxes
   */
  private postprocessDetection;
}
//#endregion
//#region src/modules/text-image-unwarping/postprocess.d.ts
interface TextImageUnwarpingResult {
  doctrImage: ImageInput;
}
interface RequiredTextImageUnwarpingPostprocessOptions {
  outputScale: number;
  outputChannelOrder: ImageChannelOrder;
}
declare function postprocessTextImageUnwarping(outputs: Record<string, OrtTensor>, runtimeOptions: RequiredTextImageUnwarpingPostprocessOptions & Partial<TextImageUnwarpingRuntimeOptions>): TextImageUnwarpingResult;
//#endregion
//#region src/modules/text-image-unwarping/preprocess.d.ts
interface TextImageUnwarpingTensorSpec {
  data: Float32Array;
  dims: readonly number[];
}
interface TextImageUnwarpingResizeParams {
  srcWidth: number;
  srcHeight: number;
  tensorWidth: number;
  tensorHeight: number;
}
interface PreprocessTextImageUnwarpingResult {
  image: TextImageUnwarpingTensorSpec;
  resizeParams: TextImageUnwarpingResizeParams;
}
interface RequiredTextImageUnwarpingPreprocessOptions {
  mean: [number, number, number];
  stdDeviation: [number, number, number];
  channelOrder: ImageChannelOrder;
}
declare function preprocessTextImageUnwarping(image: Image, runtimeOptions: RequiredTextImageUnwarpingPreprocessOptions): PreprocessTextImageUnwarpingResult;
declare function createTextImageUnwarpingInputFeeds(ortModule: OrtModule, session: OrtInferenceSession, input: PreprocessTextImageUnwarpingResult, runtimeOptions?: Pick<TextImageUnwarpingRuntimeOptions, "inputName">): Record<string, OrtTensor>;
//#endregion
//#region src/modules/text-image-unwarping/preset.d.ts
type TextImageUnwarpingModule = "text_image_unwarping";
type TextImageUnwarpingArchitecture = "UVDoc";
interface TextImageUnwarpingPreset {
  name: TextImageUnwarpingPresetName;
  module: TextImageUnwarpingModule;
  architecture: TextImageUnwarpingArchitecture;
  options: Partial<TextImageUnwarpingRuntimeOptions>;
}
declare const TEXT_IMAGE_UNWARPING_PRESETS: Record<TextImageUnwarpingPresetName, TextImageUnwarpingPreset>;
declare function getTextImageUnwarpingPreset(name: TextImageUnwarpingPresetName): TextImageUnwarpingPreset;
declare function getTextImageUnwarpingPresetOptions(name?: TextImageUnwarpingPresetName): Partial<TextImageUnwarpingRuntimeOptions>;
//#endregion
//#region src/modules/text-image-unwarping/service.d.ts
interface TextImageUnwarpingRawResult {
  outputs: Record<string, OrtTensor>;
  resizeParams: TextImageUnwarpingResizeParams;
}
/**
 * Lightweight runner for PaddleOCR/PaddleX UVDoc text image unwarping modules.
 */
declare class TextImageUnwarpingService {
  private readonly options;
  private readonly session;
  private readonly ortModule;
  constructor(ortModule: OrtModule, session: OrtInferenceSession, options?: Partial<TextImageUnwarpingRuntimeOptions>);
  runRaw(input: ImageInput, options?: Partial<TextImageUnwarpingRuntimeOptions>): Promise<TextImageUnwarpingRawResult>;
  run(input: ImageInput, options?: Partial<TextImageUnwarpingRuntimeOptions>): Promise<TextImageUnwarpingResult>;
  private runRawWithRuntimeOptions;
  private resolveRuntimeOptions;
  private requireTriple;
  private requireChannelOrder;
  private requireFiniteNumber;
}
//#endregion
//#region src/pipelines/ocr-preset.d.ts
interface PaddleOcrDictionaryRequirement {
  name: string;
  fileName: string;
  useSpaceChar: boolean;
  dictionaryLength: number;
  recognitionOutputClasses: number;
}
interface PaddleOcrModelPreset {
  name: PaddleOcrModelPresetName;
  detection: Partial<DetectionRuntimeOptions>;
  recognition: Partial<RecognitionRuntimeOptions>;
  dictionary: PaddleOcrDictionaryRequirement;
}
interface ModelPresetInferenceInput {
  modelName?: string;
  fileName?: string;
  detectionModelFileName?: string;
  recognitionModelFileName?: string;
  dictionaryName?: string;
  dictionaryFileName?: string;
  recognitionOutputClasses?: number;
  recognitionOutputShape?: readonly (number | string | null | undefined)[];
  dictionaryLength?: number;
}
interface ModelPresetInferenceResult {
  name: PaddleOcrModelPresetName;
  confidence: "high" | "medium";
  signals: string[];
}
declare const MODEL_PRESETS: Record<PaddleOcrModelPresetName, PaddleOcrModelPreset>;
declare function getModelPreset(name: PaddleOcrModelPresetName): PaddleOcrModelPreset;
declare function getModelPresetOptions(name?: PaddleOcrModelPresetName): Pick<PaddleOcrModelPreset, "detection" | "recognition">;
declare function inferModelPreset(input: ModelPresetInferenceInput): ModelPresetInferenceResult | undefined;
//#endregion
//#region src/modules/text-recognition/preset.d.ts
type TextRecognitionModule = "text_recognition";
type TextRecognitionArchitecture = "CTC";
interface TextRecognitionPreset {
  name: TextRecognitionPresetName;
  module: TextRecognitionModule;
  architecture: TextRecognitionArchitecture;
  inputName: "x";
  preprocessPipeline: readonly string[];
  postprocessName: "CTCLabelDecode";
  dictionary: PaddleOcrDictionaryRequirement;
  options: Partial<RecognitionRuntimeOptions>;
}
declare const TEXT_RECOGNITION_PRESETS: Record<TextRecognitionPresetName, TextRecognitionPreset>;
declare function getTextRecognitionPreset(name: TextRecognitionPresetName): TextRecognitionPreset;
declare function getTextRecognitionPresetOptions(name?: TextRecognitionPresetName): Partial<RecognitionRuntimeOptions>;
//#endregion
//#region src/pipelines/ocr.d.ts
interface PaddleOcrResult {
  text: string;
  lines: RecognitionResult[][];
  confidence: number;
}
interface FlattenedPaddleOcrResult {
  text: string;
  results: RecognitionResult[];
  confidence: number;
}
/**
 * PaddleOcrService - Provides OCR functionality using PaddleOCR models
 *
 * This service can be used either as a singleton or as separate instances
 * depending on your application needs.
 */
declare class PaddleOcrService {
  options: PaddleOptions;
  detectionSession: OrtInferenceSession | null;
  detectionService: DetectionService | null;
  recognitionSession: OrtInferenceSession | null;
  recognitionService: RecognitionService | null;
  textlineOrientationSession: OrtInferenceSession | null;
  textlineOrientationService: ImageClassificationService | null;
  /**
   * Create a new PaddleOcrService instance
   * @param options Optional configuration options
   */
  constructor(options?: Partial<PaddleOptions>);
  /**
   * Initialize the OCR service by loading models
   */
  initialize(): Promise<void>;
  /**
   * Check if the service is initialized with models loaded
   */
  isInitialized(): boolean;
  /**
   * Create a new instance instead of using the singleton
   * This is useful when you need multiple instances with different models
   * @param options Configuration options for this specific instance
   */
  static createInstance(options?: PaddleOptions): Promise<PaddleOcrService>;
  private resolveDetectionRuntimeOptions;
  private resolveRecognitionRuntimeOptions;
  private resolveRecognitionOrderingOptions;
  private resolveTextlineOrientationOptions;
  private formatDictionaryRequirement;
  /**
   * Runs object detection on the provided image input, then performs
   * recognition on the detected regions.
   *
   * @param image - The raw image data as an ArrayBuffer or Canvas.
   * @param options - Optional configuration for the recognition output, e.g., `{ flatten: true }`.
   * @return A promise that resolves to the OCR result, either grouped by lines or as a flat list.
   */
  recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
  /**
   * Processes raw recognition results to generate the final text,
   * grouped lines, and overall confidence.
   */
  processRecognition(recognition: RecognitionResult[], options?: ProcessRecognitionOptions): PaddleOcrResult;
  /**
   * Releases the onnx runtime session for both
   * detection and recognition model.
   */
  destroy(): Promise<void>;
}
//#endregion
//#region src/pipelines/structure.d.ts
type PaddleStructureRegionStatus = "applied" | "skipped";
type PaddleStructureRegionType = "text" | "title" | "table" | "formula" | "seal" | "image" | "unknown" | (string & {});
interface PaddleStructureDocumentOrientationOptions extends Partial<ImageClassificationRuntimeOptions> {
  enabled?: boolean;
  threshold?: number;
}
interface PaddleStructureTextImageUnwarpingOptions extends Partial<TextImageUnwarpingRuntimeOptions> {
  enabled?: boolean;
}
interface PaddleStructureLayoutOptions extends Partial<ObjectDetectionRuntimeOptions> {
  enabled?: boolean;
  fallbackRegionType?: PaddleStructureRegionType | false;
}
interface PaddleStructureReadingOrderOptions {
  enabled?: boolean;
}
interface PaddleStructureRegionDetectionOptions extends Partial<ObjectDetectionRuntimeOptions> {
  enabled?: boolean;
}
interface PaddleStructureOcrOptions extends RecognitionOptions {
  enabled?: boolean;
  stripStyleTokens?: boolean;
}
interface PaddleStructureTableOptions extends Partial<TableStructureRecognitionRuntimeOptions> {
  enabled?: boolean;
  ocr?: PaddleStructureOcrOptions;
}
interface PaddleStructureFormulaOptions extends Partial<FormulaRecognitionRuntimeOptions> {
  enabled?: boolean;
}
interface PaddleStructureSealOptions {
  enabled?: boolean;
  detection?: Partial<DetectionRuntimeOptions>;
  recognition?: RecognitionOptions;
}
interface PaddleStructureMarkdownOptions {
  enabled?: boolean;
  ignoreLabels?: readonly string[];
}
interface PaddleStructureRunOptions {
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
interface PaddleStructureClassificationCreateOptions extends Partial<ImageClassificationServiceOptions> {
  preset?: ImageClassificationPresetName;
}
interface PaddleStructureTextImageUnwarpingCreateOptions extends Partial<TextImageUnwarpingServiceOptions> {
  preset?: TextImageUnwarpingPresetName;
}
interface PaddleStructureObjectDetectionCreateOptions extends Partial<ObjectDetectionServiceOptions> {
  preset?: ObjectDetectionPresetName;
}
interface PaddleStructureTableCreateOptions extends Partial<TableStructureRecognitionServiceOptions> {
  preset?: TableStructureRecognitionPresetName;
}
interface PaddleStructureFormulaCreateOptions extends Partial<FormulaRecognitionServiceOptions> {
  preset?: FormulaRecognitionPresetName;
}
interface PaddleStructureTextDetectionCreateOptions extends Partial<DetectionServiceOptions> {
  preset?: TextDetectionPresetName;
}
interface PaddleStructureTextRecognitionCreateOptions extends Partial<RecognitionServiceOptions> {
  preset?: TextRecognitionPresetName;
}
interface PaddleStructureCreateOptions {
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
interface PaddleStructureServices {
  documentOrientation?: {
    run(input: ImageInput, options?: Partial<ImageClassificationRuntimeOptions>): Promise<ImageClassificationResult[]>;
  };
  textImageUnwarping?: {
    run(input: ImageInput, options?: Partial<TextImageUnwarpingRuntimeOptions>): Promise<TextImageUnwarpingResult>;
  };
  regionDetection?: {
    run(input: ImageInput, options?: Partial<ObjectDetectionRuntimeOptions>): Promise<ObjectDetectionBox[]>;
  };
  layout?: {
    run(input: ImageInput, options?: Partial<ObjectDetectionRuntimeOptions>): Promise<ObjectDetectionBox[]>;
  };
  ocr?: {
    recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
  };
  tableOcr?: {
    recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
  };
  tableStructure?: {
    run(input: ImageInput, options?: Partial<TableStructureRecognitionRuntimeOptions>): Promise<TableStructureRecognitionResult>;
  };
  formulaRecognition?: {
    run(input: ImageInput, options?: Partial<FormulaRecognitionRuntimeOptions>): Promise<FormulaRecognitionResult>;
  };
  sealTextDetection?: {
    run(input: ImageInput, options?: Partial<DetectionRuntimeOptions>): Promise<Box[]>;
  };
  sealTextRecognition?: {
    run(image: Image, detection: Box[], options?: RecognitionOptions): Promise<RecognitionResult[]>;
  };
}
interface PaddleStructureStageResult<T = unknown> {
  status: PaddleStructureRegionStatus;
  reason?: string;
  result?: T;
}
interface PaddleStructureLayoutRegion {
  type: PaddleStructureRegionType;
  label: string;
  score: number;
  bbox: [number, number, number, number];
  layout?: PaddleStructureRegionLayout;
  blockOrder?: number;
}
interface PaddleStructureTableResult {
  structure?: TableStructureRecognitionResult;
  ocr?: RecognitionResult[];
  matched?: TableStructureOcrMatchResult;
}
interface PaddleStructureSealResult {
  boxes: Box[];
  recognition: RecognitionResult[];
}
interface PaddleStructureRegionResult {
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
type PaddleStructureRegionLayout = "single" | "double";
interface PaddleStructureMarkdownResult {
  text: string;
}
interface PaddleStructureResult {
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
declare class PaddleStructureService {
  private readonly services;
  private readonly options;
  constructor(services?: PaddleStructureServices, options?: PaddleStructureRunOptions);
  static createInstance(options: PaddleStructureCreateOptions): Promise<PaddleStructureService>;
  run(input: ImageInput, options?: PaddleStructureRunOptions): Promise<PaddleStructureResult>;
  private runDocumentOrientation;
  private runTextImageUnwarping;
  private runLayout;
  private runReadingOrder;
  private runRegionDetection;
  private runPageOcr;
  private runRegion;
  private runTableRegion;
  private runFormulaRegion;
  private runSealRegion;
  private runMarkdown;
}
//#endregion
//#region src/pipelines/table-recognition-v2-recovery.d.ts
interface TableRecognitionV2Cell {
  box: [number, number, number, number];
  row: number;
  column: number;
  rowspan: number;
  colspan: number;
  text: string;
}
interface TableRecognitionV2HtmlResult {
  html: string;
  fullHtml: string;
  cells: TableRecognitionV2Cell[];
}
interface TableRecognitionV2OcrResult {
  text: string;
  box: Box | readonly number[];
}
declare function recoverTableHtmlFromCells(cellBoxes: readonly ObjectDetectionBox[], ocrResults?: readonly TableRecognitionV2OcrResult[]): TableRecognitionV2HtmlResult;
//#endregion
//#region src/pipelines/table-recognition-v2.d.ts
type TableRecognitionV2TableType = "wired" | "wireless";
interface TableRecognitionV2ClassificationOptions extends Partial<ImageClassificationRuntimeOptions> {
  enabled?: boolean;
}
interface TableRecognitionV2OcrOptions extends RecognitionOptions {
  enabled?: boolean;
}
interface TableRecognitionV2RunOptions {
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
interface TableRecognitionV2ClassificationCreateOptions extends Partial<ImageClassificationServiceOptions> {
  preset?: ImageClassificationPresetName;
}
interface TableRecognitionV2StructureCreateOptions extends Partial<TableStructureRecognitionServiceOptions> {
  preset?: TableStructureRecognitionPresetName;
}
interface TableRecognitionV2CellsCreateOptions extends Partial<ObjectDetectionServiceOptions> {
  preset?: "RT-DETR-L_wired_table_cell_det" | "RT-DETR-L_wireless_table_cell_det";
}
interface TableRecognitionV2CreateOptions {
  ort: OrtModule;
  tableClassification?: TableRecognitionV2ClassificationCreateOptions;
  wiredTableStructure?: TableRecognitionV2StructureCreateOptions;
  wirelessTableStructure?: TableRecognitionV2StructureCreateOptions;
  wiredTableCellsDetection?: TableRecognitionV2CellsCreateOptions;
  wirelessTableCellsDetection?: TableRecognitionV2CellsCreateOptions;
  ocr?: PaddleOptions;
  options?: TableRecognitionV2RunOptions;
}
interface TableRecognitionV2Services {
  tableClassification?: {
    run(input: ImageInput, options?: Partial<ImageClassificationRuntimeOptions>): Promise<ImageClassificationResult[]>;
  };
  wiredTableStructure?: {
    run(input: ImageInput, options?: Partial<TableStructureRecognitionRuntimeOptions>): Promise<TableStructureRecognitionResult>;
  };
  wirelessTableStructure?: {
    run(input: ImageInput, options?: Partial<TableStructureRecognitionRuntimeOptions>): Promise<TableStructureRecognitionResult>;
  };
  wiredTableCellsDetection?: {
    run(input: ImageInput, options?: Partial<ObjectDetectionRuntimeOptions>): Promise<ObjectDetectionBox[]>;
  };
  wirelessTableCellsDetection?: {
    run(input: ImageInput, options?: Partial<ObjectDetectionRuntimeOptions>): Promise<ObjectDetectionBox[]>;
  };
  ocr?: {
    recognize(input: ImageInput, options?: RecognitionOptions): Promise<RecognitionResult[]>;
  };
}
interface TableRecognitionV2Result {
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
declare class TableRecognitionV2Service {
  private readonly services;
  private readonly options;
  constructor(services?: TableRecognitionV2Services, options?: TableRecognitionV2RunOptions);
  static createInstance(options: TableRecognitionV2CreateOptions): Promise<TableRecognitionV2Service>;
  run(input: ImageInput, options?: TableRecognitionV2RunOptions): Promise<TableRecognitionV2Result>;
  private runTableClassification;
  private runTableStructure;
  private runTableCellsDetection;
  private runOcr;
}
//#endregion
export { type Box, type ClassificationResizeMode, DEFAULT_DETECTION_OPTIONS, DEFAULT_IMAGE_CLASSIFICATION_OPTIONS, DEFAULT_PADDLE_OPTIONS, DEFAULT_PROCESS_RECOGNITION_OPTIONS, DEFAULT_RECOGNITION_OPTIONS, DEFAULT_RECOGNITION_ORDERING_OPTIONS, DEFAULT_TEXTLINE_ORIENTATION_OPTIONS, type DetectionRuntimeOptions, DetectionService, type DetectionServiceOptions, FORMULA_RECOGNITION_PRESETS, type FlattenedPaddleOcrResult, type FormulaRecognitionArchitecture, type FormulaRecognitionModule, type FormulaRecognitionPreset, type FormulaRecognitionPresetName, type FormulaRecognitionRawResult, type FormulaRecognitionResizeParams, type FormulaRecognitionResult, type FormulaRecognitionRuntimeOptions, FormulaRecognitionService, type FormulaRecognitionServiceOptions, type FormulaRecognitionTensorSpec, IMAGE_CLASSIFICATION_PRESETS, Image, type ImageChannelOrder, type ImageClassificationPreset, type ImageClassificationPresetName, type ImageClassificationResult, type ImageClassificationRuntimeOptions, ImageClassificationService, type ImageClassificationServiceOptions, MODEL_PRESETS, type ModelPresetInferenceInput, type ModelPresetInferenceResult, OBJECT_DETECTION_PRESETS, type ObjectDetectionArchitecture, type ObjectDetectionBox, type ObjectDetectionMergeMode, type ObjectDetectionModule, type ObjectDetectionOutputLayout, type ObjectDetectionPreset, type ObjectDetectionPresetName, type ObjectDetectionRawResult, type ObjectDetectionRuntimeOptions, ObjectDetectionService, type ObjectDetectionServiceOptions, type OcrProgress, type OrtInferenceSession, type OrtModule, type OrtTensor, type PaddleOcrDictionaryRequirement, type PaddleOcrModelPreset, type PaddleOcrModelPresetName, type PaddleOcrProgressEvent, type PaddleOcrResult, PaddleOcrService, type PaddleOptions, type PaddleStructureClassificationCreateOptions, type PaddleStructureCreateOptions, type PaddleStructureDocumentOrientationOptions, type PaddleStructureFormulaCreateOptions, type PaddleStructureFormulaOptions, type PaddleStructureLayoutOptions, type PaddleStructureLayoutRegion, type PaddleStructureMarkdownOptions, type PaddleStructureMarkdownResult, type PaddleStructureObjectDetectionCreateOptions, type PaddleStructureOcrOptions, type PaddleStructureReadingOrderOptions, type PaddleStructureRegionDetectionOptions, type PaddleStructureRegionLayout, type PaddleStructureRegionResult, type PaddleStructureRegionStatus, type PaddleStructureRegionType, type PaddleStructureResult, type PaddleStructureRunOptions, type PaddleStructureSealOptions, type PaddleStructureSealResult, PaddleStructureService, type PaddleStructureServices, type PaddleStructureStageResult, type PaddleStructureTableCreateOptions, type PaddleStructureTableOptions, type PaddleStructureTableResult, type PaddleStructureTextDetectionCreateOptions, type PaddleStructureTextImageUnwarpingCreateOptions, type PaddleStructureTextImageUnwarpingOptions, type PaddleStructureTextRecognitionCreateOptions, type PreprocessDetectionResult, type PreprocessFormulaRecognitionResult, type PreprocessTableStructureResult, type PreprocessTextImageUnwarpingResult, type ProcessRecognitionOptions, type RecognitionOptions, type RecognitionOrderingOptions, type RecognitionOutputSelectionStrategy, type RecognitionResult, type RecognitionRuntimeOptions, RecognitionService, type RecognitionServiceOptions, TABLE_STRUCTURE_RECOGNITION_PRESETS, TEXT_DETECTION_PRESETS, TEXT_IMAGE_UNWARPING_PRESETS, TEXT_RECOGNITION_PRESETS, type TableRecognitionV2Cell, type TableRecognitionV2CellsCreateOptions, type TableRecognitionV2ClassificationCreateOptions, type TableRecognitionV2ClassificationOptions, type TableRecognitionV2CreateOptions, type TableRecognitionV2HtmlResult, type TableRecognitionV2OcrOptions, type TableRecognitionV2OcrResult, type TableRecognitionV2Result, type TableRecognitionV2RunOptions, TableRecognitionV2Service, type TableRecognitionV2Services, type TableRecognitionV2StructureCreateOptions, type TableRecognitionV2TableType, type TableStructureOcrMatch, type TableStructureOcrMatchResult, type TableStructureOcrResult, type TableStructureRecognitionArchitecture, type TableStructureRecognitionModule, type TableStructureRecognitionPreset, type TableStructureRecognitionPresetName, type TableStructureRecognitionRawResult, type TableStructureRecognitionResult, type TableStructureRecognitionRuntimeOptions, TableStructureRecognitionService, type TableStructureRecognitionServiceOptions, type TableStructureResizeParams, type TableStructureTensorSpec, type TextDetectionPreset, type TextDetectionPresetName, type TextImageUnwarpingArchitecture, type TextImageUnwarpingModule, type TextImageUnwarpingPreset, type TextImageUnwarpingPresetName, type TextImageUnwarpingRawResult, type TextImageUnwarpingResizeParams, type TextImageUnwarpingResult, type TextImageUnwarpingRuntimeOptions, TextImageUnwarpingService, type TextImageUnwarpingServiceOptions, type TextImageUnwarpingTensorSpec, type TextLineOrientationClassifier, type TextLineOrientationResult, type TextLineOrientationRuntimeOptions, type TextLineOrientationServiceOptions, type TextRecognitionArchitecture, type TextRecognitionModule, type TextRecognitionPreset, type TextRecognitionPresetName, calculateFormulaCropBox, calculateTableStructureResizeParams, createFormulaRecognitionInputFeeds, createFormulaTokenizerVocabulary, createTableStructureHtmlDocument, createTableStructureInputFeeds, createTextImageUnwarpingInputFeeds, getFormulaRecognitionPreset, getFormulaRecognitionPresetOptions, getImageClassificationPreset, getImageClassificationPresetOptions, getModelPreset, getModelPresetOptions, getObjectDetectionPreset, getObjectDetectionPresetOptions, getTableStructureRecognitionPreset, getTableStructureRecognitionPresetOptions, getTextDetectionPreset, getTextDetectionPresetOptions, getTextImageUnwarpingPreset, getTextImageUnwarpingPresetOptions, getTextRecognitionPreset, getTextRecognitionPresetOptions, inferModelPreset, matchTableStructureToOcr, normalizeInputToRgb, postprocessFormulaRecognition, postprocessObjectDetection, postprocessTableStructure, postprocessTextImageUnwarping, preprocessFormulaRecognition, preprocessTableStructure, preprocessTextImageUnwarping, recoverTableHtmlFromCells };
//# sourceMappingURL=index.d.mts.map