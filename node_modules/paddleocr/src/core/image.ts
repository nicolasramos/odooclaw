import type { Box, ImageChannelOrder, Point } from "../interface.ts";

interface CropOptions {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ResizeOptions {
    width?: number;
    height?: number;
    filter?: "bilinear" | "triangle";
}

interface PaddingOptions {
    padding?: number;
    vertical?: number;
    horizontal?: number;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    color?: number[];
}

interface TensorOptions {
    mean_values: [number, number, number];
    norm_values: [number, number, number];
    channel_order?: ImageChannelOrder;
}

interface DilateOptions {
    norm?: "LInf";
    k?: number;
}

interface ThresholdOptions {
    threshold?: number; // 阈值，默认128
}

interface ContoursOptions {
    minArea?: number;
}

interface RectOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    lineWidth?: number;
    color?: number[];
}

export class Image {
    width: number;
    height: number;
    data: Uint8Array;
    depth: 8;
    channels: number;

    /**
     * 创建一个新的 Image 实例。
     * @param width 图像的宽度
     * @param height 图像的高度
     * @param data 图像数据，Uint8Array
     */
    constructor(width: number, height: number, channels: number, data: Uint8Array) {
        this.width = width;
        this.height = height;
        this.channels = channels;
        this.depth = 8;
        if (data) {
            this.data = data;
        } else {
            const length = width * height * 4;
            this.data = new Uint8Array(length); // Default to RGBA
        }
    }

    /**
     * 裁剪
     */
    crop(options: CropOptions) {
        const { x, y, width, height } = options;
        if (x < 0 || y < 0 || x + width > this.width || y + height > this.height) {
            throw new Error("Crop area is out of bounds");
        }
        const croppedData = new Uint8Array(width * height * this.channels);
        for (let j = 0; j < height; j++) {
            for (let i = 0; i < width; i++) {
                const srcIndex = ((y + j) * this.width + (x + i)) * this.channels;
                const dstIndex = (j * width + i) * this.channels;
                croppedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
            }
        }
        return new Image(width, height, this.channels, croppedData);
    }

