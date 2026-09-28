import type {
    ImageChannelOrder,
    ImageInput,
    OrtTensor,
    TextImageUnwarpingRuntimeOptions,
} from "../../interface.ts";

export interface TextImageUnwarpingResult {
    doctrImage: ImageInput;
}

interface RequiredTextImageUnwarpingPostprocessOptions {
    outputScale: number;
    outputChannelOrder: ImageChannelOrder;
}

export function postprocessTextImageUnwarping(
    outputs: Record<string, OrtTensor>,
    runtimeOptions: RequiredTextImageUnwarpingPostprocessOptions &
        Partial<TextImageUnwarpingRuntimeOptions>
): TextImageUnwarpingResult {
    const tensor = selectTextImageUnwarpingOutput(outputs);
    const [batchSize, channelCount, height, width] = tensor.dims as [
        number,
        number,
        number,
        number,
    ];
    if (batchSize !== 1) {
        throw new Error(`Unsupported text image unwarping batch size: ${batchSize}. Expected 1.`);
    }
    if (channelCount !== 3) {
        throw new Error(
            `Unsupported text image unwarping output channels: ${channelCount}. Expected 3.`
        );
    }
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        throw new Error(
            `Invalid text image unwarping output size: ${width}x${height}. Expected positive integer dimensions.`
        );
    }
    if (!Number.isFinite(runtimeOptions.outputScale)) {
        throw new Error(
            `Invalid text image unwarping outputScale: ${runtimeOptions.outputScale}. Expected a finite number.`
        );
    }
    if (
        runtimeOptions.outputChannelOrder !== "rgb" &&
        runtimeOptions.outputChannelOrder !== "bgr"
    ) {
        throw new Error(
            `Unsupported text image unwarping outputChannelOrder: ${runtimeOptions.outputChannelOrder}. Expected "rgb" or "bgr".`
        );
    }

    const output = new Uint8Array(width * height * 3);
    const source = tensor.data as Float32Array;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = y * width + x;
            const targetIndex = pixelIndex * 3;
            for (let channel = 0; channel < 3; channel++) {
                const sourceChannel =
                    runtimeOptions.outputChannelOrder === "bgr" ? 2 - channel : channel;
                const value = source[sourceChannel * width * height + pixelIndex];
                output[targetIndex + channel] = clampToUint8(value * runtimeOptions.outputScale);
            }
        }
    }

    return {
        doctrImage: {
            width,
            height,
            data: output,
        },
    };
}

function selectTextImageUnwarpingOutput(outputs: Record<string, OrtTensor>): OrtTensor {
    const candidates = Object.values(outputs).filter(
        (tensor) =>
            tensor.data instanceof Float32Array &&
            tensor.dims.length === 4 &&
            tensor.dims.every((dimension) => Number.isInteger(dimension) && dimension > 0)
    );
    if (candidates.length !== 1) {
        throw new Error(
            `Expected exactly one 4D Float32 text image unwarping output tensor, got ${candidates.length}.`
        );
    }
    return candidates[0] as OrtTensor;
}

function clampToUint8(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(255, Math.round(value)));
}
