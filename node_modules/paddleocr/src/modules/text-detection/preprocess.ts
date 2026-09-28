import type { Image } from "../../core/image.ts";
import type { DetectionRuntimeOptions } from "../../interface.ts";

export interface ResizeParams {
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
export interface PreprocessDetectionResult {
    tensor: Float32Array;
    resizeParams: ResizeParams;
}

export function preprocessDetection(
    image: Image,
    runtimeOptions: DetectionRuntimeOptions
): PreprocessDetectionResult {
    const resizeParams = calculateDetectionResizeDimensions(image, runtimeOptions);
    const inputImage =
        image.width === resizeParams.resizeSourceWidth &&
        image.height === resizeParams.resizeSourceHeight
            ? image
            : image.padding({
                  right: resizeParams.resizeSourceWidth - image.width,
                  bottom: resizeParams.resizeSourceHeight - image.height,
                  color: [0, 0, 0],
              });

    const resizedImage = inputImage.resize({
        width: resizeParams.dstWidth,
        height: resizeParams.dstHeight,
    });
    const tensor = resizedImage.tensor({
        mean_values: runtimeOptions.mean,
        norm_values: runtimeOptions.stdDeviation,
        channel_order: runtimeOptions.channelOrder,
    });

    return {
        tensor,
        resizeParams,
    };
}

export function calculateDetectionResizeDimensions(
    image: Image,
    runtimeOptions: DetectionRuntimeOptions
): ResizeParams {
    const { width: srcWidth, height: srcHeight } = image;
    const resizeSourceWidth = srcWidth + srcHeight < 64 ? Math.max(32, srcWidth) : srcWidth;
    const resizeSourceHeight = srcWidth + srcHeight < 64 ? Math.max(32, srcHeight) : srcHeight;
    const fixedInputShape = runtimeOptions.inputShape;
    if (fixedInputShape) {
        const [, fixedHeight, fixedWidth] = fixedInputShape;
        if (!Number.isInteger(fixedWidth) || fixedWidth <= 0) {
            throw new Error(
                `Invalid detection inputShape width: ${fixedWidth}. Expected a positive integer.`
            );
        }
        if (!Number.isInteger(fixedHeight) || fixedHeight <= 0) {
            throw new Error(
                `Invalid detection inputShape height: ${fixedHeight}. Expected a positive integer.`
            );
        }

        return {
            srcHeight,
            srcWidth,
            resizeSourceHeight,
            resizeSourceWidth,
            dstHeight: fixedHeight,
            dstWidth: fixedWidth,
            scaleWidth: fixedWidth / resizeSourceWidth,
            scaleHeight: fixedHeight / resizeSourceHeight,
        };
    }

    const limitSideLength = runtimeOptions.maxSideLength;
    const limitType = runtimeOptions.limitType;
    const maxSideLimit = runtimeOptions.maxSideLimit;
    const shortSide = Math.min(resizeSourceWidth, resizeSourceHeight);
    const longSide = Math.max(resizeSourceWidth, resizeSourceHeight);

    let ratio = 1;
    if (limitType === "max") {
        ratio = longSide > limitSideLength ? limitSideLength / longSide : 1;
    } else if (limitType === "min") {
        ratio = shortSide < limitSideLength ? limitSideLength / shortSide : 1;
    } else if (limitType === "resize_long") {
        ratio = limitSideLength / longSide;
    } else {
        throw new Error(`Unsupported detection resize limitType: ${limitType}`);
    }

    let dstWidth = Math.round(resizeSourceWidth * ratio);
    let dstHeight = Math.round(resizeSourceHeight * ratio);
    const resizedLongSide = Math.max(dstWidth, dstHeight);
    if (resizedLongSide > maxSideLimit) {
        const sideLimitRatio = maxSideLimit / resizedLongSide;
        dstWidth = Math.round(dstWidth * sideLimitRatio);
        dstHeight = Math.round(dstHeight * sideLimitRatio);
    }

    // DB detection models require input dimensions to be multiples of 32.
    if (dstWidth % 32 !== 0) dstWidth = Math.max(Math.round(dstWidth / 32) * 32, 32);
    if (dstHeight % 32 !== 0) dstHeight = Math.max(Math.round(dstHeight / 32) * 32, 32);

    return {
        srcHeight,
        srcWidth,
        resizeSourceHeight,
        resizeSourceWidth,
        dstHeight,
        dstWidth,
        scaleWidth: dstWidth / resizeSourceWidth,
        scaleHeight: dstHeight / resizeSourceHeight,
    };
}