    cropRotated(points: [Point, Point, Point, Point]) {
        const width = Math.max(
            Math.floor(distance(points[0], points[1])),
            Math.floor(distance(points[2], points[3])),
            1
        );
        const height = Math.max(
            Math.floor(distance(points[0], points[3])),
            Math.floor(distance(points[1], points[2])),
            1
        );
        const croppedData = new Uint8Array(width * height * this.channels);
        const transform = getPerspectiveTransform(
            [
                { x: 0, y: 0 },
                { x: width, y: 0 },
                { x: width, y: height },
                { x: 0, y: height },
            ],
            points
        );

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const source = transformPoint(transform, x, y);
                this.sampleCubicPixel(
                    source.x,
                    source.y,
                    croppedData,
                    (y * width + x) * this.channels
                );
            }
        }

        const crop = new Image(width, height, this.channels, croppedData);
        if (height / width >= 1.5) {
            return crop.rotateCounterClockwise();
        }
        return crop;
    }

    rotate180() {
        const rotatedData = new Uint8Array(this.width * this.height * this.channels);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const srcIndex = (y * this.width + x) * this.channels;
                const dstX = this.width - 1 - x;
                const dstY = this.height - 1 - y;
                const dstIndex = (dstY * this.width + dstX) * this.channels;
                rotatedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
            }
        }

        return new Image(this.width, this.height, this.channels, rotatedData);
    }

    rotateClockwise() {
        const rotatedData = new Uint8Array(this.width * this.height * this.channels);
        const rotatedWidth = this.height;
        const rotatedHeight = this.width;

        for (let y = 0; y < rotatedHeight; y++) {
            for (let x = 0; x < rotatedWidth; x++) {
                const srcX = y;
                const srcY = this.height - 1 - x;
                const srcIndex = (srcY * this.width + srcX) * this.channels;
                const dstIndex = (y * rotatedWidth + x) * this.channels;
                rotatedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
            }
        }

        return new Image(rotatedWidth, rotatedHeight, this.channels, rotatedData);
    }

    /**
     * 将图片缩放到指定的尺寸w
     * @param options
     */
    resize(options: ResizeOptions) {
        let { width, height } = options;
        if (width === undefined && height === undefined) {
            throw new Error("At least one of width or height must be specified");
        }
        if (width === undefined) {
            width = Math.round(this.width * ((height ?? this.height) / this.height));
        }
        if (height === undefined) {
            height = Math.round(this.height * (width / this.width));
        }

        if (!Number.isInteger(width) || width <= 0) {
            throw new Error(`Invalid resize width: ${width}. Expected a positive integer.`);
        }
        if (!Number.isInteger(height) || height <= 0) {
            throw new Error(`Invalid resize height: ${height}. Expected a positive integer.`);
        }

        if (options.filter === "triangle") {
            return this.resizeTriangle(width, height);
        }

        return this.resizeBilinear(width, height);
    }

    private resizeBilinear(dstW: number, dstH: number) {
        const srcW = this.width;
        const srcH = this.height;
        const channels = this.channels;
        const srcData = this.data;
        const dstData = new Uint8Array(dstW * dstH * channels);
        const scaleX = srcW / dstW;
        const scaleY = srcH / dstH;

        const clamp = (v: number, min: number, max: number): number =>
            Math.max(min, Math.min(max, v));

        for (let y = 0; y < dstH; y++) {
            const sourceY = (y + 0.5) * scaleY - 0.5;
            let y1 = Math.floor(sourceY);
            let yWeight = sourceY - y1;
            if (y1 < 0) {
                y1 = 0;
                yWeight = 0;
            } else if (y1 >= srcH - 1) {
                y1 = srcH - 1;
                yWeight = 0;
            }
            const y2 = clamp(y1 + 1, 0, srcH - 1);

            for (let x = 0; x < dstW; x++) {
                const sourceX = (x + 0.5) * scaleX - 0.5;
                let x1 = Math.floor(sourceX);
                let xWeight = sourceX - x1;
                if (x1 < 0) {
                    x1 = 0;
                    xWeight = 0;
                } else if (x1 >= srcW - 1) {
                    x1 = srcW - 1;
                    xWeight = 0;
                }
                const x2 = clamp(x1 + 1, 0, srcW - 1);

                const dstIndex = (y * dstW + x) * channels;
                const topLeftIndex = (y1 * srcW + x1) * channels;
                const topRightIndex = (y1 * srcW + x2) * channels;
                const bottomLeftIndex = (y2 * srcW + x1) * channels;
                const bottomRightIndex = (y2 * srcW + x2) * channels;

                for (let c = 0; c < channels; c++) {
                    const top =
                        srcData[topLeftIndex + c] * (1 - xWeight) +
                        srcData[topRightIndex + c] * xWeight;
                    const bottom =
                        srcData[bottomLeftIndex + c] * (1 - xWeight) +
                        srcData[bottomRightIndex + c] * xWeight;
                    dstData[dstIndex + c] = Math.round(
                        clamp(top * (1 - yWeight) + bottom * yWeight, 0, 255)
                    );
                }
            }
        }

        return new Image(dstW, dstH, channels, dstData);
    }

    private resizeTriangle(dstW: number, dstH: number) {
        const srcW = this.width;
        const srcH = this.height;
        const channels = this.channels;
        const srcData = this.data;

        function triangle_kernel(x: number) {
            x = Math.abs(x);
            return x < 1 ? 1 - x : 0;
        }

        function clamp(v: number, min: number, max: number): number {
            return Math.max(min, Math.min(max, v));
        }

        // 1. 纵向采样
        const tmpData = new Float32Array(srcW * dstH * channels);
        const ratioY = srcH / dstH;
        const sratioY = ratioY < 1 ? 1 : ratioY;
        const supportY = 1.0 * sratioY;

        for (let outy = 0; outy < dstH; outy++) {
            const inputy = (outy + 0.5) * ratioY - 0.5;
            const left = Math.max(0, Math.floor(inputy - supportY));
            const right = Math.min(srcH, Math.ceil(inputy + supportY));

            const ws: number[] = [];
            let sum = 0;
            for (let i = left; i < right; i++) {
                const w = triangle_kernel((i - inputy) / sratioY);
                ws.push(w);
                sum += w;
            }
            for (let i = 0; i < ws.length; i++) ws[i] /= sum;

            for (let x = 0; x < srcW; x++) {
                for (let c = 0; c < channels; c++) {
                    let t = 0;
                    for (let i = 0; i < ws.length; i++) {
                        const srcIdx = ((left + i) * srcW + x) * channels + c;
                        t += srcData[srcIdx] * ws[i];
                    }
                    tmpData[(outy * srcW + x) * channels + c] = t;
                }
            }
        }

        // 2. 横向采样
        const dstData = new Uint8Array(dstW * dstH * channels);
        const ratioX = srcW / dstW;
        const sratioX = ratioX < 1 ? 1 : ratioX;
        const supportX = 1.0 * sratioX;

        for (let outx = 0; outx < dstW; outx++) {
            const inputx = (outx + 0.5) * ratioX - 0.5;
            const left = Math.max(0, Math.floor(inputx - supportX));
            const right = Math.min(srcW, Math.ceil(inputx + supportX));

            const ws: number[] = [];
            let sum = 0;
            for (let i = left; i < right; i++) {
                const w = triangle_kernel((i - inputx) / sratioX);
                ws.push(w);
                sum += w;
            }
            for (let i = 0; i < ws.length; i++) ws[i] /= sum;

            for (let y = 0; y < dstH; y++) {
                for (let c = 0; c < channels; c++) {
                    let t = 0;
                    for (let i = 0; i < ws.length; i++) {
                        const srcIdx = (y * srcW + (left + i)) * channels + c;
                        t += tmpData[srcIdx] * ws[i];
                    }
                    dstData[(y * dstW + outx) * channels + c] = Math.round(clamp(t, 0, 255));
                }
            }
        }

        return new Image(dstW, dstH, channels, dstData);
    }

    /**
     * 为图片添加指定颜色的边距，默认为透明的
     * @param options
     */
    padding(options: PaddingOptions) {
        // 解析边距
        let { padding, vertical, horizontal, top, bottom, left, right, color } = options;
        // 优先级：padding > vertical/horizontal > top/bottom/left/right
        if (typeof padding === "number") {
            top = bottom = left = right = padding;
        } else {
            if (typeof vertical === "number") {
                top = bottom = vertical;
            }
            if (typeof horizontal === "number") {
                left = right = horizontal;
            }
        }
        top = top ?? 0;
        bottom = bottom ?? 0;
        left = left ?? 0;
        right = right ?? 0;
        color = color ?? Array(this.channels).fill(0);
        if (color.length < this.channels) {
            throw new Error(
                `Color length ${color.length} does not match image channels ${this.channels}`
            );
        }
        const newW = this.width + left + right;
        const newH = this.height + top + bottom;
        const newData = new Uint8Array(newW * newH * this.channels);
        // 填充背景色
        for (let y = 0; y < newH; y++) {
            for (let x = 0; x < newW; x++) {
                const idx = (y * newW + x) * this.channels;
                newData.set(color.slice(0, this.channels), idx);
            }
        }
        // 拷贝原图
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const srcIdx = (y * this.width + x) * this.channels;
                const dstIdx = ((y + top) * newW + (x + left)) * this.channels;
                newData.set(this.data.subarray(srcIdx, srcIdx + this.channels), dstIdx);
            }
        }
        return new Image(newW, newH, this.channels, newData);
    }

    /**
     * 将当前图像转换为张量格式，以便输入到onnx模型
     * @param options
     */
    tensor(options: TensorOptions): Float32Array {
        const mean = options.mean_values;
        const norm = options.norm_values;
        const channelOrder = options.channel_order ?? "rgb";
        const width = this.width;
        const height = this.height;
        const numChannels = 3;
        const rgbaData = this.data;
        const tensor = new Float32Array(width * height * numChannels);
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const pixelIndex = (h * width + w) * this.channels;
                const tensorIndex = h * width + w;
                for (let c = 0; c < numChannels; c++) {
                    const sourceChannel = channelOrder === "bgr" ? numChannels - c - 1 : c;
                    const pixelValue = rgbaData[pixelIndex + sourceChannel];
                    const normalizedValue = pixelValue * norm[c] - mean[c] * norm[c];
                    tensor[c * height * width + tensorIndex] = normalizedValue;
                }
            }
        }
        return tensor;
    }

    /**
     * 灰度图阈值方法，大于阈值的像素点设为255，小于等于阈值的设为0
     * @param options
     */
    threshold(options: ThresholdOptions) {
        const threshold = options.threshold ?? 128;
        const width = this.width;
        const height = this.height;
        // 创建二值化图像
        const binData = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            binData[i] = this.data[i * this.channels] > threshold ? 255 : 0;
        }
        return new Image(width, height, 1, binData);
    }

    /**
     * 膨胀操作，使用指定的范数和核大小
     * 进行处理的图片像素是0和255，膨胀255的像素点
     * 返回一个新的图片
     * @param options
     */
    dilate(options: DilateOptions = {}): Image {
        const { norm = "LInf", k = 1 } = options;
        if (norm !== "LInf") {
            throw new Error("Only LInf norm is supported");
        }
        if (this.channels !== 1) {
            throw new Error("Dilate only supports single channel (grayscale) images");
        }
        if (!Number.isInteger(k) || k < 0) {
            throw new Error(`Invalid dilation kernel size: ${k}. Expected a non-negative integer.`);
        }
        if (k <= 1) {
            return new Image(this.width, this.height, this.channels, new Uint8Array(this.data));
        }
        const width = this.width;
        const height = this.height;
        const src = this.data;
        const out = new Uint8Array(width * height);
        const anchor = Math.floor(k / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let value = 0;
                for (let ky = 0; ky < k && value === 0; ky++) {
                    const sourceY = y + ky - anchor;
                    if (sourceY < 0 || sourceY >= height) {
                        continue;
                    }
                    for (let kx = 0; kx < k; kx++) {
                        const sourceX = x + kx - anchor;
                        if (sourceX < 0 || sourceX >= width) {
                            continue;
                        }
                        if (src[sourceY * width + sourceX] > 0) {
                            value = 255;
                            break;
                        }
                    }
                }
                out[y * width + x] = value;
            }
        }
        return new Image(width, height, 1, out);
    }

    /**
     * 获取图像中的轮廓
     * @returns
     */
    contours(options: ContoursOptions = {}): Box[] {
        // Suzuki/Abe 边界跟踪算法，输入为灰度图，输出 Box[]
        const minArea = options.minArea ?? 1;
        const width = this.width;
        const height = this.height;
        // 二值化
        const bin = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            bin[i] = this.data[i] > 0 ? 1 : 0;
        }
        // 轮廓提取
        const visited = new Uint8Array(width * height);
        const boxes: Box[] = [];
        const at = (x: number, y: number) => y * width + x;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (bin[at(x, y)] && !visited[at(x, y)]) {
                    // BFS 寻找连通域
                    let minX = x,
                        minY = y,
                        maxX = x,
                        maxY = y,
                        area = 0;
                    const queue: Array<[number, number]> = [[x, y]];
                    let queueHead = 0;
                    visited[at(x, y)] = 1;
                    while (queueHead < queue.length) {
                        const [cx, cy] = queue[queueHead];
                        queueHead++;
                        area++;
                        minX = Math.min(minX, cx);
                        minY = Math.min(minY, cy);
                        maxX = Math.max(maxX, cx);
                        maxY = Math.max(maxY, cy);
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
                            const nx = cx + dx,
                                ny = cy + dy;
                            if (
                                nx >= 0 &&
                                nx < width &&
                                ny >= 0 &&
                                ny < height &&
                                bin[at(nx, ny)] &&
                                !visited[at(nx, ny)]
                            ) {
                                visited[at(nx, ny)] = 1;
                                queue.push([nx, ny]);
                            }
                        }
                    }
                    if (area >= minArea) {
                        boxes.push({
                            x: minX,
                            y: minY,
                            width: maxX - minX + 1,
                            height: maxY - minY + 1,
                        });
                    }
                }
            }
        }
        return boxes;
    }

    /**
     * 在图像上绘制矩形，支持线宽
     * @param x 左上角x
     * @param y 左上角y
     * @param width 矩形宽度
     * @param height 矩形高度
     * @param color 颜色 [r,g,b,a]
     * @param lineWidth 线宽
     */
    rect(options: RectOptions) {
        const { x, y, width, height, color = [], lineWidth = 1 } = options;
        if (!color.length) {
            color.push(...Array(this.channels).fill(255));
        }
        if (this.channels !== color.length) {
            throw new Error(
                `Color length ${color.length} does not match image channels ${this.channels}`
            );
        }
        // 上下边
        for (let dy = 0; dy < lineWidth; dy++) {
            for (let i = 0; i < width; i++) {
                // 上边
                const yy = y + dy;
                const xx = x + i;
                if (yy >= 0 && yy < this.height && xx >= 0 && xx < this.width) {
                    const idx = (yy * this.width + xx) * this.channels;
                    this.data.set(color, idx);
                }
                // 下边
                const by = y + height - 1 - dy;
                if (by >= 0 && by < this.height && xx >= 0 && xx < this.width) {
                    const idx = (by * this.width + xx) * this.channels;
                    this.data.set(color, idx);
                }
            }
        }
        // 左右边
        for (let dx = 0; dx < lineWidth; dx++) {
            for (let j = 0; j < height; j++) {
                // 左边
                const xx = x + dx;
                const yy = y + j;
                if (xx >= 0 && xx < this.width && yy >= 0 && yy < this.height) {
                    const idx = (yy * this.width + xx) * this.channels;
                    this.data.set(color, idx);
                }
                // 右边
                const rx = x + width - 1 - dx;
                if (rx >= 0 && rx < this.width && yy >= 0 && yy < this.height) {
                    const idx = (yy * this.width + rx) * this.channels;
                    this.data.set(color, idx);
                }
            }
        }
    }

    rotateCounterClockwise() {
        const rotatedData = new Uint8Array(this.width * this.height * this.channels);
        const rotatedWidth = this.height;
        const rotatedHeight = this.width;

        for (let y = 0; y < rotatedHeight; y++) {
            for (let x = 0; x < rotatedWidth; x++) {
                const srcX = this.width - 1 - y;
                const srcY = x;
                const srcIndex = (srcY * this.width + srcX) * this.channels;
                const dstIndex = (y * rotatedWidth + x) * this.channels;
                rotatedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
            }
        }

        return new Image(rotatedWidth, rotatedHeight, this.channels, rotatedData);
    }

    private sampleCubicPixel(x: number, y: number, output: Uint8Array, outputIndex: number) {
        const baseX = Math.floor(x);
        const baseY = Math.floor(y);
        const coeffX = cubicCoefficients(x - baseX);
        const coeffY = cubicCoefficients(y - baseY);

        for (let c = 0; c < this.channels; c++) {
            let value = 0;
            for (let ky = 0; ky < 4; ky++) {
                const sampleY = clampInt(baseY + ky - 1, 0, this.height - 1);
                for (let kx = 0; kx < 4; kx++) {
                    const sampleX = clampInt(baseX + kx - 1, 0, this.width - 1);
                    const pixel = this.data[(sampleY * this.width + sampleX) * this.channels + c];
                    value += pixel * coeffX[kx] * coeffY[ky];
                }
            }
            output[outputIndex + c] = Math.round(clamp(value, 0, 255));
        }
    }

    /**
     * 以png格式输出到指定位置
     * @param path 输出路径
     */
    // async saveAsPng(path: string) {
    //     try {
    //         const { encode } = await import("fast-png");
    //         const pngData = encode({
    //             width: this.width,
    //             height: this.height,
    //             depth: this.depth,
    //             channels: this.channels,
    //             data: this.data,
    //         });
    //         const { writeFile } = await import("fs/promises");
    //         await writeFile(path, pngData);
    //     } catch (e) {
    //         console.error(`Failed to save image as PNG: ${e}`);
    //         throw e;
    //     }
    // }
}

