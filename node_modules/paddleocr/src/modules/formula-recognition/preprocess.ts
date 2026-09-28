import type { Image } from "../../core/image.ts";
import type {
    FormulaRecognitionRuntimeOptions,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
} from "../../interface.ts";

export interface FormulaRecognitionResizeParams {
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

export interface FormulaRecognitionTensorSpec {
    data: Float32Array;
    dims: readonly number[];
}

export interface PreprocessFormulaRecognitionResult {
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

export function preprocessFormulaRecognition(
    image: Image,
    runtimeOptions: RequiredFormulaRecognitionPreprocessOptions
): PreprocessFormulaRecognitionResult {
    validateFormulaRecognitionPreprocessOptions(runtimeOptions);

    const cropBox = calculateFormulaCropBox(image, runtimeOptions);
    const croppedImage =
        cropBox.x === 0 &&
        cropBox.y === 0 &&
        cropBox.width === image.width &&
        cropBox.height === image.height
            ? image
            : image.crop(cropBox);
    const shortEdgeSize = calculateFormulaShortEdgeResizeSize(croppedImage, runtimeOptions);
    const shortEdgeImage = croppedImage.resize({
        width: shortEdgeSize.width,
        height: shortEdgeSize.height,
    });
    const thumbnailSize = calculateFormulaThumbnailSize(shortEdgeImage, runtimeOptions);
    const resizedImage = shortEdgeImage.resize({
        width: thumbnailSize.width,
        height: thumbnailSize.height,
    });
    const paddingLeft = Math.floor((runtimeOptions.imageWidth - resizedImage.width) / 2);
    const paddingTop = Math.floor((runtimeOptions.imageHeight - resizedImage.height) / 2);
    const paddingRight = runtimeOptions.imageWidth - resizedImage.width - paddingLeft;
    const paddingBottom = runtimeOptions.imageHeight - resizedImage.height - paddingTop;
    const paddedImage = resizedImage.padding({
        left: paddingLeft,
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        color: [
            runtimeOptions.imagePaddingValue,
            runtimeOptions.imagePaddingValue,
            runtimeOptions.imagePaddingValue,
        ],
    });
    const tensorPaddedWidth = Math.ceil(paddedImage.width / 16) * 16;
    const tensorPaddedHeight = Math.ceil(paddedImage.height / 16) * 16;
    const tensor = new Float32Array(tensorPaddedWidth * tensorPaddedHeight);
    tensor.fill(runtimeOptions.latexPaddingValue);

    for (let y = 0; y < paddedImage.height; y++) {
        for (let x = 0; x < paddedImage.width; x++) {
            const pixelIndex = (y * paddedImage.width + x) * paddedImage.channels;
            const grayscale = rgbToLuminance(
                paddedImage.data[pixelIndex],
                paddedImage.data[pixelIndex + 1],
                paddedImage.data[pixelIndex + 2]
            );
            tensor[y * tensorPaddedWidth + x] =
                (grayscale / 255 - runtimeOptions.grayscaleMean) /
                runtimeOptions.grayscaleStdDeviation;
        }
    }

    return {
        image: {
            data: tensor,
            dims: [1, 1, tensorPaddedHeight, tensorPaddedWidth],
        },
        resizeParams: {
            srcWidth: image.width,
            srcHeight: image.height,
            croppedX: cropBox.x,
            croppedY: cropBox.y,
            croppedWidth: cropBox.width,
            croppedHeight: cropBox.height,
            resizedWidth: resizedImage.width,
            resizedHeight: resizedImage.height,
            imagePaddedWidth: paddedImage.width,
            imagePaddedHeight: paddedImage.height,
            tensorPaddedWidth,
            tensorPaddedHeight,
            paddingLeft,
            paddingTop,
            paddingRight,
            paddingBottom,
        },
    };
}

export function createFormulaRecognitionInputFeeds(
    ortModule: OrtModule,
    session: OrtInferenceSession,
    input: PreprocessFormulaRecognitionResult,
    runtimeOptions: Pick<FormulaRecognitionRuntimeOptions, "inputName"> = {}
): Record<string, OrtTensor> {
    const inputName = session.inputNames?.[0] ?? runtimeOptions.inputName ?? "x";
    return {
        [inputName]: new ortModule.Tensor("float32", input.image.data, input.image.dims),
    };
}

export function calculateFormulaCropBox(
    image: Image,
    runtimeOptions: Pick<
        FormulaRecognitionRuntimeOptions,
        "cropMarginThreshold" | "cropMarginMaxAspectRatio"
    >
): CropBox {
    const threshold = runtimeOptions.cropMarginThreshold;
    const maxAspectRatio = runtimeOptions.cropMarginMaxAspectRatio;
    if (!Number.isFinite(threshold) || !Number.isFinite(maxAspectRatio)) {
        throw new Error(
            "Formula crop-margin options require finite cropMarginThreshold and cropMarginMaxAspectRatio."
        );
    }

    let minGray = 255;
    let maxGray = 0;
    const grayscale = new Uint8Array(image.width * image.height);
    for (let pixelIndex = 0; pixelIndex < grayscale.length; pixelIndex++) {
        const sourceIndex = pixelIndex * image.channels;
        const value = rgbToLuminance(
            image.data[sourceIndex],
            image.data[sourceIndex + 1],
            image.data[sourceIndex + 2]
        );
        grayscale[pixelIndex] = value;
        minGray = Math.min(minGray, value);
        maxGray = Math.max(maxGray, value);
    }

    if (maxGray === minGray) {
        return fullImageCropBox(image);
    }

    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const normalized =
                ((grayscale[y * image.width + x] - minGray) / (maxGray - minGray)) * 255;
            if (normalized < (threshold as number)) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return fullImageCropBox(image);
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (
        width === 0 ||
        height === 0 ||
        Math.max(width, height) / Math.min(width, height) > (maxAspectRatio as number)
    ) {
        return fullImageCropBox(image);
    }

    return {
        x: minX,
        y: minY,
        width,
        height,
    };
}

function calculateFormulaShortEdgeResizeSize(
    image: Image,
    runtimeOptions: Pick<FormulaRecognitionRuntimeOptions, "imageHeight" | "imageWidth">
) {
    const shortEdgeTarget = Math.min(
        runtimeOptions.imageHeight as number,
        runtimeOptions.imageWidth as number
    );
    if (image.width <= image.height) {
        return {
            width: shortEdgeTarget,
            height: Math.max(1, Math.floor((shortEdgeTarget * image.height) / image.width)),
        };
    }
    return {
        width: Math.max(1, Math.floor((shortEdgeTarget * image.width) / image.height)),
        height: shortEdgeTarget,
    };
}

function calculateFormulaThumbnailSize(
    image: Image,
    runtimeOptions: Pick<FormulaRecognitionRuntimeOptions, "imageHeight" | "imageWidth">
) {
    const maxWidth = runtimeOptions.imageWidth as number;
    const maxHeight = runtimeOptions.imageHeight as number;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const resizedWidth = Math.max(1, Math.floor(image.width * scale));
    const resizedHeight = Math.max(1, Math.floor(image.height * scale));
    if (resizedWidth > maxWidth || resizedHeight > maxHeight) {
        throw new Error(
            `Invalid formula resize result: ${resizedWidth}x${resizedHeight} exceeds padded size ${maxWidth}x${maxHeight}.`
        );
    }
    return {
        width: resizedWidth,
        height: resizedHeight,
    };
}

function validateFormulaRecognitionPreprocessOptions(
    runtimeOptions: RequiredFormulaRecognitionPreprocessOptions
) {
    if (!Number.isInteger(runtimeOptions.imageWidth) || runtimeOptions.imageWidth <= 0) {
        throw new Error(
            `Invalid formula recognition imageWidth: ${runtimeOptions.imageWidth}. Expected a positive integer.`
        );
    }
    if (!Number.isInteger(runtimeOptions.imageHeight) || runtimeOptions.imageHeight <= 0) {
        throw new Error(
            `Invalid formula recognition imageHeight: ${runtimeOptions.imageHeight}. Expected a positive integer.`
        );
    }
    if (runtimeOptions.inputChannels !== 1) {
        throw new Error(
            `Unsupported formula recognition inputChannels: ${runtimeOptions.inputChannels}. Expected 1.`
        );
    }
    if (
        !Number.isFinite(runtimeOptions.grayscaleMean) ||
        !Number.isFinite(runtimeOptions.grayscaleStdDeviation) ||
        runtimeOptions.grayscaleStdDeviation === 0
    ) {
        throw new Error(
            "Formula recognition grayscale normalization requires finite mean and non-zero std deviation."
        );
    }
    if (!Number.isFinite(runtimeOptions.imagePaddingValue)) {
        throw new Error("Formula recognition imagePaddingValue must be finite.");
    }
    if (!Number.isFinite(runtimeOptions.latexPaddingValue)) {
        throw new Error("Formula recognition latexPaddingValue must be finite.");
    }
}

function fullImageCropBox(image: Image): CropBox {
    return {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
    };
}

function rgbToLuminance(red = 0, green = 0, blue = 0): number {
    return Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
}
