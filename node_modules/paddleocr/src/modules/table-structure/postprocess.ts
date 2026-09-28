import type { Box, OrtTensor, TableStructureRecognitionRuntimeOptions } from "../../interface.ts";
import type { TableStructureTensorSpec } from "./preprocess.ts";

export interface TableStructureRecognitionResult {
    bbox: number[][];
    structure: string[];
    html: string;
    fullHtml: string;
    structureScore: number;
}

export interface TableStructureOcrResult {
    text: string;
    box: Box | readonly number[];
}

export interface TableStructureOcrMatch {
    cellIndex: number;
    ocrIndices: number[];
    text: string;
    box: number[];
}

export interface TableStructureOcrMatchResult {
    html: string;
    fullHtml: string;
    matches: TableStructureOcrMatch[];
    cellTexts: string[];
}

type TableStructurePostprocessOptions = Pick<
    TableStructureRecognitionRuntimeOptions,
    "structureDictionary" | "mergeNoSpanStructure" | "locRegNum" | "ignoreBboxes"
>;

interface MatchedTableCellText {
    text: string;
    html: string;
}

export function postprocessTableStructure(
    outputs: Record<string, OrtTensor>,
    shape: TableStructureTensorSpec,
    options: TableStructurePostprocessOptions
): TableStructureRecognitionResult {
    const characters = createTableStructureCharacters(options);
    const structureTensor = selectTableStructureOutputTensor(
        outputs,
        "structure_probs",
        characters.length
    );
    const locTensor = selectTableStructureOutputTensor(outputs, "loc_preds", options.locRegNum);
    const structureData = extractTableStructureOutputData(structureTensor, "structure_probs");
    const locData = extractTableStructureOutputData(locTensor, "loc_preds");
    const [batchSize, sequenceLength, classCount] = validateTableStructureTensorShape(
        structureTensor,
        structureData,
        "structure_probs"
    );
    const [, locSequenceLength, locRegNum] = validateTableStructureTensorShape(
        locTensor,
        locData,
        "loc_preds"
    );
    validateTableStructureShape(shape);

    if (batchSize !== 1) {
        throw new Error(
            `Unsupported table structure batch size ${batchSize}. Expected batch size 1.`
        );
    }
    if (locSequenceLength !== sequenceLength) {
        throw new Error(
            `Table structure loc_preds sequence length ${locSequenceLength} does not match structure_probs length ${sequenceLength}.`
        );
    }
    if (classCount !== characters.length) {
        throw new Error(
            `Table structure class count ${classCount} does not match dictionary size ${characters.length}.`
        );
    }
    if (options.locRegNum !== undefined && locRegNum !== options.locRegNum) {
        throw new Error(
            `Table structure loc_preds width ${locRegNum} does not match locRegNum ${options.locRegNum}.`
        );
    }
    if (locRegNum % 2 !== 0) {
        throw new Error(
            `Invalid table structure locRegNum: ${locRegNum}. Expected an even number.`
        );
    }

    return decodeTableStructure(structureData, locData, characters, {
        sequenceLength,
        classCount,
        locRegNum,
        shape: shape.data,
        ignoreBboxes: options.ignoreBboxes,
    });
}

function createTableStructureCharacters(options: TableStructurePostprocessOptions): string[] {
    const dictionary = options.structureDictionary;
    if (!dictionary?.length) {
        throw new Error("Table structure structureDictionary is required for TableLabelDecode.");
    }

    const characters = [...dictionary];
    if (options.mergeNoSpanStructure) {
        if (!characters.includes("<td></td>")) {
            characters.push("<td></td>");
        }
        const emptyTdIndex = characters.indexOf("<td>");
        if (emptyTdIndex !== -1) {
            characters.splice(emptyTdIndex, 1);
        }
    }

    return ["sos", ...characters, "eos"];
}

