import type { Image } from "../../core/image.ts";
import type {
    ImageChannelOrder,
    OrtInferenceSession,
    OrtModule,
    OrtTensor,
    TableStructureRecognitionRuntimeOptions,
} from "../../interface.ts";

export interface TableStructureResizeParams {
    srcWidth: number;
    srcHeight: number;
    resizedWidth: number;
    resizedHeight: number;
    paddedWidth: number;
    paddedHeight: number;
    ratioWidth: number;
    ratioHeight: number;
}

export interface TableStructureTensorSpec {
    data: Float32Array;
    dims: readonly number[];
}

export interface PreprocessTableStructureResult {
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

export function preprocessTableStructure(
    image: Image,
    runtimeOptions: RequiredTableStructurePreprocessOptions
): PreprocessTableStructureResult {
    validateTableStructurePreprocessOptions(runtimeOptions);
    const resizeParams = calculateTableStructureResizeParams(image, runtimeOptions);
    const resizedImage = image.resize({
        width: resizeParams.resizedWidth,
        height: resizeParams.resizedHeight,
    });
    const resizedTensor = resizedImage.tensor({
        mean_values: runtimeOptions.mean,
        norm_values: runtimeOptions.stdDeviation,
        channel_order: runtimeOptions.channelOrder,
    });
    const paddedTensor = padNormalizedChwTensor(resizedTensor, resizeParams);

    return {
        image: {
            data: paddedTensor,
            dims: [1, 3, resizeParams.paddedHeight, resizeParams.paddedWidth],
        },
        shape: {
            data: new Float32Array([
                resizeParams.srcHeight,
                resizeParams.srcWidth,
                resizeParams.ratioHeight,
                resizeParams.ratioWidth,
                resizeParams.paddedHeight,
                resizeParams.paddedWidth,
            ]),
            dims: [1, 6],
        },
        resizeParams,
    };
}

export function createTableStructureInputFeeds(
    ortModule: OrtModule,
    session: OrtInferenceSession,
    input: PreprocessTableStructureResult
): Record<string, OrtTensor> {
    const inputName = session.inputNames?.[0] ?? "x";
    return {
        [inputName]: new ortModule.Tensor("float32", input.image.data, input.image.dims),
    };
}

export function calculateTableStructureResizeParams(
    image: Image,
    runtimeOptions: Pick<
        TableStructureRecognitionRuntimeOptions,
        "imageHeight" | "imageWidth" | "maxSideLength"
    >
): TableStructureResizeParams {
    const { imageHeight, imageWidth, maxSideLength } = runtimeOptions;
    validateTableStructureImageSize(imageHeight, imageWidth, maxSideLength);
    const ratio = (maxSideLength as number) / Math.max(image.width, image.height);
    const resizedWidth = Math.floor(image.width * ratio);
    const resizedHeight = Math.floor(image.height * ratio);
    if (resizedWidth <= 0 || resizedHeight <= 0) {
        throw new Error(
            `Invalid table structure resize result: ${resizedWidth}x${resizedHeight}. Source image is too narrow for maxSideLength ${maxSideLength}.`
        );
    }
    if (resizedWidth > (imageWidth as number) || resizedHeight > (imageHeight as number)) {
        throw new Error(
            `Invalid table structure resize result: ${resizedWidth}x${resizedHeight} exceeds padded size ${imageWidth}x${imageHeight}.`
        );
    }

    return {
        srcWidth: image.width,
        srcHeight: image.height,
        resizedWidth,
        resizedHeight,
        paddedWidth: imageWidth as number,
        paddedHeight: imageHeight as number,
        ratioWidth: ratio,
        ratioHeight: ratio,
    };
}

function padNormalizedChwTensor(
    resizedTensor: Float32Array,
    resizeParams: TableStructureResizeParams
): Float32Array {
    const { resizedWidth, resizedHeight, paddedWidth, paddedHeight } = resizeParams;
    const channelCount = 3;
    const paddedTensor = new Float32Array(channelCount * paddedWidth * paddedHeight);

    for (let channel = 0; channel < channelCount; channel++) {
        const resizedChannelOffset = channel * resizedWidth * resizedHeight;
        const paddedChannelOffset = channel * paddedWidth * paddedHeight;
        for (let y = 0; y < resizedHeight; y++) {
            const sourceOffset = resizedChannelOffset + y * resizedWidth;
            const targetOffset = paddedChannelOffset + y * paddedWidth;
            paddedTensor.set(
                resizedTensor.subarray(sourceOffset, sourceOffset + resizedWidth),
                targetOffset
            );
        }
    }

    return paddedTensor;
}

function validateTableStructurePreprocessOptions(
    runtimeOptions: RequiredTableStructurePreprocessOptions
) {
    validateTableStructureImageSize(
        runtimeOptions.imageHeight,
        runtimeOptions.imageWidth,
        runtimeOptions.maxSideLength
    );
    if (runtimeOptions.channelOrder !== "rgb" && runtimeOptions.channelOrder !== "bgr") {
        throw new Error(
            `Unsupported table structure channelOrder: ${runtimeOptions.channelOrder}. Expected "rgb" or "bgr".`
        );
    }
}

function validateTableStructureImageSize(
    imageHeight?: number,
    imageWidth?: number,
    maxSideLength?: number
) {
    if (!Number.isInteger(imageWidth) || (imageWidth ?? 0) <= 0) {
        throw new Error(
            `Invalid table structure imageWidth: ${imageWidth}. Expected a positive integer.`
        );
    }
    if (!Number.isInteger(imageHeight) || (imageHeight ?? 0) <= 0) {
        throw new Error(
            `Invalid table structure imageHeight: ${imageHeight}. Expected a positive integer.`
        );
    }
    if (!Number.isInteger(maxSideLength) || (maxSideLength ?? 0) <= 0) {
        throw new Error(
            `Invalid table structure maxSideLength: ${maxSideLength}. Expected a positive integer.`
        );
    }
}
