import { offsetClosedPolygonRound } from "../../core/geometry/clipper-offset.ts";
import { approxPolyDP, type ContourCandidate, findContours } from "../../core/geometry/contours.ts";
import { Image } from "../../core/image.ts";
import type { Box, DetectionRuntimeOptions, Point } from "../../interface.ts";
import type { PreprocessDetectionResult, ResizeParams } from "./preprocess.ts";

const DB_MIN_SIZE = 3;

export function postprocessDetection(
    detection: Float32Array,
    input: PreprocessDetectionResult,
    runtimeOptions: DetectionRuntimeOptions
): Box[] {
    validateScoreMode(runtimeOptions.scoreMode);
    validateBoxType(runtimeOptions.boxType);
    validateDilationKernelSize(runtimeOptions.dilationKernelSize);
    const { dstWidth, dstHeight } = input.resizeParams;
    const scoreMap = resolveDetectionMap(detection, dstWidth, dstHeight);
    const thresholdedImage = new Image(
        dstWidth,
        dstHeight,
        1,
        createDetectionBitmap(scoreMap, runtimeOptions.textPixelThreshold)
    );
    const bitmapImage =
        runtimeOptions.dilationKernelSize > 0
            ? thresholdedImage.dilate({
                  norm: "LInf",
                  k: runtimeOptions.dilationKernelSize,
              })
            : thresholdedImage;
    const contours = findContours(bitmapImage.data, dstWidth, dstHeight, {
        minimumAreaThreshold: runtimeOptions.minimumAreaThreshold,
    });
    const finalBoxes: Box[] = [];

    for (const contour of contours.slice(0, runtimeOptions.maxCandidates)) {
        const box =
            runtimeOptions.boxType === "poly"
                ? postprocessPolygonContour(contour, scoreMap, input, runtimeOptions)
                : postprocessQuadContour(contour, scoreMap, input, runtimeOptions);
        if (!box) {
            continue;
        }
        finalBoxes.push(box);
    }

    return finalBoxes;
}

function validateScoreMode(scoreMode: DetectionRuntimeOptions["scoreMode"]) {
    if (scoreMode === "fast" || scoreMode === "slow") {
        return;
    }
    throw new Error(`Unsupported DB scoreMode: ${String(scoreMode)}. Expected "fast" or "slow".`);
}

function validateBoxType(boxType: DetectionRuntimeOptions["boxType"]) {
    if (boxType === "quad" || boxType === "poly") {
        return;
    }
    throw new Error(`Unsupported DB boxType: ${String(boxType)}. Expected "quad" or "poly".`);
}

function validateDilationKernelSize(
    dilationKernelSize: DetectionRuntimeOptions["dilationKernelSize"]
) {
    if (Number.isInteger(dilationKernelSize) && dilationKernelSize >= 0) {
        return;
    }
    throw new Error(
        `Invalid DB dilationKernelSize: ${String(dilationKernelSize)}. Expected a non-negative integer.`
    );
}

function postprocessQuadContour(
    contour: ContourCandidate,
    scoreMap: Float32Array,
    input: PreprocessDetectionResult,
    runtimeOptions: DetectionRuntimeOptions
): Box | null {
    const { dstWidth, dstHeight } = input.resizeParams;
    const miniBox = getMiniBox(contour.points);
    if (!miniBox) {
        return null;
    }
    if (miniBox.shortSide < DB_MIN_SIZE) {
        return null;
    }
    const scorePoints = runtimeOptions.scoreMode === "slow" ? contour.points : miniBox.points;
    const score = boxScoreFast(scoreMap, dstWidth, dstHeight, scorePoints);
    if (score < runtimeOptions.boxScoreThreshold) {
        return null;
    }

    const unclipped = unclipPolygon(miniBox.points, runtimeOptions.unclipRatio);
    const unclippedMiniBox = getMiniBox(unclipped);
    if (!unclippedMiniBox || unclippedMiniBox.shortSide < DB_MIN_SIZE + 2) {
        return null;
    }

    const points = convertQuadToOriginalCoordinates(unclippedMiniBox.points, input.resizeParams);
    const orderedPoints = orderPointsClockwise(points);
    return pointsToBox(orderedPoints, input.resizeParams.srcWidth, input.resizeParams.srcHeight);
}

function postprocessPolygonContour(
    contour: ContourCandidate,
    scoreMap: Float32Array,
    input: PreprocessDetectionResult,
    runtimeOptions: DetectionRuntimeOptions
): Box | null {
    const { dstWidth, dstHeight } = input.resizeParams;
    const points = approximatePolygonContour(contour.points);
    if (points.length < 4) {
        return null;
    }
    const score = boxScoreFast(scoreMap, dstWidth, dstHeight, points);
    if (score < runtimeOptions.boxScoreThreshold) {
        return null;
    }

    const unclipped = unclipPolygon(points, runtimeOptions.unclipRatio);
    const miniBox = getMiniBox(unclipped);
    if (!miniBox || miniBox.shortSide < DB_MIN_SIZE + 2) {
        return null;
    }

    const polygon = convertPolygonToOriginalCoordinates(unclipped, input.resizeParams);
    return polygonToBox(polygon, input.resizeParams.srcWidth, input.resizeParams.srcHeight);
}