function distance(pointA: Point, pointB: Point) {
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function getPerspectiveTransform(
    source: [Point, Point, Point, Point],
    target: [Point, Point, Point, Point]
): [number, number, number, number, number, number, number, number, number] {
    const matrix: number[][] = [];
    const values: number[] = [];
    for (let i = 0; i < 4; i++) {
        const src = source[i];
        const dst = target[i];
        matrix.push([src.x, src.y, 1, 0, 0, 0, -src.x * dst.x, -src.y * dst.x]);
        values.push(dst.x);
        matrix.push([0, 0, 0, src.x, src.y, 1, -src.x * dst.y, -src.y * dst.y]);
        values.push(dst.y);
    }

    const coefficients = solveLinearSystem(matrix, values);
    return [
        coefficients[0],
        coefficients[1],
        coefficients[2],
        coefficients[3],
        coefficients[4],
        coefficients[5],
        coefficients[6],
        coefficients[7],
        1,
    ];
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
    const size = values.length;
    const augmented = matrix.map((row, index) => [...row, values[index]]);

    for (let col = 0; col < size; col++) {
        let pivot = col;
        for (let row = col + 1; row < size; row++) {
            if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) {
                pivot = row;
            }
        }
        if (Math.abs(augmented[pivot][col]) < Number.EPSILON) {
            throw new Error("Cannot calculate perspective transform from degenerate points");
        }
        if (pivot !== col) {
            [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
        }

        const pivotValue = augmented[col][col];
        for (let entry = col; entry <= size; entry++) {
            augmented[col][entry] /= pivotValue;
        }
        for (let row = 0; row < size; row++) {
            if (row === col) {
                continue;
            }
            const factor = augmented[row][col];
            for (let entry = col; entry <= size; entry++) {
                augmented[row][entry] -= factor * augmented[col][entry];
            }
        }
    }

    return augmented.map((row) => row[size]);
}

function transformPoint(
    matrix: [number, number, number, number, number, number, number, number, number],
    x: number,
    y: number
): Point {
    const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
    if (Math.abs(denominator) < Number.EPSILON) {
        return { x: 0, y: 0 };
    }
    return {
        x: (matrix[0] * x + matrix[1] * y + matrix[2]) / denominator,
        y: (matrix[3] * x + matrix[4] * y + matrix[5]) / denominator,
    };
}

function cubicCoefficients(x: number): [number, number, number, number] {
    const a = -0.75;
    const x1 = x + 1;
    const x2 = 1 - x;
    const coeff0 = ((a * x1 - 5 * a) * x1 + 8 * a) * x1 - 4 * a;
    const coeff1 = ((a + 2) * x - (a + 3)) * x * x + 1;
    const coeff2 = ((a + 2) * x2 - (a + 3)) * x2 * x2 + 1;
    return [coeff0, coeff1, coeff2, 1 - coeff0 - coeff1 - coeff2];
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
