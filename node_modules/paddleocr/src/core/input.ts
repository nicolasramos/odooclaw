import type { ImageInput } from "../interface.ts";
import { Image } from "./image.ts";

export function normalizeInputToRgb(input: ImageInput): Image {
    if (!Number.isInteger(input.width) || input.width <= 0) {
        throw new Error(`Invalid input width: ${input.width}. Expected a positive integer.`);
    }
    if (!Number.isInteger(input.height) || input.height <= 0) {
        throw new Error(`Invalid input height: ${input.height}. Expected a positive integer.`);
    }

    const pixels = input.width * input.height;
    const channels = input.data.length / pixels;
    if (!Number.isInteger(channels) || channels < 1 || channels > 4) {
        throw new Error(
            `Invalid input data length ${input.data.length} for image size ${input.width}x${input.height}. Expected 1, 2, 3, or 4 channels.`
        );
    }

    if (channels === 3) {
        return new Image(input.width, input.height, 3, input.data);
    }

    const rgb = new Uint8Array(pixels * 3);
    for (let pixelIndex = 0; pixelIndex < pixels; pixelIndex++) {
        const srcIndex = pixelIndex * channels;
        const dstIndex = pixelIndex * 3;

        if (channels === 1 || channels === 2) {
            const value = input.data[srcIndex];
            rgb[dstIndex] = value;
            rgb[dstIndex + 1] = value;
            rgb[dstIndex + 2] = value;
            continue;
        }

        rgb[dstIndex] = input.data[srcIndex];
        rgb[dstIndex + 1] = input.data[srcIndex + 1];
        rgb[dstIndex + 2] = input.data[srcIndex + 2];
    }

    return new Image(input.width, input.height, 3, rgb);
}
