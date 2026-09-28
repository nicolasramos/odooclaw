import type { Box } from "../interface.ts";
import type { ObjectDetectionBox } from "../modules/object-detection/postprocess.ts";
import { createTableStructureHtmlDocument } from "../modules/table-structure/postprocess.ts";

export interface TableRecognitionV2Cell {
    box: [number, number, number, number];
    row: number;
    column: number;
    rowspan: number;
    colspan: number;
    text: string;
}

export interface TableRecognitionV2HtmlResult {
    html: string;
    fullHtml: string;
    cells: TableRecognitionV2Cell[];
}

export interface TableRecognitionV2OcrResult {
    text: string;
    box: Box | readonly number[];
}

interface CellBox {
    box: [number, number, number, number];
    text: string;
    rowStart: number;
    rowEnd: number;
    columnStart: number;
    columnEnd: number;
}

export function recoverTableHtmlFromCells(
    cellBoxes: readonly ObjectDetectionBox[],
    ocrResults: readonly TableRecognitionV2OcrResult[] = []
): TableRecognitionV2HtmlResult {
    const boxes = cellBoxes
        .map((cell) => normalizeCellBox(cell.coordinate))
        .filter((box): box is [number, number, number, number] => Boolean(box));
    if (!boxes.length) {
        const html = "<tbody></tbody>";
        return { html, fullHtml: createTableStructureHtmlDocument(html), cells: [] };
    }

    const xLines = clusterGridLines(boxes.flatMap((box) => [box[0], box[2]]));
    const yLines = clusterGridLines(boxes.flatMap((box) => [box[1], box[3]]));
    const cells = boxes
        .map((box) => createCellBox(box, xLines, yLines, ocrResults))
        .sort((a, b) => a.rowStart - b.rowStart || a.columnStart - b.columnStart);

    const html = renderCellsToHtml(cells, yLines.length - 1);
    return {
        html,
        fullHtml: createTableStructureHtmlDocument(html),
        cells: cells.map((cell) => ({
            box: cell.box,
            row: cell.rowStart,
            column: cell.columnStart,
            rowspan: cell.rowEnd - cell.rowStart,
            colspan: cell.columnEnd - cell.columnStart,
            text: cell.text,
        })),
    };
}

function normalizeCellBox(
    coordinate: readonly [number, number, number, number]
): [number, number, number, number] | null {
    const x1 = Math.min(coordinate[0], coordinate[2]);
    const y1 = Math.min(coordinate[1], coordinate[3]);
    const x2 = Math.max(coordinate[0], coordinate[2]);
    const y2 = Math.max(coordinate[1], coordinate[3]);
    if (x2 <= x1 || y2 <= y1) {
        return null;
    }
    return [x1, y1, x2, y2];
}

function clusterGridLines(values: number[]): number[] {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) {
        return [];
    }
    const tolerance = estimateLineTolerance(sorted);
    const clusters: number[][] = [];
    for (const value of sorted) {
        const last = clusters[clusters.length - 1];
        if (!last || Math.abs(average(last) - value) > tolerance) {
            clusters.push([value]);
        } else {
            last.push(value);
        }
    }
    return clusters.map(average);
}

function estimateLineTolerance(sorted: readonly number[]): number {
    const gaps: number[] = [];
    for (let index = 1; index < sorted.length; index++) {
        const gap = sorted[index] - sorted[index - 1];
        if (gap > 1) {
            gaps.push(gap);
        }
    }
    if (!gaps.length) {
        return 4;
    }
    gaps.sort((a, b) => a - b);
    return Math.max(4, gaps[Math.floor(gaps.length / 2)] * 0.25);
}

function average(values: readonly number[]): number {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function createCellBox(
    box: [number, number, number, number],
    xLines: readonly number[],
    yLines: readonly number[],
    ocrResults: readonly TableRecognitionV2OcrResult[]
): CellBox {
    const columnStart = findNearestLineIndex(xLines, box[0]);
    const columnEnd = Math.max(columnStart + 1, findNearestLineIndex(xLines, box[2]));
    const rowStart = findNearestLineIndex(yLines, box[1]);
    const rowEnd = Math.max(rowStart + 1, findNearestLineIndex(yLines, box[3]));
    return {
        box,
        rowStart,
        rowEnd,
        columnStart,
        columnEnd,
        text: matchOcrTextToCell(box, ocrResults),
    };
}

function findNearestLineIndex(lines: readonly number[], value: number): number {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < lines.length; index++) {
        const distance = Math.abs(lines[index] - value);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    }
    return bestIndex;
}

function matchOcrTextToCell(
    cell: [number, number, number, number],
    ocrResults: readonly TableRecognitionV2OcrResult[]
): string {
    return ocrResults
        .filter((result) => isOcrCenterInsideCell(result, cell))
        .sort((a, b) => boxTop(a.box) - boxTop(b.box) || boxLeft(a.box) - boxLeft(b.box))
        .map((result) => result.text)
        .join(" ")
        .trim();
}

function isOcrCenterInsideCell(
    result: TableRecognitionV2OcrResult,
    cell: [number, number, number, number]
): boolean {
    const [x1, y1, x2, y2] = normalizeOcrBox(result.box);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    return cx >= cell[0] && cx <= cell[2] && cy >= cell[1] && cy <= cell[3];
}

function boxTop(box: Box | readonly number[]): number {
    return normalizeOcrBox(box)[1];
}

function boxLeft(box: Box | readonly number[]): number {
    return normalizeOcrBox(box)[0];
}

function normalizeOcrBox(box: Box | readonly number[]): [number, number, number, number] {
    if (Array.isArray(box)) {
        if (box.length === 4) {
            return [
                Math.min(box[0], box[2]),
                Math.min(box[1], box[3]),
                Math.max(box[0], box[2]),
                Math.max(box[1], box[3]),
            ];
        }
        if (box.length === 8) {
            const xs = [box[0], box[2], box[4], box[6]];
            const ys = [box[1], box[3], box[5], box[7]];
            return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        }
    }

    const points = box.polygon ?? box.points;
    if (points?.length) {
        return [
            Math.min(...points.map((point) => point.x)),
            Math.min(...points.map((point) => point.y)),
            Math.max(...points.map((point) => point.x)),
            Math.max(...points.map((point) => point.y)),
        ];
    }
    return [box.x, box.y, box.x + box.width, box.y + box.height];
}

function renderCellsToHtml(cells: readonly CellBox[], rowCount: number): string {
    const rows: string[] = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const rowCells = cells.filter((cell) => cell.rowStart === rowIndex);
        if (!rowCells.length) {
            continue;
        }
        rows.push(`<tr>${rowCells.map(renderCellToHtml).join("")}</tr>`);
    }
    return `<tbody>${rows.join("")}</tbody>`;
}

function renderCellToHtml(cell: CellBox): string {
    const rowspan = cell.rowEnd - cell.rowStart;
    const colspan = cell.columnEnd - cell.columnStart;
    const attrs = [
        rowspan > 1 ? ` rowspan="${rowspan}"` : "",
        colspan > 1 ? ` colspan="${colspan}"` : "",
    ].join("");
    return `<td${attrs}>${escapeHtml(cell.text)}</td>`;
}

function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
