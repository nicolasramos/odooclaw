import type { Point } from "../../interface.ts";

export interface ContourCandidate {
    area: number;
    points: Point[];
    pixels: Point[];
}

export interface FindContoursOptions {
    minimumAreaThreshold: number;
}

export function findContours(
    bitmap: Uint8Array,
    width: number,
    height: number,
    options: FindContoursOptions
): ContourCandidate[] {
    const visited = new Uint8Array(width * height);
    const contours: ContourCandidate[] = [];
    const at = (x: number, y: number) => y * width + x;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const startIndex = at(x, y);
            if (!bitmap[startIndex] || visited[startIndex]) {
                continue;
            }

            const queue: Point[] = [{ x, y }];
            const points: Point[] = [];
            const boundary: Point[] = [];
            let queueHead = 0;
            visited[startIndex] = 1;

            while (queueHead < queue.length) {
                const point = queue[queueHead];
                queueHead++;
                points.push(point);
                if (isBoundaryPoint(bitmap, width, height, point.x, point.y)) {
                    boundary.push(point);
                }

                for (const [dx, dy] of [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                    [-1, -1],
                    [1, -1],
                    [-1, 1],
                    [1, 1],
                ]) {
                    const nextX = point.x + dx;
                    const nextY = point.y + dy;
                    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
                        continue;
                    }
                    const nextIndex = at(nextX, nextY);
                    if (!bitmap[nextIndex] || visited[nextIndex]) {
                        continue;
                    }
                    visited[nextIndex] = 1;
                    queue.push({ x: nextX, y: nextY });
                }
            }

            if (points.length >= options.minimumAreaThreshold && boundary.length >= 3) {
                const orderedBoundaries = traceComponentBoundaries(points, bitmap, width, height);
                for (const orderedBoundary of orderedBoundaries) {
                    contours.push({
                        area: Math.abs(polygonArea(orderedBoundary)),
                        points: orderedBoundary,
                        pixels: points,
                    });
                }
            }
        }
    }

    return contours;
}

export function approxPolyDP(points: Point[], epsilon: number, closed: boolean): Point[] {
    if (epsilon < 0 || !Number.isFinite(epsilon)) {
        throw new Error("Epsilon must be a finite non-negative number");
    }
    if (points.length <= 2) {
        return [...points];
    }

    const curve = closed ? removeDuplicateClosingPoint(points) : [...points];
    if (curve.length <= 2) {
        return curve;
    }
    if (closed) {
        return approxClosedPolyDP(curve, epsilon);
    }

    return approxOpenPolyDP(curve, epsilon);
}

function approxClosedPolyDP(curve: Point[], epsilon: number): Point[] {
    const splitIndex = findFarthestPointIndex(curve, curve[0]);
    if (splitIndex <= 0) {
        return [...curve];
    }

    const firstArc = approxOpenPolyDP(curve.slice(0, splitIndex + 1), epsilon);
    const secondArc = approxOpenPolyDP([...curve.slice(splitIndex), curve[0]], epsilon);
    const approximated = dedupeAdjacentPoints([...firstArc, ...secondArc.slice(1, -1)]);
    return approximated.length >= 3 ? approximated : [...curve];
}

function approxOpenPolyDP(curve: Point[], epsilon: number): Point[] {
    const keep = new Uint8Array(curve.length);
    keep[0] = 1;
    keep[curve.length - 1] = 1;
    const stack: Array<[number, number]> = [[0, curve.length - 1]];
    const epsilonSquared = epsilon * epsilon;

    while (stack.length) {
        const [start, end] = stack.pop() as [number, number];
        let maxDistance = 0;
        let maxIndex = -1;
        for (let index = start + 1; index < end; index++) {
            const distance = pointSegmentDistanceSquared(curve[index], curve[start], curve[end]);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = index;
            }
        }
        if (maxIndex >= 0 && maxDistance > epsilonSquared) {
            keep[maxIndex] = 1;
            stack.push([start, maxIndex], [maxIndex, end]);
        }
    }

    const approximated: Point[] = [];
    for (let index = 0; index < curve.length; index++) {
        if (keep[index]) {
            approximated.push(curve[index]);
        }
    }
    return approximated;
}

function removeDuplicateClosingPoint(points: Point[]): Point[] {
    const curve = [...points];
    const first = curve[0];
    const last = curve[curve.length - 1];
    if (first && last && first.x === last.x && first.y === last.y) {
        curve.pop();
    }
    return curve;
}

