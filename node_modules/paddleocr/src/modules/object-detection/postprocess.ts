import type {
    ObjectDetectionMergeMode,
    ObjectDetectionOutputLayout,
    ObjectDetectionRuntimeOptions,
    OrtTensor,
} from "../../interface.ts";

export interface ObjectDetectionBox {
    classId: number;
    label: string;
    score: number;
    coordinate: [number, number, number, number];
}

type ObjectDetectionPostprocessOptions = Pick<
    ObjectDetectionRuntimeOptions,
    | "labels"
    | "threshold"
    | "outputLayout"
    | "layoutNms"
    | "layoutUnclipRatio"
    | "layoutMergeBboxesMode"
>;

const LAYOUT_NMS_IOU_THRESHOLD = 0.5;

export function postprocessObjectDetection(
    outputs: Record<string, OrtTensor>,
    options: ObjectDetectionPostprocessOptions = {}
): ObjectDetectionBox[] {
    const outputTensor = selectObjectDetectionOutputTensor(outputs);
    const data = extractObjectDetectionOutputData(outputTensor);
    validateObjectDetectionOutputShape(outputTensor, data);
    const rowCount = resolveObjectDetectionRowCount(outputs, data.length / 6, outputTensor);

    const boxes: ObjectDetectionBox[] = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        const offset = rowIndex * 6;
        const layout = options.outputLayout ?? inferObjectDetectionOutputLayout(data, offset);
        const parsed = parseObjectDetectionRow(data, offset, layout);

        if (
            parsed.classId < 0 ||
            parsed.score < resolveObjectDetectionThreshold(options, parsed.classId)
        ) {
            continue;
        }
        if (parsed.coordinate.some((value) => !Number.isFinite(value))) {
            throw new Error(
                `Object detection output row at offset ${offset} contains non-finite coordinates.`
            );
        }

        const box = {
            ...parsed,
            label: options.labels?.[parsed.classId] ?? String(parsed.classId),
        };
        boxes.push(applyLayoutUnclip(box, options));
    }

    const merged = applyLayoutMergeMode(boxes, options);
    return options.layoutNms ? applyClassWiseNms(merged, LAYOUT_NMS_IOU_THRESHOLD) : merged;
}

function selectObjectDetectionOutputTensor(outputs: Record<string, OrtTensor>): OrtTensor {
    const candidates = Object.entries(outputs).filter(([, tensor]) =>
        isObjectDetectionBoxTensor(tensor)
    );
    if (candidates.length === 0) {
        throw new Error(
            `Object detection output tensor with shape [N,6] or [1,N,6] not found. Available outputs: ${Object.keys(outputs).join(", ")}`
        );
    }

    const preferred = candidates.find(([name]) => /^(bbox|boxes|dets?|output0?)$/i.test(name));
    return (preferred ?? candidates[0])[1];
}

function isObjectDetectionBoxTensor(tensor: OrtTensor): boolean {
    const { dims } = tensor;
    return (
        (dims.length === 2 && dims[1] === 6) ||
        (dims.length === 3 && dims[0] === 1 && dims[2] === 6)
    );
}

function extractObjectDetectionOutputData(tensor: OrtTensor): Float32Array {
    if (!(tensor.data instanceof Float32Array)) {
        throw new Error("Object detection output tensor must contain Float32Array data.");
    }
    return tensor.data;
}

function validateObjectDetectionOutputShape(tensor: OrtTensor, data: Float32Array) {
    if (!tensor.dims.every((dimension) => Number.isInteger(dimension) && dimension > 0)) {
        throw new Error(
            `Object detection output shape [${tensor.dims.join(",")}] must contain positive integer dimensions.`
        );
    }
    if (data.length % 6 !== 0) {
        throw new Error(
            `Object detection output shape [${tensor.dims.join(",")}] does not match data length ${data.length}.`
        );
    }
    const expectedLength = tensor.dims.reduce((total, dimension) => total * dimension, 1);
    if (data.length !== expectedLength) {
        throw new Error(
            `Object detection output shape [${tensor.dims.join(",")}] expects ${expectedLength} values but got ${data.length}.`
        );
    }
}

function resolveObjectDetectionRowCount(
    outputs: Record<string, OrtTensor>,
    totalRows: number,
    outputTensor: OrtTensor
): number {
    const bboxNumTensor =
        outputs.bbox_num ??
        outputs.boxes_num ??
        inferObjectDetectionRowCountTensor(outputs, outputTensor);
    if (!bboxNumTensor) {
        return totalRows;
    }

    const bboxNum = extractObjectDetectionRowCount(bboxNumTensor);
    if (!Number.isInteger(bboxNum) || bboxNum < 0 || bboxNum > totalRows) {
        throw new Error(
            `Invalid object detection bbox_num: ${bboxNum}. Expected an integer between 0 and ${totalRows}.`
        );
    }
    return bboxNum;
}

