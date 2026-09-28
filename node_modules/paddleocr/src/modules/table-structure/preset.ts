import type {
    TableStructureRecognitionPresetName,
    TableStructureRecognitionRuntimeOptions,
} from "../../interface.ts";

export type TableStructureRecognitionModule = "table_structure_recognition";
export type TableStructureRecognitionArchitecture = "SLANet" | "SLANeXt";

export interface TableStructureRecognitionPreset {
    name: TableStructureRecognitionPresetName;
    module: TableStructureRecognitionModule;
    architecture: TableStructureRecognitionArchitecture;
    options: Partial<TableStructureRecognitionRuntimeOptions>;
}

const SLANET_STRUCTURE_DICTIONARY = [
    "<thead>",
    "</thead>",
    "<tbody>",
    "</tbody>",
    "<tr>",
    "</tr>",
    "<td>",
    "<td",
    ">",
    "</td>",
    ' colspan="2"',
    ' colspan="3"',
    ' colspan="4"',
    ' colspan="5"',
    ' colspan="6"',
    ' colspan="7"',
    ' colspan="8"',
    ' colspan="9"',
    ' colspan="10"',
    ' colspan="11"',
    ' colspan="12"',
    ' colspan="13"',
    ' colspan="14"',
    ' colspan="15"',
    ' colspan="16"',
    ' colspan="17"',
    ' colspan="18"',
    ' colspan="19"',
    ' colspan="20"',
    ' rowspan="2"',
    ' rowspan="3"',
    ' rowspan="4"',
    ' rowspan="5"',
    ' rowspan="6"',
    ' rowspan="7"',
    ' rowspan="8"',
    ' rowspan="9"',
    ' rowspan="10"',
    ' rowspan="11"',
    ' rowspan="12"',
    ' rowspan="13"',
    ' rowspan="14"',
    ' rowspan="15"',
    ' rowspan="16"',
    ' rowspan="17"',
    ' rowspan="18"',
    ' rowspan="19"',
    ' rowspan="20"',
];

const SLANET_OPTIONS: Partial<TableStructureRecognitionRuntimeOptions> = {
    imageHeight: 488,
    imageWidth: 488,
    maxSideLength: 488,
    mean: [0.485 * 255, 0.456 * 255, 0.406 * 255],
    stdDeviation: [1 / 0.229 / 255, 1 / 0.224 / 255, 1 / 0.225 / 255],
    channelOrder: "bgr",
    maxTextLength: 500,
    locRegNum: 8,
    mergeNoSpanStructure: true,
    replaceEmptyCellToken: false,
    learnEmptyBox: false,
    structureDictionary: SLANET_STRUCTURE_DICTIONARY,
};

const SLANEXT_OPTIONS: Partial<TableStructureRecognitionRuntimeOptions> = {
    ...SLANET_OPTIONS,
    imageHeight: 512,
    imageWidth: 512,
    maxSideLength: 512,
    ignoreBboxes: true,
};

export const TABLE_STRUCTURE_RECOGNITION_PRESETS: Record<
    TableStructureRecognitionPresetName,
    TableStructureRecognitionPreset
> = {
    SLANet: {
        name: "SLANet",
        module: "table_structure_recognition",
        architecture: "SLANet",
        options: SLANET_OPTIONS,
    },
    SLANeXt_wired: {
        name: "SLANeXt_wired",
        module: "table_structure_recognition",
        architecture: "SLANeXt",
        options: SLANEXT_OPTIONS,
    },
    SLANeXt_wireless: {
        name: "SLANeXt_wireless",
        module: "table_structure_recognition",
        architecture: "SLANeXt",
        options: SLANEXT_OPTIONS,
    },
};

export function getTableStructureRecognitionPreset(
    name: TableStructureRecognitionPresetName
): TableStructureRecognitionPreset {
    const preset = TABLE_STRUCTURE_RECOGNITION_PRESETS[name];
    if (!preset) {
        throw new Error(`Unsupported table structure recognition preset: ${name}`);
    }
    return preset;
}

export function getTableStructureRecognitionPresetOptions(
    name?: TableStructureRecognitionPresetName
): Partial<TableStructureRecognitionRuntimeOptions> {
    if (!name) {
        return {};
    }

    const options = getTableStructureRecognitionPreset(name).options;
    return {
        ...options,
        structureDictionary: options.structureDictionary
            ? [...options.structureDictionary]
            : undefined,
    };
}
