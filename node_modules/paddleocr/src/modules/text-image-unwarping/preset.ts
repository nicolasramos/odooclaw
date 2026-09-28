import type {
    TextImageUnwarpingPresetName,
    TextImageUnwarpingRuntimeOptions,
} from "../../interface.ts";

export type TextImageUnwarpingModule = "text_image_unwarping";
export type TextImageUnwarpingArchitecture = "UVDoc";

export interface TextImageUnwarpingPreset {
    name: TextImageUnwarpingPresetName;
    module: TextImageUnwarpingModule;
    architecture: TextImageUnwarpingArchitecture;
    options: Partial<TextImageUnwarpingRuntimeOptions>;
}

const UVDOC_OPTIONS: Partial<TextImageUnwarpingRuntimeOptions> = {
    inputName: "img",
    mean: [0, 0, 0],
    stdDeviation: [1 / 255, 1 / 255, 1 / 255],
    channelOrder: "bgr",
    preprocessPipeline: ["Read", "Normalize", "ToCHW", "ToBatch"],
    postprocessName: "DocTr",
    outputScale: 255,
    outputChannelOrder: "bgr",
    resultImageKey: "doctr_img",
    dynamicInputShape: {
        min: [1, 3, 128, 64],
        opt: [1, 3, 256, 128],
        max: [8, 3, 512, 256],
    },
};

export const TEXT_IMAGE_UNWARPING_PRESETS: Record<
    TextImageUnwarpingPresetName,
    TextImageUnwarpingPreset
> = {
    UVDoc: {
        name: "UVDoc",
        module: "text_image_unwarping",
        architecture: "UVDoc",
        options: UVDOC_OPTIONS,
    },
};

export function getTextImageUnwarpingPreset(
    name: TextImageUnwarpingPresetName
): TextImageUnwarpingPreset {
    const preset = TEXT_IMAGE_UNWARPING_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported text image unwarping preset: ${name}`);
    }
    return preset;
}

export function getTextImageUnwarpingPresetOptions(
    name?: TextImageUnwarpingPresetName
): Partial<TextImageUnwarpingRuntimeOptions> {
    if (!name) {
        return {};
    }

    const options = getTextImageUnwarpingPreset(name).options;
    return {
        ...options,
        mean: options.mean ? [...options.mean] : undefined,
        stdDeviation: options.stdDeviation ? [...options.stdDeviation] : undefined,
        preprocessPipeline: options.preprocessPipeline
            ? [...options.preprocessPipeline]
            : undefined,
        dynamicInputShape: options.dynamicInputShape
            ? {
                  min: [...options.dynamicInputShape.min],
                  opt: [...options.dynamicInputShape.opt],
                  max: [...options.dynamicInputShape.max],
              }
            : undefined,
    };
}