function approximatePolygonContour(points: Point[]): Point[] {
    return approxPolyDP(points, 0.002 * polygonPerimeter(points), true);
}

export function boxScoreFast(
    scoreMap: Float32Array,
    width: number,
    height: number,
    points: readonly Point[]
): number {
    const minX = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map((point) => point.x))));
    const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((point) => point.y))));
    const localPolygon = points.map((point) => ({
        x: Math.trunc(point.x - minX),
        y: Math.trunc(point.y - minY),
    }));
    let sum = 0;
    let count = 0;

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (!isPointInPolygonInclusive({ x: x - minX, y: y - minY }, localPolygon)) {
                continue;
            }
            sum += scoreMap[y * width + x];
            count++;
        }
    }

    return count > 0 ? sum / count : 0;
}

function resolveDetectionMap(detection: Float32Array, width: number, height: number): Float32Array {
    const pixelCount = width * height;
    if (detection.length < pixelCount || detection.length % pixelCount !== 0) {
        throw new Error(
            `Invalid DB output length: got ${detection.length} values for ${width}x${height} score maps; expected one or more complete channels of ${pixelCount} values.`
        );
    }
    return detection.slice(0, pixelCount);
}

function createDetectionBitmap(scoreMap: Float32Array, threshold: number): Uint8Array {
    const bitmap = new Uint8Array(scoreMap.length);
    for (let i = 0; i < scoreMap.length; i++) {
        bitmap[i] = scoreMap[i] > threshold ? 255 : 0;
    }
    return bitmap;
}

function getMiniBox(
    points: Point[]
): { points: [Point, Point, Point, Point]; shortSide: number } | null {
    if (points.length < 3) {
        return null;
    }
    const hull = convexHull(points);
    if (hull.length < 3) {
        return null;
    }
    let bestBox: [Point, Point, Point, Point] | null = null;
    let bestArea = Infinity;
    let bestShortSide = 0;

    for (let i = 0; i < hull.length; i++) {
        const current = hull[i];
        const next = hull[(i + 1) % hull.length];
        const angle = Math.atan2(next.y - current.y, next.x - current.x);
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const point of hull) {
            const rotatedX = point.x * cos - point.y * sin;
            const rotatedY = point.x * sin + point.y * cos;
            minX = Math.min(minX, rotatedX);
            maxX = Math.max(maxX, rotatedX);
            minY = Math.min(minY, rotatedY);
            maxY = Math.max(maxY, rotatedY);
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const area = width * height;
        if (area >= bestArea) {
            continue;
        }

        const corners = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
        ].map((point) => rotatePoint(point, angle));

        bestBox = orderPointsClockwise(corners);
        bestArea = area;
        bestShortSide = Math.min(width, height);
    }

    if (!bestBox) {
        return null;
    }

    return {
        points: bestBox,
        shortSide: bestShortSide,
    };
}

function convexHull(points: Point[]): Point[] {
    const sorted = [...points]
        .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
        .filter(
            (point, index, array) =>
                index === 0 || point.x !== array[index - 1].x || point.y !== array[index - 1].y
        );
    if (sorted.length <= 1) {
        return sorted;
    }

    const lower: Point[] = [];
    for (const point of sorted) {
        while (
            lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
        ) {
            lower.pop();
        }
        lower.push(point);
    }

    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const point = sorted[i];
        while (
            upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
        ) {
            upper.pop();
        }
        upper.push(point);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function rotatePoint(point: Point, angle: number): Point {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos,
    };
}

function unclipPolygon(points: Point[], unclipRatio: number): Point[] {
    const area = Math.abs(polygonArea(points));
    const perimeter = polygonPerimeter(points);
    if (area <= 0 || perimeter <= 0) {
        return points;
    }
    const distance = (area * unclipRatio) / perimeter;
    return offsetClosedPolygonRound(points, distance);
}

function convertQuadToOriginalCoordinates(
    points: [Point, Point, Point, Point],
    resizeParams: ResizeParams
): [Point, Point, Point, Point] {
    return points.map((point) => ({
        x: point.x / resizeParams.scaleWidth,
        y: point.y / resizeParams.scaleHeight,
    })) as [Point, Point, Point, Point];
}

function convertPolygonToOriginalCoordinates(points: Point[], resizeParams: ResizeParams): Point[] {
    return points.map((point) => ({
        x: point.x / resizeParams.scaleWidth,
        y: point.y / resizeParams.scaleHeight,
    }));
}

