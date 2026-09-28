export type FormulaRecognitionPresetName =
    | "PP-FormulaNet-S"
    | "PP-FormulaNet-L"
    | "PP-FormulaNet_plus-S"
    | "PP-FormulaNet_plus-M"
    | "PP-FormulaNet_plus-L";

export interface FormulaRecognitionRuntimeOptions {
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
export interface FormulaRecognitionServiceOptions extends FormulaRecognitionRuntimeOptions {
    /**
     * ArrayBuffer containing the ONNX model for formula recognition.
     */
    modelBuffer?: ArrayBuffer;
}