function selectTableStructureOutputTensor(
    outputs: Record<string, OrtTensor>,
    preferredName: string,
    lastDimension?: number
): OrtTensor {
    const namedTensor = outputs[preferredName];
    if (namedTensor && isTableStructureOutputTensor(namedTensor, lastDimension)) {
        return namedTensor;
    }

    const candidates = Object.values(outputs).filter((tensor) =>
        isTableStructureOutputTensor(tensor, lastDimension)
    );
    if (candidates.length === 1) {
        return candidates[0];
    }

    throw new Error(
        `Table structure output tensor '${preferredName}' not found. Available keys: ${Object.keys(outputs).join(", ")}`
    );
}

function isTableStructureOutputTensor(tensor: OrtTensor, lastDimension?: number): boolean {
    return (
        tensor.data instanceof Float32Array &&
        tensor.dims.length === 3 &&
        tensor.dims[0] === 1 &&
        tensor.dims[1] > 0 &&
        tensor.dims[2] > 0 &&
        (lastDimension === undefined || tensor.dims[2] === lastDimension)
    );
}

function extractTableStructureOutputData(tensor: OrtTensor, name: string): Float32Array {
    if (!(tensor.data instanceof Float32Array)) {
        throw new Error(`Table structure ${name} tensor must contain Float32Array data.`);
    }
    return tensor.data;
}

function validateTableStructureTensorShape(
    tensor: OrtTensor,
    data: Float32Array,
    name: string
): [number, number, number] {
    const [batchSize, sequenceLength, width] = tensor.dims;
    if (tensor.dims.length !== 3 || batchSize <= 0 || sequenceLength <= 0 || width <= 0) {
        throw new Error(
            `Unsupported table structure ${name} shape [${tensor.dims.join(",")}]. Expected [1,T,C].`
        );
    }
    if (data.length !== batchSize * sequenceLength * width) {
        throw new Error(
            `Table structure ${name} shape [${tensor.dims.join(",")}] does not match data length ${data.length}.`
        );
    }
    return [batchSize, sequenceLength, width];
}

function validateTableStructureShape(shape: TableStructureTensorSpec) {
    if (!(shape.data instanceof Float32Array) || shape.dims.length !== 2 || shape.dims[1] !== 6) {
        throw new Error(
            `Unsupported table structure shape tensor [${shape.dims.join(",")}]. Expected [1,6].`
        );
    }
    if (shape.data.length !== 6) {
        throw new Error(
            `Table structure shape tensor [${shape.dims.join(",")}] does not match data length ${shape.data.length}.`
        );
    }
}

function decodeTableStructure(
    structureData: Float32Array,
    locData: Float32Array,
    characters: string[],
    options: {
        sequenceLength: number;
        classCount: number;
        locRegNum: number;
        shape: Float32Array;
        ignoreBboxes?: boolean;
    }
): TableStructureRecognitionResult {
    const eosIndex = characters.length - 1;
    const structure: string[] = [];
    const bbox: number[][] = [];
    const scores: number[] = [];
    const tdTokens = new Set(["<td>", "<td", "<td></td>"]);

    for (let index = 0; index < options.sequenceLength; index++) {
        const { classIndex, score } = findMaxClass(
            structureData,
            index * options.classCount,
            options.classCount
        );
        if (index > 0 && classIndex === eosIndex) {
            break;
        }
        if (classIndex === 0 || classIndex === eosIndex) {
            continue;
        }

        const text = characters[classIndex];
        if (tdTokens.has(text) && !options.ignoreBboxes) {
            bbox.push(
                decodeTableStructureBbox(
                    locData,
                    index * options.locRegNum,
                    options.locRegNum,
                    options.shape
                )
            );
        }
        structure.push(text);
        scores.push(score);
    }

    return {
        bbox,
        structure,
        html: structure.join(""),
        fullHtml: createTableStructureHtmlDocument(structure),
        structureScore: scores.length
            ? scores.reduce((total, score) => total + score, 0) / scores.length
            : 0,
    };
}