export function orderPointsClockwise(points: Point[]): [Point, Point, Point, Point] {
    if (points.length !== 4) {
        throw new Error(`Expected exactly four points, got ${points.length}.`);
    }

    const sortedByX = [...points].sort((a, b) => a.x - b.x);
    const [leftA, leftB, rightA, rightB] = sortedByX;
    const topLeft = leftB.y > leftA.y ? leftA : leftB;
    const bottomLeft = leftB.y > leftA.y ? leftB : leftA;
    const topRight = rightB.y > rightA.y ? rightA : rightB;
    const bottomRight = rightB.y > rightA.y ? rightB : rightA;
    return [topLeft, topRight, bottomRight, bottomLeft];
}

function pointsToBox(
    points: [Point, Point, Point, Point],
    imageWidth: number,
    imageHeight: number
): Box | null {
    const clippedPoints = points.map((point) =>
        clipDetectionPoint(point, imageWidth, imageHeight)
    ) as [Point, Point, Point, Point];
    if (!hasOfficialQuadSize(clippedPoints)) {
        return null;
    }
    const minX = Math.floor(Math.min(...clippedPoints.map((point) => point.x)));
    const maxX = Math.ceil(Math.max(...clippedPoints.map((point) => point.x)));
    const minY = Math.floor(Math.min(...clippedPoints.map((point) => point.y)));
    const maxY = Math.ceil(Math.max(...clippedPoints.map((point) => point.y)));
    const width = Math.min(imageWidth - minX, maxX - minX);
    const height = Math.min(imageHeight - minY, maxY - minY);

    if (width <= 0 || height <= 0) {
        return null;
    }

    return {
        x: minX,
        y: minY,
        width,
        height,
        points: clippedPoints,
    };
}

export function hasOfficialQuadSize(points: [Point, Point, Point, Point]): boolean {
    const rectWidth = Math.trunc(Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
    const rectHeight = Math.trunc(Math.hypot(points[0].x - points[3].x, points[0].y - points[3].y));
    return rectWidth > DB_MIN_SIZE && rectHeight > DB_MIN_SIZE;
}

function polygonToBox(points: Point[], imageWidth: number, imageHeight: number): Box | null {
    const clippedPoints = points.map((point) => clipDetectionPoint(point, imageWidth, imageHeight));
    const minX = Math.floor(Math.min(...clippedPoints.map((point) => point.x)));
    const maxX = Math.ceil(Math.max(...clippedPoints.map((point) => point.x)));
    const minY = Math.floor(Math.min(...clippedPoints.map((point) => point.y)));
    const maxY = Math.ceil(Math.max(...clippedPoints.map((point) => point.y)));
    const width = Math.min(imageWidth - minX, maxX - minX);
    const height = Math.min(imageHeight - minY, maxY - minY);

    if (width <= 0 || height <= 0) {
        return null;
    }

    return {
        x: minX,
        y: minY,
        width,
        height,
        polygon: clippedPoints,
    };
}

function clipDetectionPoint(point: Point, imageWidth: number, imageHeight: number): Point {
    const maxX = Math.max(0, imageWidth - 1);
    const maxY = Math.max(0, imageHeight - 1);
    return {
        x: Math.max(0, Math.min(maxX, Math.round(point.x))),
        y: Math.max(0, Math.min(maxY, Math.round(point.y))),
    };
}

function cross(origin: Point, pointA: Point, pointB: Point): number {
    return (
        (pointA.x - origin.x) * (pointB.y - origin.y) -
        (pointA.y - origin.y) * (pointB.x - origin.x)
    );
}

function isPointInPolygonInclusive(point: Point, polygon: readonly Point[]): boolean {
    let inside = false;
    for (
        let index = 0, previousIndex = polygon.length - 1;
        index < polygon.length;
        previousIndex = index++
    ) {
        const current = polygon[index];
        const previous = polygon[previousIndex];
        if (isPointOnSegment(point, previous, current)) {
            return true;
        }
        const intersects =
            current.y > point.y !== previous.y > point.y &&
            point.x <
                ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) +
                    current.x;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

function isPointOnSegment(point: Point, start: Point, end: Point): boolean {
    const area = cross(start, end, point);
    if (Math.abs(area) > 1e-6) {
        return false;
    }
    return (
        point.x >= Math.min(start.x, end.x) - 1e-6 &&
        point.x <= Math.max(start.x, end.x) + 1e-6 &&
        point.y >= Math.min(start.y, end.y) - 1e-6 &&
        point.y <= Math.max(start.y, end.y) + 1e-6
    );
}

function polygonArea(points: readonly Point[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        area += current.x * next.y - next.x * current.y;
    }
    return area / 2;
}

function polygonPerimeter(points: readonly Point[]): number {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        perimeter += Math.hypot(current.x - next.x, current.y - next.y);
    }
    return perimeter;
}
