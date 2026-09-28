import type { Image } from "../../core/image.ts";
import type {
    ImageChannelOrder,
    ObjectDetectionInputName,
    ObjectDetectionRuntimeOptions,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
} from "../../interface.ts";

export interface ObjectDetectionResizeParams {
    srcWidth: number;
    srcHeight: number;
    dstWidth: number;
    dstHeight: number;
    scaleWidth: number;
    scaleHeight: number;
}

export interface ObjectDetectionTensorSpec {
    data: Float32Array;
    dims: readonly number[];
}

export interface PreprocessObjectDetectionResult {
    image: ObjectDetectionTensorSpec;
    imShape: ObjectDetectionTensorSpec;
    scaleFactor: ObjectDetectionTensorSpec;
    resizeParams: ObjectDetectionResizeParams;
}

interface RequiredObjectDetectionPreprocessOptions {
    imageHeight: number;
    imageWidth: number;
    mean: [number, number, number];
    stdDeviation: [number, number, number];
    channelOrder: ImageChannelOrder;
}

export function preprocessObjectDetection(
    image: Image,
    runtimeOptions: RequiredObjectDetectionPreprocessOptions
): PreprocessObjectDetectionResult {
    validateObjectDetectionPreprocessOptions(runtimeOptions);
    const resizeParams = calculateObjectDetectionResizeParams(image, runtimeOptions);
    const resizedImage = image.resize({
        width: resizeParams.dstWidth,
        height: resizeParams.dstHeight,
    });
    const tensor = resizedImage.tensor({
        mean_values: runtimeOptions.mean,
        norm_values: runtimeOptions.stdDeviation,
        channel_order: runtimeOptions.channelOrder,
    });

    return {
        image: {
            data: tensor,
            dims: [1, 3, resizeParams.dstHeight, resizeParams.dstWidth],
        },
        imShape: {
            data: new Float32Array([resizeParams.dstHeight, resizeParams.dstWidth]),
            dims: [1, 2],
        },
        scaleFactor: {
            data: new Float32Array([resizeParams.scaleHeight, resizeParams.scaleWidth]),
            dims: [1, 2],
        },
        resizeParams,
    };
}

export function createObjectDetectionInputFeeds(
    ortModule: OrtModule,
    session: OrtInferenceSession,
    input: PreprocessObjectDetectionResult,
    requiredInputNames?: readonly ObjectDetectionInputName[]
): Partial<Record<ObjectDetectionInputName, OrtTensor>> {
    const inputNames = session.inputNames ??
        requiredInputNames ?? ["image", "im_shape", "scale_factor"];
    const specs: Record<ObjectDetectionInputName, ObjectDetectionTensorSpec> = {
        image: input.image,
        im_shape: input.imShape,
        scale_factor: input.scaleFactor,
    };
    const feedInputNames = requiredInputNames ?? inputNames.filter(isObjectDetectionInputName);
    const feeds: Partial<Record<ObjectDetectionInputName, OrtTensor>> = {};

    if (feedInputNames.length === 0) {
        throw new Error(
            `Object detection session does not expose supported input tensors. Available input names: ${inputNames.join(", ")}`
        );
    }

    for (const inputName of feedInputNames) {
        if (!inputNames.includes(inputName)) {
            throw new Error(
                `Object detection input tensor '${inputName}' not found. Available input names: ${inputNames.join(", ")}`
            );
        }
        const spec = specs[inputName];
        feeds[inputName] = new ortModule.Tensor("float32", spec.data, spec.dims);
    }

    return feeds;
}

export function calculateObjectDetectionResizeParams(
    image: Image,
    runtimeOptions: Pick<ObjectDetectionRuntimeOptions, "imageHeight" | "imageWidth">
): ObjectDetectionResizeParams {
    const { imageHeight, imageWidth } = runtimeOptions;
    validateObjectDetectionImageSize(imageHeight, imageWidth);
    const dstWidth = imageWidth as number;
    const dstHeight = imageHeight as number;

    return {
        srcWidth: image.width,
        srcHeight: image.height,
        dstWidth,
        dstHeight,
        scaleWidth: dstWidth / image.width,
        scaleHeight: dstHeight / image.height,
    };
}

function validateObjectDetectionPreprocessOptions(
    runtimeOptions: RequiredObjectDetectionPreprocessOptions
) {
    validateObjectDetectionImageSize(runtimeOptions.imageHeight, runtimeOptions.imageWidth);
    if (runtimeOptions.channelOrder !== "rgb" && runtimeOptions.channelOrder !== "bgr") {
        throw new Error(
            `Unsupported object detection channelOrder: ${runtimeOptions.channelOrder}. Expected "rgb" or "bgr".`
        );
    }
}

function validateObjectDetectionImageSize(imageHeight?: number, imageWidth?: number) {
    if (!Number.isInteger(imageWidth) || (imageWidth ?? 0) <= 0) {
        throw new Error(
            `Invalid object detection imageWidth: ${imageWidth}. Expected a positive integer.`
        );
    }
    if (!Number.isInteger(imageHeight) || (imageHeight ?? 0) <= 0) {
        throw new Error(
            `Invalid object detection imageHeight: ${imageHeight}. Expected a positive integer.`
        );
    }
}

function isObjectDetectionInputName(inputName: string): inputName is ObjectDetectionInputName {
    return inputName === "image" || inputName === "im_shape" || inputName === "scale_factor";
}