function inferObjectDetectionRowCountTensor(
    outputs: Record<string, OrtTensor>,
    outputTensor: OrtTensor
): OrtTensor | undefined {
    const candidates = Object.values(outputs).filter(
        (tensor) =>
            tensor !== outputTensor &&
            isSingleValueTensor(tensor) &&
            isIntegerTensorData(tensor.data) &&
            tensorDataLengthMatchesShape(tensor)
    );

    if (candidates.length !== 1) {
        return undefined;
    }
    return candidates[0];
}

function isSingleValueTensor(tensor: OrtTensor): boolean {
    return tensor.dims.reduce((total, dimension) => total * dimension, 1) === 1;
}

function tensorDataLengthMatchesShape(tensor: OrtTensor): boolean {
    if (!ArrayBuffer.isView(tensor.data) || tensor.data instanceof DataView) {
        return false;
    }
    const expectedLength = tensor.dims.reduce((total, dimension) => total * dimension, 1);
    return tensor.data.length === expectedLength;
}

function isIntegerTensorData(data: OrtTensor["data"]): boolean {
    return (
        data instanceof Int8Array ||
        data instanceof Uint8Array ||
        data instanceof Int16Array ||
        data instanceof Uint16Array ||
        data instanceof Int32Array ||
        data instanceof Uint32Array ||
        data instanceof BigInt64Array ||
        data instanceof BigUint64Array
    );
}

function extractObjectDetectionRowCount(tensor: OrtTensor): number | undefined {
    const { data } = tensor;
    if (!isSingleValueTensor(tensor) || !tensorDataLengthMatchesShape(tensor)) {
        throw new Error(
            `Object detection bbox_num shape [${tensor.dims.join(",")}] must contain exactly one value.`
        );
    }
    if (!isIntegerTensorData(data)) {
        throw new Error("Object detection bbox_num tensor must contain integer data.");
    }
    if (!ArrayBuffer.isView(data) || data instanceof DataView) {
        return undefined;
    }

    const values = data as unknown as ArrayLike<number | bigint>;
    if (values.length < 1) {
        return undefined;
    }
    const value = values[0];
    return typeof value === "bigint" ? Number(value) : value;
}

function parseObjectDetectionRow(
    data: Float32Array,
    offset: number,
    layout: ObjectDetectionOutputLayout
): Omit<ObjectDetectionBox, "label"> {
    const classIdIndex = layout === "class-score-xyxy" ? offset : offset + 1;
    const scoreIndex = layout === "class-score-xyxy" ? offset + 1 : offset;
    const classId = data[classIdIndex];
    const score = data[scoreIndex];

    if (!Number.isInteger(classId)) {
        throw new Error(
            `Object detection class id at offset ${classIdIndex} must be an integer. Received ${classId}.`
        );
    }
    if (!Number.isFinite(score)) {
        throw new Error(
            `Object detection score at offset ${scoreIndex} must be finite. Received ${score}.`
        );
    }

    return {
        classId,
        score,
        coordinate: [data[offset + 2], data[offset + 3], data[offset + 4], data[offset + 5]],
    };
}

function inferObjectDetectionOutputLayout(
    data: Float32Array,
    offset: number
): ObjectDetectionOutputLayout {
    const first = data[offset];
    const second = data[offset + 1];
    const firstLooksClass = isClassIdLike(first);
    const secondLooksClass = isClassIdLike(second);
    const firstLooksScore = isScoreLike(first);
    const secondLooksScore = isScoreLike(second);

    if (firstLooksClass && secondLooksScore) {
        return "class-score-xyxy";
    }
    if (firstLooksScore && secondLooksClass) {
        return "score-class-xyxy";
    }

    throw new Error(
        `Unable to infer object detection output layout from row prefix [${first}, ${second}]. Set outputLayout explicitly.`
    );
}

function isClassIdLike(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
}

function isScoreLike(value: number): boolean {
    return Number.isFinite(value) && value >= 0 && value <= 1;
}

function resolveObjectDetectionThreshold(
    options: ObjectDetectionPostprocessOptions,
    classId: number
): number {
    if (typeof options.threshold === "number") {
        return options.threshold;
    }
    if (Array.isArray(options.threshold)) {
        return options.threshold[classId] ?? 0;
    }
    if (options.threshold) {
        return options.threshold[classId] ?? 0;
    }
    return 0;
}

function applyLayoutUnclip(
    box: ObjectDetectionBox,
    options: ObjectDetectionPostprocessOptions
): ObjectDetectionBox {
    const ratio = resolveLayoutUnclipRatio(options.layoutUnclipRatio, box.classId);
    if (!ratio) {
        return box;
    }
    const [widthRatio, heightRatio] = ratio;
    const [x0, y0, x1, y1] = box.coordinate;
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const width = (x1 - x0) * widthRatio;
    const height = (y1 - y0) * heightRatio;
    return {
        ...box,
        coordinate: [
            centerX - width / 2,
            centerY - height / 2,
            centerX + width / 2,
            centerY + height / 2,
        ],
    };
}