export function matchTableStructureToOcr(
    table: Pick<TableStructureRecognitionResult, "bbox" | "structure">,
    ocrResults: readonly TableStructureOcrResult[],
    options: { filterOcrAboveTable?: boolean } = {}
): TableStructureOcrMatchResult {
    const cellBoxes = table.bbox.map((box, index) => normalizeTableCellBox(box, index));
    const matchedOcrIndices = matchOcrToTableCells(
        cellBoxes,
        options.filterOcrAboveTable
            ? filterOcrResultsAboveTable(ocrResults, cellBoxes)
            : ocrResults.map((result, index) => ({ result, index }))
    );
    const cellTextEntries = cellBoxes.map((_, cellIndex) =>
        createMatchedTableCellText(matchedOcrIndices[cellIndex] ?? [], ocrResults)
    );
    const html = fillTableStructureHtml(table.structure, cellTextEntries);

    return {
        html,
        fullHtml: createTableStructureHtmlDocument(html),
        matches: cellBoxes.map((box, cellIndex) => ({
            cellIndex,
            ocrIndices: matchedOcrIndices[cellIndex] ?? [],
            text: cellTextEntries[cellIndex]?.text ?? "",
            box,
        })),
        cellTexts: cellTextEntries.map((entry) => entry.text),
    };
}

export function createTableStructureHtmlDocument(structure: string | readonly string[]): string {
    const tableContent = Array.isArray(structure) ? structure.join("") : structure;
    return `<html><body><table>${tableContent}</table></body></html>`;
}

function findMaxClass(
    data: Float32Array,
    offset: number,
    classCount: number
): { classIndex: number; score: number } {
    let classIndex = 0;
    let score = data[offset];
    for (let index = 1; index < classCount; index++) {
        const currentScore = data[offset + index];
        if (currentScore > score) {
            classIndex = index;
            score = currentScore;
        }
    }
    return { classIndex, score };
}

function decodeTableStructureBbox(
    locData: Float32Array,
    offset: number,
    locRegNum: number,
    shape: Float32Array
): number[] {
    const [, , ratioHeight, ratioWidth, paddedHeight, paddedWidth] = shape;
    const bbox: number[] = [];
    for (let index = 0; index < locRegNum; index++) {
        const value = locData[offset + index];
        bbox.push(
            index % 2 === 0
                ? (value * paddedWidth) / ratioWidth
                : (value * paddedHeight) / ratioHeight
        );
    }
    return bbox;
}

function matchOcrToTableCells(
    cellBoxes: readonly number[][],
    indexedOcrResults: ReadonlyArray<{ result: TableStructureOcrResult; index: number }>
): number[][] {
    const matchedOcrIndices = cellBoxes.map(() => [] as number[]);
    if (!cellBoxes.length) {
        return matchedOcrIndices;
    }

    for (const { result, index } of indexedOcrResults) {
        const ocrBox = normalizeOcrBox(result.box, index);
        let bestCellIndex = 0;
        let bestIouDistance = Number.POSITIVE_INFINITY;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let cellIndex = 0; cellIndex < cellBoxes.length; cellIndex++) {
            const cellBox = cellBoxes[cellIndex];
            const iouDistance = 1 - calculateBoxIou(ocrBox, cellBox);
            const distance = calculateOfficialTableMatchDistance(ocrBox, cellBox);
            if (
                iouDistance < bestIouDistance ||
                (iouDistance === bestIouDistance && distance < bestDistance)
            ) {
                bestCellIndex = cellIndex;
                bestIouDistance = iouDistance;
                bestDistance = distance;
            }
        }
        matchedOcrIndices[bestCellIndex].push(index);
    }

    return matchedOcrIndices;
}

function filterOcrResultsAboveTable(
    ocrResults: readonly TableStructureOcrResult[],
    cellBoxes: readonly number[][]
): Array<{ result: TableStructureOcrResult; index: number }> {
    if (!cellBoxes.length) {
        return [];
    }
    const tableTop = Math.min(...cellBoxes.map((box) => box[1]));
    return ocrResults
        .map((result, index) => ({ result, index }))
        .filter(({ result, index }) => normalizeOcrBox(result.box, index)[3] >= tableTop);
}

function fillTableStructureHtml(
    structure: readonly string[],
    cellTexts: readonly MatchedTableCellText[]
) {
    const parts: string[] = [];
    let cellIndex = 0;

    for (const tag of structure) {
        if (tag.includes("</td>")) {
            const text = cellTexts[cellIndex]?.html ?? "";
            if (tag === "<td></td>") {
                parts.push("<td>", text, "</td>");
            } else {
                parts.push(text, tag);
            }
            cellIndex++;
        } else {
            parts.push(tag);
        }
    }

    return parts.join("");
}