function findFarthestPointIndex(points: Point[], origin: Point): number {
    let farthestIndex = 0;
    let farthestDistance = -Infinity;
    for (let index = 1; index < points.length; index++) {
        const distance = distanceSquared(points[index], origin);
        if (distance > farthestDistance) {
            farthestDistance = distance;
            farthestIndex = index;
        }
    }
    return farthestIndex;
}

function dedupeAdjacentPoints(points: Point[]): Point[] {
    const deduped: Point[] = [];
    for (const point of points) {
        const previous = deduped[deduped.length - 1];
        if (previous && previous.x === point.x && previous.y === point.y) {
            continue;
        }
        deduped.push(point);
    }
    return deduped;
}

function isBoundaryPoint(
    bitmap: Uint8Array,
    width: number,
    height: number,
    x: number,
    y: number
): boolean {
    for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ]) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
            return true;
        }
        if (!bitmap[nextY * width + nextX]) {
            return true;
        }
    }
    return false;
}

interface BoundaryEdge {
    end: Point;
    id: string;
    start: Point;
}

function traceComponentBoundaries(
    componentPixels: Point[],
    bitmap: Uint8Array,
    width: number,
    height: number
): Point[][] {
    const edgesByStart = new Map<string, BoundaryEdge[]>();
    for (const point of componentPixels) {
        addPixelBoundaryEdges(edgesByStart, point, bitmap, width, height);
    }

    const visited = new Set<string>();
    const loops: Point[][] = [];
    for (const edges of edgesByStart.values()) {
        for (const edge of edges) {
            if (visited.has(edge.id)) {
                continue;
            }
            const loop = traceBoundaryLoop(edge, edgesByStart, visited);
            if (loop.length >= 3) {
                loops.push(loop);
            }
        }
    }

    return loops.length > 0 ? loops : [componentPixels];
}

function addPixelBoundaryEdges(
    edgesByStart: Map<string, BoundaryEdge[]>,
    point: Point,
    bitmap: Uint8Array,
    width: number,
    height: number
) {
    const { x, y } = point;
    if (!hasForeground(bitmap, width, height, x, y - 1)) {
        addBoundaryEdge(edgesByStart, { x, y }, { x: x + 1, y });
    }
    if (!hasForeground(bitmap, width, height, x + 1, y)) {
        addBoundaryEdge(edgesByStart, { x: x + 1, y }, { x: x + 1, y: y + 1 });
    }
    if (!hasForeground(bitmap, width, height, x, y + 1)) {
        addBoundaryEdge(edgesByStart, { x: x + 1, y: y + 1 }, { x, y: y + 1 });
    }
    if (!hasForeground(bitmap, width, height, x - 1, y)) {
        addBoundaryEdge(edgesByStart, { x, y: y + 1 }, { x, y });
    }
}

function addBoundaryEdge(edgesByStart: Map<string, BoundaryEdge[]>, start: Point, end: Point) {
    const edge = {
        start,
        end,
        id: `${vertexKey(start)}>${vertexKey(end)}`,
    };
    const edges = edgesByStart.get(vertexKey(start)) ?? [];
    edges.push(edge);
    edgesByStart.set(vertexKey(start), edges);
}

function traceBoundaryLoop(
    firstEdge: BoundaryEdge,
    edgesByStart: Map<string, BoundaryEdge[]>,
    visited: Set<string>
): Point[] {
    const loop: Point[] = [];
    let current: BoundaryEdge | undefined = firstEdge;
    const startKey = vertexKey(firstEdge.start);

    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        loop.push(current.start);
        const nextEdges = edgesByStart
            .get(vertexKey(current.end))
            ?.filter((edge) => !visited.has(edge.id));
        current = nextEdges?.[0];
        if (current && vertexKey(current.start) === startKey && loop.length > 1) {
            break;
        }
    }

    return loop;
}

function hasForeground(
    bitmap: Uint8Array,
    width: number,
    height: number,
    x: number,
    y: number
): boolean {
    return x >= 0 && x < width && y >= 0 && y < height && Boolean(bitmap[y * width + x]);
}

function vertexKey(point: Point): string {
    return `${point.x},${point.y}`;
}

function pointSegmentDistanceSquared(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= Number.EPSILON) {
        return distanceSquared(point, start);
    }

    const projection = Math.max(
        0,
        Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
    );
    return distanceSquared(point, {
        x: start.x + projection * dx,
        y: start.y + projection * dy,
    });
}

function distanceSquared(pointA: Point, pointB: Point): number {
    const dx = pointA.x - pointB.x;
    const dy = pointA.y - pointB.y;
    return dx * dx + dy * dy;
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