function resolveLayoutUnclipRatio(
    value: ObjectDetectionPostprocessOptions["layoutUnclipRatio"],
    classId: number
): [number, number] | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === "number") {
        validatePositiveRatio(value, "layoutUnclipRatio");
        return [value, value];
    }
    if (Array.isArray(value)) {
        if (value.length !== 2) {
            throw new Error("layoutUnclipRatio tuple must contain width and height ratios.");
        }
        validatePositiveRatio(value[0], "layoutUnclipRatio[0]");
        validatePositiveRatio(value[1], "layoutUnclipRatio[1]");
        return [value[0], value[1]];
    }

    const ratio = value[classId];
    if (!ratio) {
        return undefined;
    }
    if (!Array.isArray(ratio) || ratio.length !== 2) {
        throw new Error(`layoutUnclipRatio for class ${classId} must be a [width,height] tuple.`);
    }
    validatePositiveRatio(ratio[0], `layoutUnclipRatio[${classId}][0]`);
    validatePositiveRatio(ratio[1], `layoutUnclipRatio[${classId}][1]`);
    return [ratio[0], ratio[1]];
}

function validatePositiveRatio(value: number, name: string) {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid ${name}: ${value}. Expected a positive finite number.`);
    }
}

function applyLayoutMergeMode(
    boxes: ObjectDetectionBox[],
    options: ObjectDetectionPostprocessOptions
): ObjectDetectionBox[] {
    if (!options.layoutMergeBboxesMode) {
        return boxes;
    }

    const kept: ObjectDetectionBox[] = [];
    for (const box of boxes) {
        const mode = resolveLayoutMergeMode(options.layoutMergeBboxesMode, box.classId);
        if (mode === "union") {
            kept.push(box);
            continue;
        }

        let shouldKeep = true;
        for (let index = kept.length - 1; index >= 0; index--) {
            const current = kept[index];
            if (
                current.classId !== box.classId ||
                !boxesOverlap(current.coordinate, box.coordinate)
            ) {
                continue;
            }

            const currentArea = boxArea(current.coordinate);
            const nextArea = boxArea(box.coordinate);
            if (mode === "large") {
                if (nextArea > currentArea) {
                    kept.splice(index, 1);
                } else {
                    shouldKeep = false;
                }
            } else if (mode === "small") {
                if (nextArea < currentArea) {
                    kept.splice(index, 1);
                } else {
                    shouldKeep = false;
                }
            }
        }

        if (shouldKeep) {
            kept.push(box);
        }
    }
    return kept;
}

function resolveLayoutMergeMode(
    value: NonNullable<ObjectDetectionPostprocessOptions["layoutMergeBboxesMode"]>,
    classId: number
): ObjectDetectionMergeMode {
    const mode = typeof value === "string" ? value : value[classId];
    if (mode === undefined) {
        return "union";
    }
    if (mode !== "large" && mode !== "small" && mode !== "union") {
        throw new Error(`Unsupported layoutMergeBboxesMode: ${String(mode)}.`);
    }
    return mode;
}

function applyClassWiseNms(
    boxes: ObjectDetectionBox[],
    iouThreshold: number
): ObjectDetectionBox[] {
    const kept: ObjectDetectionBox[] = [];
    const groups = new Map<number, ObjectDetectionBox[]>();
    for (const box of boxes) {
        const classBoxes = groups.get(box.classId) ?? [];
        classBoxes.push(box);
        groups.set(box.classId, classBoxes);
    }

    for (const classBoxes of groups.values()) {
        const remaining = [...classBoxes].sort((a, b) => b.score - a.score);
        while (remaining.length) {
            const current = remaining.shift() as ObjectDetectionBox;
            kept.push(current);
            for (let index = remaining.length - 1; index >= 0; index--) {
                if (boxIou(current.coordinate, remaining[index].coordinate) > iouThreshold) {
                    remaining.splice(index, 1);
                }
            }
        }
    }

    return kept.sort((a, b) => b.score - a.score);
}

function boxesOverlap(
    a: readonly [number, number, number, number],
    b: readonly [number, number, number, number]
): boolean {
    return intersectionArea(a, b) > 0;
}

function boxIou(
    a: readonly [number, number, number, number],
    b: readonly [number, number, number, number]
): number {
    const intersection = intersectionArea(a, b);
    if (intersection <= 0) {
        return 0;
    }
    const union = boxArea(a) + boxArea(b) - intersection;
    return union > 0 ? intersection / union : 0;
}

function intersectionArea(
    a: readonly [number, number, number, number],
    b: readonly [number, number, number, number]
): number {
    const x0 = Math.max(Math.min(a[0], a[2]), Math.min(b[0], b[2]));
    const y0 = Math.max(Math.min(a[1], a[3]), Math.min(b[1], b[3]));
    const x1 = Math.min(Math.max(a[0], a[2]), Math.max(b[0], b[2]));
    const y1 = Math.min(Math.max(a[1], a[3]), Math.max(b[1], b[3]));
    return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

function boxArea(coordinate: readonly [number, number, number, number]): number {
    return Math.abs(coordinate[2] - coordinate[0]) * Math.abs(coordinate[3] - coordinate[1]);
}