function createMatchedTableCellText(
    ocrIndices: readonly number[],
    ocrResults: readonly TableStructureOcrResult[]
) {
    const isMultiline = ocrIndices.length > 1;
    const wrapBold = isMultiline && (ocrResults[ocrIndices[0]]?.text ?? "").includes("<b>");
    const fragments: string[] = [];

    for (let textIndex = 0; textIndex < ocrIndices.length; textIndex++) {
        let text = ocrResults[ocrIndices[textIndex]]?.text ?? "";
        if (isMultiline) {
            text = cleanMultilineTableCellText(text);
            if (!text) {
                continue;
            }
            if (textIndex !== ocrIndices.length - 1 && !text.endsWith(" ")) {
                text = `${text} `;
            }
        }
        fragments.push(text);
    }

    const escapedText = fragments.map((text) => escapeHtml(text)).join("");
    return {
        text: fragments.join(""),
        html: wrapBold ? `<b>${escapedText}</b>` : escapedText,
    };
}

function cleanMultilineTableCellText(text: string) {
    let result = text;
    if (result.startsWith(" ")) {
        result = result.slice(1);
    }
    if (result.includes("<b>")) {
        result = result.slice(3);
    }
    if (result.includes("</b>")) {
        result = result.slice(0, -4);
    }
    return result;
}

function normalizeTableCellBox(box: readonly number[], index: number): number[] {
    return normalizeCoordinateBox(box, `table cell ${index}`);
}

function normalizeOcrBox(box: Box | readonly number[], index: number): number[] {
    if (Array.isArray(box)) {
        return normalizeCoordinateBox(box, `OCR box ${index}`);
    }

    const { x, y, width, height } = box;
    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 0 ||
        height < 0
    ) {
        throw new Error(`Invalid OCR box ${index}. Expected finite x/y/width/height.`);
    }
    return [x, y, x + width, y + height];
}

function normalizeCoordinateBox(box: readonly number[], name: string): number[] {
    if (box.length !== 4 && box.length !== 8) {
        throw new Error(`Invalid ${name} coordinate length ${box.length}. Expected 4 or 8.`);
    }
    if (box.some((value) => !Number.isFinite(value))) {
        throw new Error(`Invalid ${name} coordinates. Expected finite numbers.`);
    }

    if (box.length === 4) {
        const [x1, y1, x2, y2] = box;
        return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
    }

    const xs = [box[0], box[2], box[4], box[6]];
    const ys = [box[1], box[3], box[5], box[7]];
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function calculateOfficialTableMatchDistance(boxA: readonly number[], boxB: readonly number[]) {
    const [x1, y1, x2, y2] = boxA;
    const [x3, y3, x4, y4] = boxB;
    const fullDistance =
        Math.abs(x3 - x1) + Math.abs(y3 - y1) + Math.abs(x4 - x2) + Math.abs(y4 - y2);
    const topLeftDistance = Math.abs(x3 - x1) + Math.abs(y3 - y1);
    const bottomRightDistance = Math.abs(x4 - x2) + Math.abs(y4 - y2);
    return fullDistance + Math.min(topLeftDistance, bottomRightDistance);
}

function calculateBoxIou(boxA: readonly number[], boxB: readonly number[]) {
    const areaA = Math.max(0, boxA[2] - boxA[0]) * Math.max(0, boxA[3] - boxA[1]);
    const areaB = Math.max(0, boxB[2] - boxB[0]) * Math.max(0, boxB[3] - boxB[1]);
    const intersectionLeft = Math.max(boxA[0], boxB[0]);
    const intersectionTop = Math.max(boxA[1], boxB[1]);
    const intersectionRight = Math.min(boxA[2], boxB[2]);
    const intersectionBottom = Math.min(boxA[3], boxB[3]);
    const intersection =
        Math.max(0, intersectionRight - intersectionLeft) *
        Math.max(0, intersectionBottom - intersectionTop);
    const union = areaA + areaB - intersection;
    return union > 0 ? intersection / union : 0;
}

function escapeHtml(text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}
