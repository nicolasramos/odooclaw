//#region src/constants.ts
const DEFAULT_DETECTION_OPTIONS = {
	padding: 0,
	mean: [
		.485 * 255,
		.456 * 255,
		.406 * 255
	],
	stdDeviation: [
		1 / .229 / 255,
		1 / .224 / 255,
		1 / .225 / 255
	],
	channelOrder: "rgb",
	maxSideLength: 960,
	limitType: "max",
	maxSideLimit: 4e3,
	textPixelThreshold: .3,
	boxScoreThreshold: .6,
	scoreMode: "fast",
	unclipRatio: 1.5,
	maxCandidates: 1e3,
	minimumAreaThreshold: 20,
	paddingBoxVertical: .4,
	paddingBoxHorizontal: .6,
	dilationKernelSize: 0,
	boxType: "quad"
};
const DEFAULT_RECOGNITION_OPTIONS = {
	mean: [
		127.5,
		127.5,
		127.5
	],
	stdDeviation: [
		1 / 127.5,
		1 / 127.5,
		1 / 127.5
	],
	channelOrder: "rgb",
	outputSelectionStrategy: "first",
	imageHeight: 48,
	imageWidth: 320,
	charactersDictionary: [],
	reverseText: false
};
const DEFAULT_IMAGE_CLASSIFICATION_OPTIONS = {
	mean: [
		.485 * 255,
		.456 * 255,
		.406 * 255
	],
	stdDeviation: [
		1 / .229 / 255,
		1 / .224 / 255,
		1 / .225 / 255
	],
	channelOrder: "bgr",
	resizeMode: "stretch",
	resizeShort: 256,
	imageHeight: 224,
	imageWidth: 224,
	labels: [],
	topK: 1
};
const DEFAULT_TEXTLINE_ORIENTATION_OPTIONS = {
	...DEFAULT_IMAGE_CLASSIFICATION_OPTIONS,
	imageHeight: 80,
	imageWidth: 160,
	labels: ["0_degree", "180_degree"],
	topK: 1,
	threshold: .9,
	enabled: true
};
const DEFAULT_RECOGNITION_ORDERING_OPTIONS = {
	sortByReadingOrder: true,
	sameLinePixelThreshold: 10
};
const DEFAULT_PROCESS_RECOGNITION_OPTIONS = {
	recognitionScoreThreshold: .5,
	lineMergeThresholdRatio: .5
};
const DEFAULT_PADDLE_OPTIONS = {
	detection: DEFAULT_DETECTION_OPTIONS,
	recognition: DEFAULT_RECOGNITION_OPTIONS
};
//#endregion
//#region \0@oxc-project+runtime@0.115.0/helpers/typeof.js
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
//#endregion
//#region \0@oxc-project+runtime@0.115.0/helpers/toPrimitive.js
function toPrimitive(t, r) {
	if ("object" != _typeof(t) || !t) return t;
	var e = t[Symbol.toPrimitive];
	if (void 0 !== e) {
		var i = e.call(t, r || "default");
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === r ? String : Number)(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.115.0/helpers/toPropertyKey.js
function toPropertyKey(t) {
	var i = toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.115.0/helpers/defineProperty.js
function _defineProperty(e, r, t) {
	return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
//#endregion
//#region src/core/image.ts
var Image = class Image {
	/**
	* 创建一个新的 Image 实例。
	* @param width 图像的宽度
	* @param height 图像的高度
	* @param data 图像数据，Uint8Array
	*/
	constructor(width, height, channels, data) {
		_defineProperty(this, "width", void 0);
		_defineProperty(this, "height", void 0);
		_defineProperty(this, "data", void 0);
		_defineProperty(this, "depth", void 0);
		_defineProperty(this, "channels", void 0);
		this.width = width;
		this.height = height;
		this.channels = channels;
		this.depth = 8;
		if (data) this.data = data;
		else {
			const length = width * height * 4;
			this.data = new Uint8Array(length);
		}
	}
	/**
	* 裁剪
	*/
	crop(options) {
		const { x, y, width, height } = options;
		if (x < 0 || y < 0 || x + width > this.width || y + height > this.height) throw new Error("Crop area is out of bounds");
		const croppedData = new Uint8Array(width * height * this.channels);
		for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
			const srcIndex = ((y + j) * this.width + (x + i)) * this.channels;
			const dstIndex = (j * width + i) * this.channels;
			croppedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
		}
		return new Image(width, height, this.channels, croppedData);
	}
	cropRotated(points) {
		const width = Math.max(Math.floor(distance(points[0], points[1])), Math.floor(distance(points[2], points[3])), 1);
		const height = Math.max(Math.floor(distance(points[0], points[3])), Math.floor(distance(points[1], points[2])), 1);
		const croppedData = new Uint8Array(width * height * this.channels);
		const transform = getPerspectiveTransform([
			{
				x: 0,
				y: 0
			},
			{
				x: width,
				y: 0
			},
			{
				x: width,
				y: height
			},
			{
				x: 0,
				y: height
			}
		], points);
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
			const source = transformPoint(transform, x, y);
			this.sampleCubicPixel(source.x, source.y, croppedData, (y * width + x) * this.channels);
		}
		const crop = new Image(width, height, this.channels, croppedData);
		if (height / width >= 1.5) return crop.rotateCounterClockwise();
		return crop;
	}
	rotate180() {
		const rotatedData = new Uint8Array(this.width * this.height * this.channels);
		for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
			const srcIndex = (y * this.width + x) * this.channels;
			const dstX = this.width - 1 - x;
			const dstIndex = ((this.height - 1 - y) * this.width + dstX) * this.channels;
			rotatedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
		}
		return new Image(this.width, this.height, this.channels, rotatedData);
	}
	rotateClockwise() {
		const rotatedData = new Uint8Array(this.width * this.height * this.channels);
		const rotatedWidth = this.height;
		const rotatedHeight = this.width;
		for (let y = 0; y < rotatedHeight; y++) for (let x = 0; x < rotatedWidth; x++) {
			const srcX = y;
			const srcIndex = ((this.height - 1 - x) * this.width + srcX) * this.channels;
			const dstIndex = (y * rotatedWidth + x) * this.channels;
			rotatedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
		}
		return new Image(rotatedWidth, rotatedHeight, this.channels, rotatedData);
	}
	/**
	* 将图片缩放到指定的尺寸w
	* @param options
	*/
	resize(options) {
		let { width, height } = options;
		if (width === void 0 && height === void 0) throw new Error("At least one of width or height must be specified");
		if (width === void 0) width = Math.round(this.width * ((height ?? this.height) / this.height));
		if (height === void 0) height = Math.round(this.height * (width / this.width));
		if (!Number.isInteger(width) || width <= 0) throw new Error(`Invalid resize width: ${width}. Expected a positive integer.`);
		if (!Number.isInteger(height) || height <= 0) throw new Error(`Invalid resize height: ${height}. Expected a positive integer.`);
		if (options.filter === "triangle") return this.resizeTriangle(width, height);
		return this.resizeBilinear(width, height);
	}
	resizeBilinear(dstW, dstH) {
		const srcW = this.width;
		const srcH = this.height;
		const channels = this.channels;
		const srcData = this.data;
		const dstData = new Uint8Array(dstW * dstH * channels);
		const scaleX = srcW / dstW;
		const scaleY = srcH / dstH;
		const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
		for (let y = 0; y < dstH; y++) {
			const sourceY = (y + .5) * scaleY - .5;
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
				const sourceX = (x + .5) * scaleX - .5;
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
					const top = srcData[topLeftIndex + c] * (1 - xWeight) + srcData[topRightIndex + c] * xWeight;
					const bottom = srcData[bottomLeftIndex + c] * (1 - xWeight) + srcData[bottomRightIndex + c] * xWeight;
					dstData[dstIndex + c] = Math.round(clamp(top * (1 - yWeight) + bottom * yWeight, 0, 255));
				}
			}
		}
		return new Image(dstW, dstH, channels, dstData);
	}
	resizeTriangle(dstW, dstH) {
		const srcW = this.width;
		const srcH = this.height;
		const channels = this.channels;
		const srcData = this.data;
		function triangle_kernel(x) {
			x = Math.abs(x);
			return x < 1 ? 1 - x : 0;
		}
		function clamp(v, min, max) {
			return Math.max(min, Math.min(max, v));
		}
		const tmpData = new Float32Array(srcW * dstH * channels);
		const ratioY = srcH / dstH;
		const sratioY = ratioY < 1 ? 1 : ratioY;
		const supportY = 1 * sratioY;
		for (let outy = 0; outy < dstH; outy++) {
			const inputy = (outy + .5) * ratioY - .5;
			const left = Math.max(0, Math.floor(inputy - supportY));
			const right = Math.min(srcH, Math.ceil(inputy + supportY));
			const ws = [];
			let sum = 0;
			for (let i = left; i < right; i++) {
				const w = triangle_kernel((i - inputy) / sratioY);
				ws.push(w);
				sum += w;
			}
			for (let i = 0; i < ws.length; i++) ws[i] /= sum;
			for (let x = 0; x < srcW; x++) for (let c = 0; c < channels; c++) {
				let t = 0;
				for (let i = 0; i < ws.length; i++) {
					const srcIdx = ((left + i) * srcW + x) * channels + c;
					t += srcData[srcIdx] * ws[i];
				}
				tmpData[(outy * srcW + x) * channels + c] = t;
			}
		}
		const dstData = new Uint8Array(dstW * dstH * channels);
		const ratioX = srcW / dstW;
		const sratioX = ratioX < 1 ? 1 : ratioX;
		const supportX = 1 * sratioX;
		for (let outx = 0; outx < dstW; outx++) {
			const inputx = (outx + .5) * ratioX - .5;
			const left = Math.max(0, Math.floor(inputx - supportX));
			const right = Math.min(srcW, Math.ceil(inputx + supportX));
			const ws = [];
			let sum = 0;
			for (let i = left; i < right; i++) {
				const w = triangle_kernel((i - inputx) / sratioX);
				ws.push(w);
				sum += w;
			}
			for (let i = 0; i < ws.length; i++) ws[i] /= sum;
			for (let y = 0; y < dstH; y++) for (let c = 0; c < channels; c++) {
				let t = 0;
				for (let i = 0; i < ws.length; i++) {
					const srcIdx = (y * srcW + (left + i)) * channels + c;
					t += tmpData[srcIdx] * ws[i];
				}
				dstData[(y * dstW + outx) * channels + c] = Math.round(clamp(t, 0, 255));
			}
		}
		return new Image(dstW, dstH, channels, dstData);
	}
	/**
	* 为图片添加指定颜色的边距，默认为透明的
	* @param options
	*/
	padding(options) {
		let { padding, vertical, horizontal, top, bottom, left, right, color } = options;
		if (typeof padding === "number") top = bottom = left = right = padding;
		else {
			if (typeof vertical === "number") top = bottom = vertical;
			if (typeof horizontal === "number") left = right = horizontal;
		}
		top = top ?? 0;
		bottom = bottom ?? 0;
		left = left ?? 0;
		right = right ?? 0;
		color = color ?? Array(this.channels).fill(0);
		if (color.length < this.channels) throw new Error(`Color length ${color.length} does not match image channels ${this.channels}`);
		const newW = this.width + left + right;
		const newH = this.height + top + bottom;
		const newData = new Uint8Array(newW * newH * this.channels);
		for (let y = 0; y < newH; y++) for (let x = 0; x < newW; x++) {
			const idx = (y * newW + x) * this.channels;
			newData.set(color.slice(0, this.channels), idx);
		}
		for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
			const srcIdx = (y * this.width + x) * this.channels;
			const dstIdx = ((y + top) * newW + (x + left)) * this.channels;
			newData.set(this.data.subarray(srcIdx, srcIdx + this.channels), dstIdx);
		}
		return new Image(newW, newH, this.channels, newData);
	}
	/**
	* 将当前图像转换为张量格式，以便输入到onnx模型
	* @param options
	*/
	tensor(options) {
		const mean = options.mean_values;
		const norm = options.norm_values;
		const channelOrder = options.channel_order ?? "rgb";
		const width = this.width;
		const height = this.height;
		const numChannels = 3;
		const rgbaData = this.data;
		const tensor = new Float32Array(width * height * numChannels);
		for (let h = 0; h < height; h++) for (let w = 0; w < width; w++) {
			const pixelIndex = (h * width + w) * this.channels;
			const tensorIndex = h * width + w;
			for (let c = 0; c < numChannels; c++) {
				const normalizedValue = rgbaData[pixelIndex + (channelOrder === "bgr" ? numChannels - c - 1 : c)] * norm[c] - mean[c] * norm[c];
				tensor[c * height * width + tensorIndex] = normalizedValue;
			}
		}
		return tensor;
	}
	/**
	* 灰度图阈值方法，大于阈值的像素点设为255，小于等于阈值的设为0
	* @param options
	*/
	threshold(options) {
		const threshold = options.threshold ?? 128;
		const width = this.width;
		const height = this.height;
		const binData = new Uint8Array(width * height);
		for (let i = 0; i < width * height; i++) binData[i] = this.data[i * this.channels] > threshold ? 255 : 0;
		return new Image(width, height, 1, binData);
	}
	/**
	* 膨胀操作，使用指定的范数和核大小
	* 进行处理的图片像素是0和255，膨胀255的像素点
	* 返回一个新的图片
	* @param options
	*/
	dilate(options = {}) {
		const { norm = "LInf", k = 1 } = options;
		if (norm !== "LInf") throw new Error("Only LInf norm is supported");
		if (this.channels !== 1) throw new Error("Dilate only supports single channel (grayscale) images");
		if (!Number.isInteger(k) || k < 0) throw new Error(`Invalid dilation kernel size: ${k}. Expected a non-negative integer.`);
		if (k <= 1) return new Image(this.width, this.height, this.channels, new Uint8Array(this.data));
		const width = this.width;
		const height = this.height;
		const src = this.data;
		const out = new Uint8Array(width * height);
		const anchor = Math.floor(k / 2);
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
			let value = 0;
			for (let ky = 0; ky < k && value === 0; ky++) {
				const sourceY = y + ky - anchor;
				if (sourceY < 0 || sourceY >= height) continue;
				for (let kx = 0; kx < k; kx++) {
					const sourceX = x + kx - anchor;
					if (sourceX < 0 || sourceX >= width) continue;
					if (src[sourceY * width + sourceX] > 0) {
						value = 255;
						break;
					}
				}
			}
			out[y * width + x] = value;
		}
		return new Image(width, height, 1, out);
	}
	/**
	* 获取图像中的轮廓
	* @returns
	*/
	contours(options = {}) {
		const minArea = options.minArea ?? 1;
		const width = this.width;
		const height = this.height;
		const bin = new Uint8Array(width * height);
		for (let i = 0; i < width * height; i++) bin[i] = this.data[i] > 0 ? 1 : 0;
		const visited = new Uint8Array(width * height);
		const boxes = [];
		const at = (x, y) => y * width + x;
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (bin[at(x, y)] && !visited[at(x, y)]) {
			let minX = x, minY = y, maxX = x, maxY = y, area = 0;
			const queue = [[x, y]];
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
					[1, 1]
				]) {
					const nx = cx + dx, ny = cy + dy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height && bin[at(nx, ny)] && !visited[at(nx, ny)]) {
						visited[at(nx, ny)] = 1;
						queue.push([nx, ny]);
					}
				}
			}
			if (area >= minArea) boxes.push({
				x: minX,
				y: minY,
				width: maxX - minX + 1,
				height: maxY - minY + 1
			});
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
	rect(options) {
		const { x, y, width, height, color = [], lineWidth = 1 } = options;
		if (!color.length) color.push(...Array(this.channels).fill(255));
		if (this.channels !== color.length) throw new Error(`Color length ${color.length} does not match image channels ${this.channels}`);
		for (let dy = 0; dy < lineWidth; dy++) for (let i = 0; i < width; i++) {
			const yy = y + dy;
			const xx = x + i;
			if (yy >= 0 && yy < this.height && xx >= 0 && xx < this.width) {
				const idx = (yy * this.width + xx) * this.channels;
				this.data.set(color, idx);
			}
			const by = y + height - 1 - dy;
			if (by >= 0 && by < this.height && xx >= 0 && xx < this.width) {
				const idx = (by * this.width + xx) * this.channels;
				this.data.set(color, idx);
			}
		}
		for (let dx = 0; dx < lineWidth; dx++) for (let j = 0; j < height; j++) {
			const xx = x + dx;
			const yy = y + j;
			if (xx >= 0 && xx < this.width && yy >= 0 && yy < this.height) {
				const idx = (yy * this.width + xx) * this.channels;
				this.data.set(color, idx);
			}
			const rx = x + width - 1 - dx;
			if (rx >= 0 && rx < this.width && yy >= 0 && yy < this.height) {
				const idx = (yy * this.width + rx) * this.channels;
				this.data.set(color, idx);
			}
		}
	}
	rotateCounterClockwise() {
		const rotatedData = new Uint8Array(this.width * this.height * this.channels);
		const rotatedWidth = this.height;
		const rotatedHeight = this.width;
		for (let y = 0; y < rotatedHeight; y++) for (let x = 0; x < rotatedWidth; x++) {
			const srcX = this.width - 1 - y;
			const srcIndex = (x * this.width + srcX) * this.channels;
			const dstIndex = (y * rotatedWidth + x) * this.channels;
			rotatedData.set(this.data.subarray(srcIndex, srcIndex + this.channels), dstIndex);
		}
		return new Image(rotatedWidth, rotatedHeight, this.channels, rotatedData);
	}
	sampleCubicPixel(x, y, output, outputIndex) {
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
};
function distance(pointA, pointB) {
	return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}
function getPerspectiveTransform(source, target) {
	const matrix = [];
	const values = [];
	for (let i = 0; i < 4; i++) {
		const src = source[i];
		const dst = target[i];
		matrix.push([
			src.x,
			src.y,
			1,
			0,
			0,
			0,
			-src.x * dst.x,
			-src.y * dst.x
		]);
		values.push(dst.x);
		matrix.push([
			0,
			0,
			0,
			src.x,
			src.y,
			1,
			-src.x * dst.y,
			-src.y * dst.y
		]);
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
		1
	];
}
function solveLinearSystem(matrix, values) {
	const size = values.length;
	const augmented = matrix.map((row, index) => [...row, values[index]]);
	for (let col = 0; col < size; col++) {
		let pivot = col;
		for (let row = col + 1; row < size; row++) if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
		if (Math.abs(augmented[pivot][col]) < Number.EPSILON) throw new Error("Cannot calculate perspective transform from degenerate points");
		if (pivot !== col) [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
		const pivotValue = augmented[col][col];
		for (let entry = col; entry <= size; entry++) augmented[col][entry] /= pivotValue;
		for (let row = 0; row < size; row++) {
			if (row === col) continue;
			const factor = augmented[row][col];
			for (let entry = col; entry <= size; entry++) augmented[row][entry] -= factor * augmented[col][entry];
		}
	}
	return augmented.map((row) => row[size]);
}
function transformPoint(matrix, x, y) {
	const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
	if (Math.abs(denominator) < Number.EPSILON) return {
		x: 0,
		y: 0
	};
	return {
		x: (matrix[0] * x + matrix[1] * y + matrix[2]) / denominator,
		y: (matrix[3] * x + matrix[4] * y + matrix[5]) / denominator
	};
}
function cubicCoefficients(x) {
	const a = -.75;
	const x1 = x + 1;
	const x2 = 1 - x;
	const coeff0 = ((a * x1 - 5 * a) * x1 + 8 * a) * x1 - 4 * a;
	const coeff1 = ((a + 2) * x - (a + 3)) * x * x + 1;
	const coeff2 = ((a + 2) * x2 - (a + 3)) * x2 * x2 + 1;
	return [
		coeff0,
		coeff1,
		coeff2,
		1 - coeff0 - coeff1 - coeff2
	];
}
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
function clampInt(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
//#endregion
//#region src/core/input.ts
function normalizeInputToRgb(input) {
	if (!Number.isInteger(input.width) || input.width <= 0) throw new Error(`Invalid input width: ${input.width}. Expected a positive integer.`);
	if (!Number.isInteger(input.height) || input.height <= 0) throw new Error(`Invalid input height: ${input.height}. Expected a positive integer.`);
	const pixels = input.width * input.height;
	const channels = input.data.length / pixels;
	if (!Number.isInteger(channels) || channels < 1 || channels > 4) throw new Error(`Invalid input data length ${input.data.length} for image size ${input.width}x${input.height}. Expected 1, 2, 3, or 4 channels.`);
	if (channels === 3) return new Image(input.width, input.height, 3, input.data);
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
//#endregion
//#region src/modules/formula-recognition/postprocess.ts
const DEFAULT_SPECIAL_TOKEN_IDS = {
	bos: 0,
	pad: 1,
	eos: 2,
	unk: 3
};
const BYTE_DECODER = createByteLevelDecoder();
function postprocessFormulaRecognition(outputs, options) {
	const vocabulary = validateFormulaTokenizerVocabulary(options.tokenizerVocabulary);
	const tokenIds = extractFormulaTokenIds(selectFormulaRecognitionOutputTensor(outputs, vocabulary.length), vocabulary.length);
	const decoded = decodeFormulaTokenIds(options.maxSequenceLength && tokenIds.length > options.maxSequenceLength ? tokenIds.slice(0, options.maxSequenceLength) : tokenIds, vocabulary, options.specialTokenIds);
	return {
		formula: decoded.formula,
		tokenIds: decoded.tokenIds,
		tokens: decoded.tokens
	};
}
function createFormulaTokenizerVocabulary(tokenizerJson) {
	if (!isObject(tokenizerJson)) throw new Error("Formula tokenizer JSON must be an object.");
	const model = tokenizerJson.model;
	if (!isObject(model) || !isObject(model.vocab)) throw new Error("Formula tokenizer JSON must contain model.vocab.");
	const vocabulary = [];
	for (const [token, id] of Object.entries(model.vocab)) {
		if (!Number.isInteger(id) || id < 0) throw new Error(`Invalid formula tokenizer id for token '${token}': ${String(id)}.`);
		vocabulary[id] = token;
	}
	return validateFormulaTokenizerVocabulary(vocabulary).slice();
}
function selectFormulaRecognitionOutputTensor(outputs, vocabularyLength) {
	const supported = Object.entries(outputs).filter(([, tensor]) => isSupportedFormulaOutputTensor(tensor, vocabularyLength));
	if (supported.length === 0) throw new Error(`Formula recognition output tensor with token ids or logits not found. Available outputs: ${Object.keys(outputs).join(", ")}`);
	return (supported.find(([name]) => /^(word_pred|sequences?|tokens?|logits?|output0?)$/i.test(name)) ?? supported[0])[1];
}
function isSupportedFormulaOutputTensor(tensor, vocabularyLength) {
	return isFormulaTokenIdTensor(tensor) || isFormulaLogitsTensor(tensor, vocabularyLength);
}
function isFormulaTokenIdTensor(tensor) {
	if (tensor.dims.length !== 1 && !(tensor.dims.length === 2 && tensor.dims[0] === 1)) return false;
	return isIntegerLikeTensorData(tensor.data);
}
function isFormulaLogitsTensor(tensor, vocabularyLength) {
	if (!(tensor.data instanceof Float32Array)) return false;
	if (tensor.dims.length === 2) return tensor.dims[1] === vocabularyLength;
	return tensor.dims.length === 3 && tensor.dims[0] === 1 && tensor.dims[2] === vocabularyLength;
}
function extractFormulaTokenIds(tensor, vocabularyLength) {
	if (isFormulaTokenIdTensor(tensor)) return Array.from(tensor.data, (value) => numberFromTokenId(value));
	if (!isFormulaLogitsTensor(tensor, vocabularyLength)) throw new Error(`Unsupported formula recognition output shape [${tensor.dims.join(",")}].`);
	const data = tensor.data;
	const sequenceLength = tensor.dims.length === 2 ? tensor.dims[0] : tensor.dims[1];
	const tokenIds = [];
	for (let tokenIndex = 0; tokenIndex < sequenceLength; tokenIndex += 1) {
		const offset = tokenIndex * vocabularyLength;
		tokenIds.push(argmax(data, offset, vocabularyLength));
	}
	return tokenIds;
}
function decodeFormulaTokenIds(tokenIds, vocabulary, specialTokenIds = DEFAULT_SPECIAL_TOKEN_IDS) {
	const skipTokenIds = new Set([
		specialTokenIds.bos,
		specialTokenIds.pad,
		specialTokenIds.unk,
		...specialTokenIds.additional ?? []
	]);
	const keptTokenIds = [];
	const tokens = [];
	for (const tokenId of tokenIds) {
		if (tokenId === specialTokenIds.eos) break;
		if (skipTokenIds.has(tokenId)) continue;
		const token = vocabulary[tokenId];
		if (token === void 0) throw new Error(`Formula token id ${tokenId} is outside tokenizer vocabulary.`);
		keptTokenIds.push(tokenId);
		tokens.push(token);
	}
	return {
		formula: decodeByteLevelTokens(tokens),
		tokenIds: keptTokenIds,
		tokens
	};
}
function decodeByteLevelTokens(tokens) {
	const bytes = [];
	for (const char of tokens.join("")) {
		const byte = BYTE_DECODER.get(char);
		if (byte === void 0) for (const codePoint of new TextEncoder().encode(char)) bytes.push(codePoint);
		else bytes.push(byte);
	}
	return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
}
function createByteLevelDecoder() {
	const bytes = [];
	for (let value = 33; value <= 126; value += 1) bytes.push(value);
	for (let value = 161; value <= 172; value += 1) bytes.push(value);
	for (let value = 174; value <= 255; value += 1) bytes.push(value);
	const chars = bytes.slice();
	let nextCodePoint = 0;
	for (let value = 0; value <= 255; value += 1) if (!bytes.includes(value)) {
		bytes.push(value);
		chars.push(256 + nextCodePoint);
		nextCodePoint += 1;
	}
	return new Map(chars.map((codePoint, index) => [String.fromCodePoint(codePoint), bytes[index]]));
}
function argmax(data, offset, length) {
	let bestIndex = 0;
	let bestScore = data[offset];
	for (let index = 1; index < length; index += 1) {
		const score = data[offset + index];
		if (score > bestScore) {
			bestScore = score;
			bestIndex = index;
		}
	}
	return bestIndex;
}
function numberFromTokenId(value) {
	const tokenId = typeof value === "bigint" ? Number(value) : value;
	if (!Number.isInteger(tokenId) || tokenId < 0) throw new Error(`Invalid formula token id: ${String(value)}.`);
	return tokenId;
}
function validateFormulaTokenizerVocabulary(vocabulary) {
	if (!Array.isArray(vocabulary) || vocabulary.length === 0) throw new Error("Formula recognition tokenizerVocabulary is required.");
	for (const [index, token] of vocabulary.entries()) if (typeof token !== "string") throw new Error(`Invalid formula tokenizer token at id ${index}.`);
	return vocabulary;
}
function isIntegerLikeTensorData(data) {
	return data instanceof Int8Array || data instanceof Uint8Array || data instanceof Int16Array || data instanceof Uint16Array || data instanceof Int32Array || data instanceof Uint32Array || data instanceof BigInt64Array || data instanceof BigUint64Array;
}
function isObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
//#region src/modules/formula-recognition/preprocess.ts
function preprocessFormulaRecognition(image, runtimeOptions) {
	validateFormulaRecognitionPreprocessOptions(runtimeOptions);
	const cropBox = calculateFormulaCropBox(image, runtimeOptions);
	const croppedImage = cropBox.x === 0 && cropBox.y === 0 && cropBox.width === image.width && cropBox.height === image.height ? image : image.crop(cropBox);
	const shortEdgeSize = calculateFormulaShortEdgeResizeSize(croppedImage, runtimeOptions);
	const shortEdgeImage = croppedImage.resize({
		width: shortEdgeSize.width,
		height: shortEdgeSize.height
	});
	const thumbnailSize = calculateFormulaThumbnailSize(shortEdgeImage, runtimeOptions);
	const resizedImage = shortEdgeImage.resize({
		width: thumbnailSize.width,
		height: thumbnailSize.height
	});
	const paddingLeft = Math.floor((runtimeOptions.imageWidth - resizedImage.width) / 2);
	const paddingTop = Math.floor((runtimeOptions.imageHeight - resizedImage.height) / 2);
	const paddingRight = runtimeOptions.imageWidth - resizedImage.width - paddingLeft;
	const paddingBottom = runtimeOptions.imageHeight - resizedImage.height - paddingTop;
	const paddedImage = resizedImage.padding({
		left: paddingLeft,
		top: paddingTop,
		right: paddingRight,
		bottom: paddingBottom,
		color: [
			runtimeOptions.imagePaddingValue,
			runtimeOptions.imagePaddingValue,
			runtimeOptions.imagePaddingValue
		]
	});
	const tensorPaddedWidth = Math.ceil(paddedImage.width / 16) * 16;
	const tensorPaddedHeight = Math.ceil(paddedImage.height / 16) * 16;
	const tensor = new Float32Array(tensorPaddedWidth * tensorPaddedHeight);
	tensor.fill(runtimeOptions.latexPaddingValue);
	for (let y = 0; y < paddedImage.height; y++) for (let x = 0; x < paddedImage.width; x++) {
		const pixelIndex = (y * paddedImage.width + x) * paddedImage.channels;
		const grayscale = rgbToLuminance(paddedImage.data[pixelIndex], paddedImage.data[pixelIndex + 1], paddedImage.data[pixelIndex + 2]);
		tensor[y * tensorPaddedWidth + x] = (grayscale / 255 - runtimeOptions.grayscaleMean) / runtimeOptions.grayscaleStdDeviation;
	}
	return {
		image: {
			data: tensor,
			dims: [
				1,
				1,
				tensorPaddedHeight,
				tensorPaddedWidth
			]
		},
		resizeParams: {
			srcWidth: image.width,
			srcHeight: image.height,
			croppedX: cropBox.x,
			croppedY: cropBox.y,
			croppedWidth: cropBox.width,
			croppedHeight: cropBox.height,
			resizedWidth: resizedImage.width,
			resizedHeight: resizedImage.height,
			imagePaddedWidth: paddedImage.width,
			imagePaddedHeight: paddedImage.height,
			tensorPaddedWidth,
			tensorPaddedHeight,
			paddingLeft,
			paddingTop,
			paddingRight,
			paddingBottom
		}
	};
}
function createFormulaRecognitionInputFeeds(ortModule, session, input, runtimeOptions = {}) {
	return { [session.inputNames?.[0] ?? runtimeOptions.inputName ?? "x"]: new ortModule.Tensor("float32", input.image.data, input.image.dims) };
}
function calculateFormulaCropBox(image, runtimeOptions) {
	const threshold = runtimeOptions.cropMarginThreshold;
	const maxAspectRatio = runtimeOptions.cropMarginMaxAspectRatio;
	if (!Number.isFinite(threshold) || !Number.isFinite(maxAspectRatio)) throw new Error("Formula crop-margin options require finite cropMarginThreshold and cropMarginMaxAspectRatio.");
	let minGray = 255;
	let maxGray = 0;
	const grayscale = new Uint8Array(image.width * image.height);
	for (let pixelIndex = 0; pixelIndex < grayscale.length; pixelIndex++) {
		const sourceIndex = pixelIndex * image.channels;
		const value = rgbToLuminance(image.data[sourceIndex], image.data[sourceIndex + 1], image.data[sourceIndex + 2]);
		grayscale[pixelIndex] = value;
		minGray = Math.min(minGray, value);
		maxGray = Math.max(maxGray, value);
	}
	if (maxGray === minGray) return fullImageCropBox(image);
	let minX = image.width;
	let minY = image.height;
	let maxX = -1;
	let maxY = -1;
	for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) if ((grayscale[y * image.width + x] - minGray) / (maxGray - minGray) * 255 < threshold) {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}
	if (maxX < minX || maxY < minY) return fullImageCropBox(image);
	const width = maxX - minX + 1;
	const height = maxY - minY + 1;
	if (width === 0 || height === 0 || Math.max(width, height) / Math.min(width, height) > maxAspectRatio) return fullImageCropBox(image);
	return {
		x: minX,
		y: minY,
		width,
		height
	};
}
function calculateFormulaShortEdgeResizeSize(image, runtimeOptions) {
	const shortEdgeTarget = Math.min(runtimeOptions.imageHeight, runtimeOptions.imageWidth);
	if (image.width <= image.height) return {
		width: shortEdgeTarget,
		height: Math.max(1, Math.floor(shortEdgeTarget * image.height / image.width))
	};
	return {
		width: Math.max(1, Math.floor(shortEdgeTarget * image.width / image.height)),
		height: shortEdgeTarget
	};
}
function calculateFormulaThumbnailSize(image, runtimeOptions) {
	const maxWidth = runtimeOptions.imageWidth;
	const maxHeight = runtimeOptions.imageHeight;
	const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
	const resizedWidth = Math.max(1, Math.floor(image.width * scale));
	const resizedHeight = Math.max(1, Math.floor(image.height * scale));
	if (resizedWidth > maxWidth || resizedHeight > maxHeight) throw new Error(`Invalid formula resize result: ${resizedWidth}x${resizedHeight} exceeds padded size ${maxWidth}x${maxHeight}.`);
	return {
		width: resizedWidth,
		height: resizedHeight
	};
}
function validateFormulaRecognitionPreprocessOptions(runtimeOptions) {
	if (!Number.isInteger(runtimeOptions.imageWidth) || runtimeOptions.imageWidth <= 0) throw new Error(`Invalid formula recognition imageWidth: ${runtimeOptions.imageWidth}. Expected a positive integer.`);
	if (!Number.isInteger(runtimeOptions.imageHeight) || runtimeOptions.imageHeight <= 0) throw new Error(`Invalid formula recognition imageHeight: ${runtimeOptions.imageHeight}. Expected a positive integer.`);
	if (runtimeOptions.inputChannels !== 1) throw new Error(`Unsupported formula recognition inputChannels: ${runtimeOptions.inputChannels}. Expected 1.`);
	if (!Number.isFinite(runtimeOptions.grayscaleMean) || !Number.isFinite(runtimeOptions.grayscaleStdDeviation) || runtimeOptions.grayscaleStdDeviation === 0) throw new Error("Formula recognition grayscale normalization requires finite mean and non-zero std deviation.");
	if (!Number.isFinite(runtimeOptions.imagePaddingValue)) throw new Error("Formula recognition imagePaddingValue must be finite.");
	if (!Number.isFinite(runtimeOptions.latexPaddingValue)) throw new Error("Formula recognition latexPaddingValue must be finite.");
}
function fullImageCropBox(image) {
	return {
		x: 0,
		y: 0,
		width: image.width,
		height: image.height
	};
}
function rgbToLuminance(red = 0, green = 0, blue = 0) {
	return Math.round(red * .299 + green * .587 + blue * .114);
}
//#endregion
//#region src/modules/formula-recognition/preset.ts
const PP_FORMULANET_BASE_OPTIONS = {
	inputChannels: 1,
	grayscaleMean: .7931,
	grayscaleStdDeviation: .1738,
	cropMarginThreshold: 200,
	cropMarginMaxAspectRatio: 200,
	imagePaddingValue: 0,
	latexPaddingValue: 1,
	inputName: "x",
	maxSequenceLength: 2560,
	preprocessPipeline: [
		"UniMERNetImgDecode",
		"UniMERNetTestTransform",
		"LatexImageFormat",
		"UniMERNetLabelEncode"
	],
	decoderName: "UniMERNetDecode",
	tokenizerType: "NougatTokenizer",
	tokenizerPath: "ppocr/utils/dict/unimernet_tokenizer",
	specialTokenIds: {
		bos: 0,
		pad: 1,
		eos: 2,
		unk: 3
	}
};
function createFormulaNetOptions(imageSize, maxSequenceLength) {
	return {
		...PP_FORMULANET_BASE_OPTIONS,
		imageHeight: imageSize,
		imageWidth: imageSize,
		maxSequenceLength
	};
}
const FORMULA_RECOGNITION_PRESETS = {
	"PP-FormulaNet-S": {
		name: "PP-FormulaNet-S",
		module: "formula_recognition",
		architecture: "PP-FormulaNet",
		options: createFormulaNetOptions(384, 1024)
	},
	"PP-FormulaNet-L": {
		name: "PP-FormulaNet-L",
		module: "formula_recognition",
		architecture: "PP-FormulaNet",
		options: createFormulaNetOptions(768, 1024)
	},
	"PP-FormulaNet_plus-S": {
		name: "PP-FormulaNet_plus-S",
		module: "formula_recognition",
		architecture: "PP-FormulaNet",
		options: createFormulaNetOptions(384, 1024)
	},
	"PP-FormulaNet_plus-M": {
		name: "PP-FormulaNet_plus-M",
		module: "formula_recognition",
		architecture: "PP-FormulaNet",
		options: createFormulaNetOptions(384, 2560)
	},
	"PP-FormulaNet_plus-L": {
		name: "PP-FormulaNet_plus-L",
		module: "formula_recognition",
		architecture: "PP-FormulaNet",
		options: createFormulaNetOptions(768, 2560)
	}
};
function getFormulaRecognitionPreset(name) {
	const preset = FORMULA_RECOGNITION_PRESETS[name];
	if (!preset) throw new Error(`Unsupported formula recognition preset: ${name}`);
	return preset;
}
function getFormulaRecognitionPresetOptions(name) {
	if (!name) return {};
	const options = getFormulaRecognitionPreset(name).options;
	return {
		...options,
		preprocessPipeline: options.preprocessPipeline ? [...options.preprocessPipeline] : void 0,
		specialTokenIds: options.specialTokenIds ? { ...options.specialTokenIds } : void 0
	};
}
//#endregion
//#region src/modules/formula-recognition/service.ts
/**
* Lightweight raw runner for PaddleOCR/PaddleX formula recognition modules.
*/
var FormulaRecognitionService = class {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = { ...options };
	}
	async runRaw(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		const preprocessed = preprocessFormulaRecognition(normalizeInputToRgb(input), runtimeOptions);
		const outputs = await this.session.run(createFormulaRecognitionInputFeeds(this.ortModule, this.session, preprocessed, runtimeOptions));
		if (Object.keys(outputs).length === 0) throw new Error("Formula recognition session returned no output tensors.");
		return {
			outputs,
			resizeParams: preprocessed.resizeParams
		};
	}
	async run(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		const preprocessed = preprocessFormulaRecognition(normalizeInputToRgb(input), runtimeOptions);
		const outputs = await this.session.run(createFormulaRecognitionInputFeeds(this.ortModule, this.session, preprocessed, runtimeOptions));
		if (Object.keys(outputs).length === 0) throw new Error("Formula recognition session returned no output tensors.");
		return postprocessFormulaRecognition(outputs, runtimeOptions);
	}
	resolveRuntimeOptions(options) {
		const runtimeOptions = {
			...this.options,
			...options
		};
		return {
			imageHeight: this.requirePositiveInteger(runtimeOptions.imageHeight, "imageHeight"),
			imageWidth: this.requirePositiveInteger(runtimeOptions.imageWidth, "imageWidth"),
			inputChannels: this.requireInputChannels(runtimeOptions.inputChannels),
			grayscaleMean: this.requireFiniteNumber(runtimeOptions.grayscaleMean, "grayscaleMean"),
			grayscaleStdDeviation: this.requireNonZeroFiniteNumber(runtimeOptions.grayscaleStdDeviation, "grayscaleStdDeviation"),
			cropMarginThreshold: this.requireFiniteNumber(runtimeOptions.cropMarginThreshold, "cropMarginThreshold"),
			cropMarginMaxAspectRatio: this.requirePositiveNumber(runtimeOptions.cropMarginMaxAspectRatio, "cropMarginMaxAspectRatio"),
			imagePaddingValue: this.requireFiniteNumber(runtimeOptions.imagePaddingValue, "imagePaddingValue"),
			latexPaddingValue: this.requireFiniteNumber(runtimeOptions.latexPaddingValue, "latexPaddingValue"),
			inputName: runtimeOptions.inputName,
			maxSequenceLength: runtimeOptions.maxSequenceLength,
			preprocessPipeline: runtimeOptions.preprocessPipeline,
			decoderName: runtimeOptions.decoderName,
			tokenizerType: runtimeOptions.tokenizerType,
			tokenizerPath: runtimeOptions.tokenizerPath,
			tokenizerVocabulary: runtimeOptions.tokenizerVocabulary,
			specialTokenIds: runtimeOptions.specialTokenIds
		};
	}
	requirePositiveInteger(value, name) {
		if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid formula recognition ${name}: ${value}. Expected a positive integer.`);
		return value;
	}
	requireInputChannels(value) {
		if (value !== 1) throw new Error(`Unsupported formula recognition inputChannels: ${value}. Expected 1.`);
		return value;
	}
	requireFiniteNumber(value, name) {
		if (!Number.isFinite(value)) throw new Error(`Invalid formula recognition ${name}: ${value}. Expected a finite number.`);
		return value;
	}
	requireNonZeroFiniteNumber(value, name) {
		const numberValue = this.requireFiniteNumber(value, name);
		if (numberValue === 0) throw new Error(`Invalid formula recognition ${name}: ${value}. Expected a non-zero finite number.`);
		return numberValue;
	}
	requirePositiveNumber(value, name) {
		const numberValue = this.requireFiniteNumber(value, name);
		if (numberValue <= 0) throw new Error(`Invalid formula recognition ${name}: ${value}. Expected a positive finite number.`);
		return numberValue;
	}
};
//#endregion
//#region src/modules/image-classification/preset.ts
const TEXTLINE_ORIENTATION_LABELS = ["0_degree", "180_degree"];
const PPLCNET_NORMALIZATION = {
	mean: [
		.485 * 255,
		.456 * 255,
		.406 * 255
	],
	stdDeviation: [
		1 / .229 / 255,
		1 / .224 / 255,
		1 / .225 / 255
	],
	channelOrder: "bgr"
};
const PPLCNET_CLASSIFICATION_OPTIONS = {
	imageHeight: 224,
	imageWidth: 224,
	resizeMode: "resize-short-crop",
	resizeShort: 256,
	...PPLCNET_NORMALIZATION
};
const TEXTLINE_ORIENTATION_OPTIONS = {
	imageHeight: 80,
	imageWidth: 160,
	resizeMode: "stretch",
	...PPLCNET_NORMALIZATION,
	labels: TEXTLINE_ORIENTATION_LABELS,
	topK: 1
};
const IMAGE_CLASSIFICATION_PRESETS = {
	"PP-LCNet_x1_0_doc_ori": {
		name: "PP-LCNet_x1_0_doc_ori",
		module: "doc_image_orientation_classification",
		options: {
			...PPLCNET_CLASSIFICATION_OPTIONS,
			labels: [
				"0",
				"90",
				"180",
				"270"
			],
			topK: 1
		}
	},
	"PP-LCNet_x0_25_textline_ori": {
		name: "PP-LCNet_x0_25_textline_ori",
		module: "textline_orientation_classification",
		options: TEXTLINE_ORIENTATION_OPTIONS
	},
	"PP-LCNet_x1_0_textline_ori": {
		name: "PP-LCNet_x1_0_textline_ori",
		module: "textline_orientation_classification",
		options: TEXTLINE_ORIENTATION_OPTIONS
	},
	"PP-LCNet_x1_0_table_cls": {
		name: "PP-LCNet_x1_0_table_cls",
		module: "table_classification",
		options: {
			...PPLCNET_CLASSIFICATION_OPTIONS,
			labels: ["wired_table", "wireless_table"],
			topK: 5
		}
	}
};
function getImageClassificationPreset(name) {
	const preset = IMAGE_CLASSIFICATION_PRESETS[name];
	if (!preset) throw new Error(`Unsupported image classification preset: ${name}`);
	return preset;
}
function getImageClassificationPresetOptions(name) {
	if (!name) return {};
	const options = getImageClassificationPreset(name).options;
	return {
		...options,
		labels: options.labels ? [...options.labels] : void 0
	};
}
//#endregion
//#region src/core/onnx.ts
function createInputFeeds(session, inputTensor) {
	return { [session.inputNames?.[0] ?? "x"]: inputTensor };
}
function getFixedInputDimension(session, dimensionIndex) {
	const dimension = session.inputMetadata?.[0]?.shape?.[dimensionIndex];
	if (typeof dimension !== "number" || dimension <= 0 || !Number.isFinite(dimension)) return;
	return dimension;
}
function getFixedInputShape(session) {
	return {
		channels: getFixedInputDimension(session, 1),
		height: getFixedInputDimension(session, 2),
		width: getFixedInputDimension(session, 3)
	};
}
//#endregion
//#region src/modules/image-classification/service.ts
/**
* Lightweight generic service for PaddleOCR image classification modules.
*/
var ImageClassificationService = class {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = { ...options };
	}
	async run(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		this.validateRuntimeOptions(runtimeOptions);
		const tensor = this.preprocessImage(normalizeInputToRgb(input), runtimeOptions).tensor({
			mean_values: runtimeOptions.mean,
			norm_values: runtimeOptions.stdDeviation,
			channel_order: runtimeOptions.channelOrder
		});
		const inputTensor = new this.ortModule.Tensor("float32", tensor, [
			1,
			3,
			runtimeOptions.imageHeight,
			runtimeOptions.imageWidth
		]);
		const outputTensor = await this.runInference(inputTensor);
		const scores = this.extractScores(outputTensor);
		const topK = Math.min(runtimeOptions.topK, scores.length);
		return Array.from(scores, (score, classId) => ({
			classId,
			score
		})).sort((a, b) => b.score - a.score).slice(0, topK).map((result) => ({
			...result,
			label: runtimeOptions.labels[result.classId] ?? String(result.classId)
		}));
	}
	resolveRuntimeOptions(options = {}) {
		const fixedInputShape = this.resolveFixedInputShape();
		return {
			...DEFAULT_IMAGE_CLASSIFICATION_OPTIONS,
			...fixedInputShape,
			...this.options,
			...options
		};
	}
	resolveFixedInputShape() {
		const fixedInputShape = getFixedInputShape(this.session);
		if (!fixedInputShape.height || !fixedInputShape.width) return {};
		return {
			imageHeight: fixedInputShape.height,
			imageWidth: fixedInputShape.width
		};
	}
	preprocessImage(image, runtimeOptions) {
		if (runtimeOptions.resizeMode === "stretch") return image.resize({
			width: runtimeOptions.imageWidth,
			height: runtimeOptions.imageHeight
		});
		if (runtimeOptions.resizeMode === "resize-short-crop") return this.resizeShortAndCenterCrop(image, runtimeOptions);
		const resizedWidth = Math.min(Math.ceil(runtimeOptions.imageHeight * (image.width / image.height)), runtimeOptions.imageWidth);
		const resizedImage = image.resize({
			width: resizedWidth,
			height: runtimeOptions.imageHeight
		});
		if (resizedWidth === runtimeOptions.imageWidth) return resizedImage;
		return resizedImage.padding({
			right: runtimeOptions.imageWidth - resizedWidth,
			color: [
				0,
				0,
				0
			]
		});
	}
	resizeShortAndCenterCrop(image, runtimeOptions) {
		const scale = runtimeOptions.resizeShort / Math.min(image.width, image.height);
		const resizedWidth = Math.round(image.width * scale);
		const resizedHeight = Math.round(image.height * scale);
		const resizedImage = image.resize({
			width: resizedWidth,
			height: resizedHeight
		});
		if (resizedImage.width < runtimeOptions.imageWidth || resizedImage.height < runtimeOptions.imageHeight) throw new Error(`Invalid classification resizeShort: ${runtimeOptions.resizeShort}. Resized image ${resizedImage.width}x${resizedImage.height} is smaller than crop ${runtimeOptions.imageWidth}x${runtimeOptions.imageHeight}.`);
		return resizedImage.crop({
			x: Math.floor((resizedImage.width - runtimeOptions.imageWidth) / 2),
			y: Math.floor((resizedImage.height - runtimeOptions.imageHeight) / 2),
			width: runtimeOptions.imageWidth,
			height: runtimeOptions.imageHeight
		});
	}
	validateRuntimeOptions(runtimeOptions) {
		if (!Number.isInteger(runtimeOptions.imageWidth) || runtimeOptions.imageWidth <= 0) throw new Error(`Invalid classification imageWidth: ${runtimeOptions.imageWidth}. Expected a positive integer.`);
		if (!Number.isInteger(runtimeOptions.imageHeight) || runtimeOptions.imageHeight <= 0) throw new Error(`Invalid classification imageHeight: ${runtimeOptions.imageHeight}. Expected a positive integer.`);
		if (!Number.isInteger(runtimeOptions.topK) || runtimeOptions.topK <= 0) throw new Error(`Invalid classification topK: ${runtimeOptions.topK}. Expected a positive integer.`);
		if (runtimeOptions.resizeMode !== "stretch" && runtimeOptions.resizeMode !== "pad" && runtimeOptions.resizeMode !== "resize-short-crop") throw new Error(`Unsupported classification resizeMode: ${runtimeOptions.resizeMode}. Expected "stretch", "pad", or "resize-short-crop".`);
		if (!Number.isInteger(runtimeOptions.resizeShort) || runtimeOptions.resizeShort <= 0) throw new Error(`Invalid classification resizeShort: ${runtimeOptions.resizeShort}. Expected a positive integer.`);
	}
	async runInference(inputTensor) {
		const results = await this.session.run(createInputFeeds(this.session, inputTensor));
		const outputNodeName = this.session.outputNames[0] ?? Object.keys(results)[0];
		const outputTensor = outputNodeName ? results[outputNodeName] : void 0;
		if (!outputTensor) throw new Error(`Classification output tensor '${outputNodeName ?? "<none>"}' not found. Available keys: ${Object.keys(results).join(", ")}`);
		return outputTensor;
	}
	extractScores(outputTensor) {
		const { data, dims } = outputTensor;
		if (!(data instanceof Float32Array)) throw new Error("Classification output tensor must contain Float32Array data.");
		if (dims.length === 1) {
			if (data.length !== dims[0]) throw new Error(`Classification output shape [${dims.join(",")}] does not match data length ${data.length}.`);
			return data;
		}
		if (dims.length === 2 && (dims[0] === 1 || dims[0] === -1) && dims[1] > 0) {
			if (data.length !== dims[1]) throw new Error(`Classification output shape [${dims.join(",")}] does not match data length ${data.length}.`);
			return data;
		}
		throw new Error(`Unsupported classification output shape [${dims.join(",")}]. Expected [C] or [1,C].`);
	}
};
//#endregion
//#region src/modules/object-detection/postprocess.ts
const LAYOUT_NMS_IOU_THRESHOLD = .5;
function postprocessObjectDetection(outputs, options = {}) {
	const outputTensor = selectObjectDetectionOutputTensor(outputs);
	const data = extractObjectDetectionOutputData(outputTensor);
	validateObjectDetectionOutputShape(outputTensor, data);
	const rowCount = resolveObjectDetectionRowCount(outputs, data.length / 6, outputTensor);
	const boxes = [];
	for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
		const offset = rowIndex * 6;
		const parsed = parseObjectDetectionRow(data, offset, options.outputLayout ?? inferObjectDetectionOutputLayout(data, offset));
		if (parsed.classId < 0 || parsed.score < resolveObjectDetectionThreshold(options, parsed.classId)) continue;
		if (parsed.coordinate.some((value) => !Number.isFinite(value))) throw new Error(`Object detection output row at offset ${offset} contains non-finite coordinates.`);
		const box = {
			...parsed,
			label: options.labels?.[parsed.classId] ?? String(parsed.classId)
		};
		boxes.push(applyLayoutUnclip(box, options));
	}
	const merged = applyLayoutMergeMode(boxes, options);
	return options.layoutNms ? applyClassWiseNms(merged, LAYOUT_NMS_IOU_THRESHOLD) : merged;
}
function selectObjectDetectionOutputTensor(outputs) {
	const candidates = Object.entries(outputs).filter(([, tensor]) => isObjectDetectionBoxTensor(tensor));
	if (candidates.length === 0) throw new Error(`Object detection output tensor with shape [N,6] or [1,N,6] not found. Available outputs: ${Object.keys(outputs).join(", ")}`);
	return (candidates.find(([name]) => /^(bbox|boxes|dets?|output0?)$/i.test(name)) ?? candidates[0])[1];
}
function isObjectDetectionBoxTensor(tensor) {
	const { dims } = tensor;
	return dims.length === 2 && dims[1] === 6 || dims.length === 3 && dims[0] === 1 && dims[2] === 6;
}
function extractObjectDetectionOutputData(tensor) {
	if (!(tensor.data instanceof Float32Array)) throw new Error("Object detection output tensor must contain Float32Array data.");
	return tensor.data;
}
function validateObjectDetectionOutputShape(tensor, data) {
	if (!tensor.dims.every((dimension) => Number.isInteger(dimension) && dimension > 0)) throw new Error(`Object detection output shape [${tensor.dims.join(",")}] must contain positive integer dimensions.`);
	if (data.length % 6 !== 0) throw new Error(`Object detection output shape [${tensor.dims.join(",")}] does not match data length ${data.length}.`);
	const expectedLength = tensor.dims.reduce((total, dimension) => total * dimension, 1);
	if (data.length !== expectedLength) throw new Error(`Object detection output shape [${tensor.dims.join(",")}] expects ${expectedLength} values but got ${data.length}.`);
}
function resolveObjectDetectionRowCount(outputs, totalRows, outputTensor) {
	const bboxNumTensor = outputs.bbox_num ?? outputs.boxes_num ?? inferObjectDetectionRowCountTensor(outputs, outputTensor);
	if (!bboxNumTensor) return totalRows;
	const bboxNum = extractObjectDetectionRowCount(bboxNumTensor);
	if (!Number.isInteger(bboxNum) || bboxNum < 0 || bboxNum > totalRows) throw new Error(`Invalid object detection bbox_num: ${bboxNum}. Expected an integer between 0 and ${totalRows}.`);
	return bboxNum;
}
function inferObjectDetectionRowCountTensor(outputs, outputTensor) {
	const candidates = Object.values(outputs).filter((tensor) => tensor !== outputTensor && isSingleValueTensor(tensor) && isIntegerTensorData(tensor.data) && tensorDataLengthMatchesShape(tensor));
	if (candidates.length !== 1) return;
	return candidates[0];
}
function isSingleValueTensor(tensor) {
	return tensor.dims.reduce((total, dimension) => total * dimension, 1) === 1;
}
function tensorDataLengthMatchesShape(tensor) {
	if (!ArrayBuffer.isView(tensor.data) || tensor.data instanceof DataView) return false;
	const expectedLength = tensor.dims.reduce((total, dimension) => total * dimension, 1);
	return tensor.data.length === expectedLength;
}
function isIntegerTensorData(data) {
	return data instanceof Int8Array || data instanceof Uint8Array || data instanceof Int16Array || data instanceof Uint16Array || data instanceof Int32Array || data instanceof Uint32Array || data instanceof BigInt64Array || data instanceof BigUint64Array;
}
function extractObjectDetectionRowCount(tensor) {
	const { data } = tensor;
	if (!isSingleValueTensor(tensor) || !tensorDataLengthMatchesShape(tensor)) throw new Error(`Object detection bbox_num shape [${tensor.dims.join(",")}] must contain exactly one value.`);
	if (!isIntegerTensorData(data)) throw new Error("Object detection bbox_num tensor must contain integer data.");
	if (!ArrayBuffer.isView(data) || data instanceof DataView) return;
	const values = data;
	if (values.length < 1) return;
	const value = values[0];
	return typeof value === "bigint" ? Number(value) : value;
}
function parseObjectDetectionRow(data, offset, layout) {
	const classIdIndex = layout === "class-score-xyxy" ? offset : offset + 1;
	const scoreIndex = layout === "class-score-xyxy" ? offset + 1 : offset;
	const classId = data[classIdIndex];
	const score = data[scoreIndex];
	if (!Number.isInteger(classId)) throw new Error(`Object detection class id at offset ${classIdIndex} must be an integer. Received ${classId}.`);
	if (!Number.isFinite(score)) throw new Error(`Object detection score at offset ${scoreIndex} must be finite. Received ${score}.`);
	return {
		classId,
		score,
		coordinate: [
			data[offset + 2],
			data[offset + 3],
			data[offset + 4],
			data[offset + 5]
		]
	};
}
function inferObjectDetectionOutputLayout(data, offset) {
	const first = data[offset];
	const second = data[offset + 1];
	const firstLooksClass = isClassIdLike(first);
	const secondLooksClass = isClassIdLike(second);
	const firstLooksScore = isScoreLike(first);
	const secondLooksScore = isScoreLike(second);
	if (firstLooksClass && secondLooksScore) return "class-score-xyxy";
	if (firstLooksScore && secondLooksClass) return "score-class-xyxy";
	throw new Error(`Unable to infer object detection output layout from row prefix [${first}, ${second}]. Set outputLayout explicitly.`);
}
function isClassIdLike(value) {
	return Number.isInteger(value) && value >= 0;
}
function isScoreLike(value) {
	return Number.isFinite(value) && value >= 0 && value <= 1;
}
function resolveObjectDetectionThreshold(options, classId) {
	if (typeof options.threshold === "number") return options.threshold;
	if (Array.isArray(options.threshold)) return options.threshold[classId] ?? 0;
	if (options.threshold) return options.threshold[classId] ?? 0;
	return 0;
}
function applyLayoutUnclip(box, options) {
	const ratio = resolveLayoutUnclipRatio(options.layoutUnclipRatio, box.classId);
	if (!ratio) return box;
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
			centerY + height / 2
		]
	};
}
function resolveLayoutUnclipRatio(value, classId) {
	if (value === void 0) return;
	if (typeof value === "number") {
		validatePositiveRatio(value, "layoutUnclipRatio");
		return [value, value];
	}
	if (Array.isArray(value)) {
		if (value.length !== 2) throw new Error("layoutUnclipRatio tuple must contain width and height ratios.");
		validatePositiveRatio(value[0], "layoutUnclipRatio[0]");
		validatePositiveRatio(value[1], "layoutUnclipRatio[1]");
		return [value[0], value[1]];
	}
	const ratio = value[classId];
	if (!ratio) return;
	if (!Array.isArray(ratio) || ratio.length !== 2) throw new Error(`layoutUnclipRatio for class ${classId} must be a [width,height] tuple.`);
	validatePositiveRatio(ratio[0], `layoutUnclipRatio[${classId}][0]`);
	validatePositiveRatio(ratio[1], `layoutUnclipRatio[${classId}][1]`);
	return [ratio[0], ratio[1]];
}
function validatePositiveRatio(value, name) {
	if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${name}: ${value}. Expected a positive finite number.`);
}
function applyLayoutMergeMode(boxes, options) {
	if (!options.layoutMergeBboxesMode) return boxes;
	const kept = [];
	for (const box of boxes) {
		const mode = resolveLayoutMergeMode(options.layoutMergeBboxesMode, box.classId);
		if (mode === "union") {
			kept.push(box);
			continue;
		}
		let shouldKeep = true;
		for (let index = kept.length - 1; index >= 0; index--) {
			const current = kept[index];
			if (current.classId !== box.classId || !boxesOverlap(current.coordinate, box.coordinate)) continue;
			const currentArea = boxArea(current.coordinate);
			const nextArea = boxArea(box.coordinate);
			if (mode === "large") if (nextArea > currentArea) kept.splice(index, 1);
			else shouldKeep = false;
			else if (mode === "small") if (nextArea < currentArea) kept.splice(index, 1);
			else shouldKeep = false;
		}
		if (shouldKeep) kept.push(box);
	}
	return kept;
}
function resolveLayoutMergeMode(value, classId) {
	const mode = typeof value === "string" ? value : value[classId];
	if (mode === void 0) return "union";
	if (mode !== "large" && mode !== "small" && mode !== "union") throw new Error(`Unsupported layoutMergeBboxesMode: ${String(mode)}.`);
	return mode;
}
function applyClassWiseNms(boxes, iouThreshold) {
	const kept = [];
	const groups = /* @__PURE__ */ new Map();
	for (const box of boxes) {
		const classBoxes = groups.get(box.classId) ?? [];
		classBoxes.push(box);
		groups.set(box.classId, classBoxes);
	}
	for (const classBoxes of groups.values()) {
		const remaining = [...classBoxes].sort((a, b) => b.score - a.score);
		while (remaining.length) {
			const current = remaining.shift();
			kept.push(current);
			for (let index = remaining.length - 1; index >= 0; index--) if (boxIou(current.coordinate, remaining[index].coordinate) > iouThreshold) remaining.splice(index, 1);
		}
	}
	return kept.sort((a, b) => b.score - a.score);
}
function boxesOverlap(a, b) {
	return intersectionArea(a, b) > 0;
}
function boxIou(a, b) {
	const intersection = intersectionArea(a, b);
	if (intersection <= 0) return 0;
	const union = boxArea(a) + boxArea(b) - intersection;
	return union > 0 ? intersection / union : 0;
}
function intersectionArea(a, b) {
	const x0 = Math.max(Math.min(a[0], a[2]), Math.min(b[0], b[2]));
	const y0 = Math.max(Math.min(a[1], a[3]), Math.min(b[1], b[3]));
	const x1 = Math.min(Math.max(a[0], a[2]), Math.max(b[0], b[2]));
	const y1 = Math.min(Math.max(a[1], a[3]), Math.max(b[1], b[3]));
	return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}
function boxArea(coordinate) {
	return Math.abs(coordinate[2] - coordinate[0]) * Math.abs(coordinate[3] - coordinate[1]);
}
//#endregion
//#region src/modules/object-detection/preset.ts
const DETR_DEFAULT_OPTIONS = {
	mean: [
		0,
		0,
		0
	],
	stdDeviation: [
		1 / 255,
		1 / 255,
		1 / 255
	],
	channelOrder: "bgr",
	threshold: .5,
	outputLayout: "class-score-xyxy"
};
const DETR_INPUT_NAMES = [
	"image",
	"im_shape",
	"scale_factor"
];
const GFL_INPUT_NAMES = ["image", "scale_factor"];
const PP_DOCLAYOUT_PLUS_L_LABELS = [
	"paragraph_title",
	"image",
	"text",
	"number",
	"abstract",
	"content",
	"figure_title",
	"formula",
	"table",
	"reference",
	"doc_title",
	"footnote",
	"header",
	"algorithm",
	"footer",
	"seal",
	"chart",
	"formula_number",
	"aside_text",
	"reference_content"
];
const PP_DOCLAYOUT_LABELS = [
	"paragraph_title",
	"image",
	"text",
	"number",
	"abstract",
	"content",
	"figure_title",
	"formula",
	"table",
	"table_title",
	"reference",
	"doc_title",
	"footnote",
	"header",
	"algorithm",
	"footer",
	"seal",
	"chart_title",
	"chart",
	"formula_number",
	"header_image",
	"footer_image",
	"aside_text"
];
const TABLE_CELL_LABELS = ["cell"];
const DOC_BLOCK_LAYOUT_LABELS = ["Region"];
const OBJECT_DETECTION_PRESETS = {
	"PP-DocLayout_plus-L": {
		name: "PP-DocLayout_plus-L",
		module: "layout_detection",
		architecture: "DETR",
		requiredInputNames: DETR_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: DETR_INPUT_NAMES,
			imageHeight: 800,
			imageWidth: 800,
			labels: PP_DOCLAYOUT_PLUS_L_LABELS
		}
	},
	"PP-DocLayout-L": {
		name: "PP-DocLayout-L",
		module: "layout_detection",
		architecture: "DETR",
		requiredInputNames: DETR_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: DETR_INPUT_NAMES,
			imageHeight: 640,
			imageWidth: 640,
			labels: PP_DOCLAYOUT_LABELS
		}
	},
	"PP-DocLayout-M": {
		name: "PP-DocLayout-M",
		module: "layout_detection",
		architecture: "GFL",
		requiredInputNames: GFL_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: GFL_INPUT_NAMES,
			imageHeight: 640,
			imageWidth: 640,
			mean: [
				.485 * 255,
				.456 * 255,
				.406 * 255
			],
			stdDeviation: [
				1 / .229 / 255,
				1 / .224 / 255,
				1 / .225 / 255
			],
			labels: PP_DOCLAYOUT_LABELS
		}
	},
	"PP-DocLayout-S": {
		name: "PP-DocLayout-S",
		module: "layout_detection",
		architecture: "GFL",
		requiredInputNames: GFL_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: GFL_INPUT_NAMES,
			imageHeight: 480,
			imageWidth: 480,
			mean: [
				.485 * 255,
				.456 * 255,
				.406 * 255
			],
			stdDeviation: [
				1 / .229 / 255,
				1 / .224 / 255,
				1 / .225 / 255
			],
			labels: PP_DOCLAYOUT_LABELS
		}
	},
	"PP-DocBlockLayout": {
		name: "PP-DocBlockLayout",
		module: "layout_detection",
		architecture: "DETR",
		requiredInputNames: DETR_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: DETR_INPUT_NAMES,
			imageHeight: 640,
			imageWidth: 640,
			labels: DOC_BLOCK_LAYOUT_LABELS
		}
	},
	"RT-DETR-L_wired_table_cell_det": {
		name: "RT-DETR-L_wired_table_cell_det",
		module: "table_cells_detection",
		architecture: "DETR",
		requiredInputNames: DETR_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: DETR_INPUT_NAMES,
			imageHeight: 640,
			imageWidth: 640,
			labels: TABLE_CELL_LABELS
		}
	},
	"RT-DETR-L_wireless_table_cell_det": {
		name: "RT-DETR-L_wireless_table_cell_det",
		module: "table_cells_detection",
		architecture: "DETR",
		requiredInputNames: DETR_INPUT_NAMES,
		options: {
			...DETR_DEFAULT_OPTIONS,
			requiredInputNames: DETR_INPUT_NAMES,
			imageHeight: 640,
			imageWidth: 640,
			labels: TABLE_CELL_LABELS
		}
	}
};
function getObjectDetectionPreset(name) {
	const preset = OBJECT_DETECTION_PRESETS[name];
	if (!preset) throw new Error(`Unsupported object detection preset: ${name}`);
	return preset;
}
function getObjectDetectionPresetOptions(name) {
	if (!name) return {};
	const options = getObjectDetectionPreset(name).options;
	return {
		...options,
		labels: options.labels ? [...options.labels] : void 0,
		requiredInputNames: options.requiredInputNames ? [...options.requiredInputNames] : void 0
	};
}
//#endregion
//#region src/modules/object-detection/preprocess.ts
function preprocessObjectDetection(image, runtimeOptions) {
	validateObjectDetectionPreprocessOptions(runtimeOptions);
	const resizeParams = calculateObjectDetectionResizeParams(image, runtimeOptions);
	return {
		image: {
			data: image.resize({
				width: resizeParams.dstWidth,
				height: resizeParams.dstHeight
			}).tensor({
				mean_values: runtimeOptions.mean,
				norm_values: runtimeOptions.stdDeviation,
				channel_order: runtimeOptions.channelOrder
			}),
			dims: [
				1,
				3,
				resizeParams.dstHeight,
				resizeParams.dstWidth
			]
		},
		imShape: {
			data: new Float32Array([resizeParams.dstHeight, resizeParams.dstWidth]),
			dims: [1, 2]
		},
		scaleFactor: {
			data: new Float32Array([resizeParams.scaleHeight, resizeParams.scaleWidth]),
			dims: [1, 2]
		},
		resizeParams
	};
}
function createObjectDetectionInputFeeds(ortModule, session, input, requiredInputNames) {
	const inputNames = session.inputNames ?? requiredInputNames ?? [
		"image",
		"im_shape",
		"scale_factor"
	];
	const specs = {
		image: input.image,
		im_shape: input.imShape,
		scale_factor: input.scaleFactor
	};
	const feedInputNames = requiredInputNames ?? inputNames.filter(isObjectDetectionInputName);
	const feeds = {};
	if (feedInputNames.length === 0) throw new Error(`Object detection session does not expose supported input tensors. Available input names: ${inputNames.join(", ")}`);
	for (const inputName of feedInputNames) {
		if (!inputNames.includes(inputName)) throw new Error(`Object detection input tensor '${inputName}' not found. Available input names: ${inputNames.join(", ")}`);
		const spec = specs[inputName];
		feeds[inputName] = new ortModule.Tensor("float32", spec.data, spec.dims);
	}
	return feeds;
}
function calculateObjectDetectionResizeParams(image, runtimeOptions) {
	const { imageHeight, imageWidth } = runtimeOptions;
	validateObjectDetectionImageSize(imageHeight, imageWidth);
	const dstWidth = imageWidth;
	const dstHeight = imageHeight;
	return {
		srcWidth: image.width,
		srcHeight: image.height,
		dstWidth,
		dstHeight,
		scaleWidth: dstWidth / image.width,
		scaleHeight: dstHeight / image.height
	};
}
function validateObjectDetectionPreprocessOptions(runtimeOptions) {
	validateObjectDetectionImageSize(runtimeOptions.imageHeight, runtimeOptions.imageWidth);
	if (runtimeOptions.channelOrder !== "rgb" && runtimeOptions.channelOrder !== "bgr") throw new Error(`Unsupported object detection channelOrder: ${runtimeOptions.channelOrder}. Expected "rgb" or "bgr".`);
}
function validateObjectDetectionImageSize(imageHeight, imageWidth) {
	if (!Number.isInteger(imageWidth) || (imageWidth ?? 0) <= 0) throw new Error(`Invalid object detection imageWidth: ${imageWidth}. Expected a positive integer.`);
	if (!Number.isInteger(imageHeight) || (imageHeight ?? 0) <= 0) throw new Error(`Invalid object detection imageHeight: ${imageHeight}. Expected a positive integer.`);
}
function isObjectDetectionInputName(inputName) {
	return inputName === "image" || inputName === "im_shape" || inputName === "scale_factor";
}
//#endregion
//#region src/modules/object-detection/service.ts
/**
* Lightweight raw runner for PaddleOCR/PaddleX DETR object-detection modules.
*/
var ObjectDetectionService = class {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = { ...options };
	}
	async runRaw(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		return this.runRawWithRuntimeOptions(input, runtimeOptions);
	}
	async run(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		return postprocessObjectDetection((await this.runRawWithRuntimeOptions(input, runtimeOptions)).outputs, runtimeOptions);
	}
	async runRawWithRuntimeOptions(input, runtimeOptions) {
		const preprocessed = preprocessObjectDetection(normalizeInputToRgb(input), runtimeOptions);
		const outputs = await this.session.run(createObjectDetectionInputFeeds(this.ortModule, this.session, preprocessed, runtimeOptions.requiredInputNames));
		if (Object.keys(outputs).length === 0) throw new Error("Object detection session returned no output tensors.");
		return {
			outputs,
			resizeParams: preprocessed.resizeParams
		};
	}
	resolveRuntimeOptions(options) {
		const runtimeOptions = {
			...this.options,
			...options
		};
		return {
			imageHeight: this.requirePositiveInteger(runtimeOptions.imageHeight, "imageHeight"),
			imageWidth: this.requirePositiveInteger(runtimeOptions.imageWidth, "imageWidth"),
			mean: this.requireTriple(runtimeOptions.mean, "mean"),
			stdDeviation: this.requireTriple(runtimeOptions.stdDeviation, "stdDeviation"),
			channelOrder: this.requireChannelOrder(runtimeOptions.channelOrder),
			labels: runtimeOptions.labels,
			threshold: runtimeOptions.threshold,
			outputLayout: runtimeOptions.outputLayout,
			layoutNms: runtimeOptions.layoutNms,
			layoutUnclipRatio: runtimeOptions.layoutUnclipRatio,
			layoutMergeBboxesMode: runtimeOptions.layoutMergeBboxesMode,
			requiredInputNames: this.resolveRequiredInputNames(runtimeOptions.requiredInputNames)
		};
	}
	requirePositiveInteger(value, name) {
		if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid object detection ${name}: ${value}. Expected a positive integer.`);
		return value;
	}
	requireTriple(value, name) {
		if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) throw new Error(`Invalid object detection ${name}: ${String(value)}. Expected three finite numbers.`);
		return [
			value[0],
			value[1],
			value[2]
		];
	}
	requireChannelOrder(value) {
		if (value !== "rgb" && value !== "bgr") throw new Error(`Unsupported object detection channelOrder: ${value}. Expected "rgb" or "bgr".`);
		return value;
	}
	resolveRequiredInputNames(value) {
		if (value === void 0) return;
		if (!Array.isArray(value) || value.length === 0) throw new Error(`Invalid object detection requiredInputNames: ${String(value)}. Expected a non-empty array.`);
		for (const inputName of value) if (inputName !== "image" && inputName !== "im_shape" && inputName !== "scale_factor") throw new Error(`Unsupported object detection input name: ${String(inputName)}.`);
		return [...value];
	}
};
//#endregion
//#region src/modules/table-structure/postprocess.ts
function postprocessTableStructure(outputs, shape, options) {
	const characters = createTableStructureCharacters(options);
	const structureTensor = selectTableStructureOutputTensor(outputs, "structure_probs", characters.length);
	const locTensor = selectTableStructureOutputTensor(outputs, "loc_preds", options.locRegNum);
	const structureData = extractTableStructureOutputData(structureTensor, "structure_probs");
	const locData = extractTableStructureOutputData(locTensor, "loc_preds");
	const [batchSize, sequenceLength, classCount] = validateTableStructureTensorShape(structureTensor, structureData, "structure_probs");
	const [, locSequenceLength, locRegNum] = validateTableStructureTensorShape(locTensor, locData, "loc_preds");
	validateTableStructureShape(shape);
	if (batchSize !== 1) throw new Error(`Unsupported table structure batch size ${batchSize}. Expected batch size 1.`);
	if (locSequenceLength !== sequenceLength) throw new Error(`Table structure loc_preds sequence length ${locSequenceLength} does not match structure_probs length ${sequenceLength}.`);
	if (classCount !== characters.length) throw new Error(`Table structure class count ${classCount} does not match dictionary size ${characters.length}.`);
	if (options.locRegNum !== void 0 && locRegNum !== options.locRegNum) throw new Error(`Table structure loc_preds width ${locRegNum} does not match locRegNum ${options.locRegNum}.`);
	if (locRegNum % 2 !== 0) throw new Error(`Invalid table structure locRegNum: ${locRegNum}. Expected an even number.`);
	return decodeTableStructure(structureData, locData, characters, {
		sequenceLength,
		classCount,
		locRegNum,
		shape: shape.data,
		ignoreBboxes: options.ignoreBboxes
	});
}
function createTableStructureCharacters(options) {
	const dictionary = options.structureDictionary;
	if (!dictionary?.length) throw new Error("Table structure structureDictionary is required for TableLabelDecode.");
	const characters = [...dictionary];
	if (options.mergeNoSpanStructure) {
		if (!characters.includes("<td></td>")) characters.push("<td></td>");
		const emptyTdIndex = characters.indexOf("<td>");
		if (emptyTdIndex !== -1) characters.splice(emptyTdIndex, 1);
	}
	return [
		"sos",
		...characters,
		"eos"
	];
}
function selectTableStructureOutputTensor(outputs, preferredName, lastDimension) {
	const namedTensor = outputs[preferredName];
	if (namedTensor && isTableStructureOutputTensor(namedTensor, lastDimension)) return namedTensor;
	const candidates = Object.values(outputs).filter((tensor) => isTableStructureOutputTensor(tensor, lastDimension));
	if (candidates.length === 1) return candidates[0];
	throw new Error(`Table structure output tensor '${preferredName}' not found. Available keys: ${Object.keys(outputs).join(", ")}`);
}
function isTableStructureOutputTensor(tensor, lastDimension) {
	return tensor.data instanceof Float32Array && tensor.dims.length === 3 && tensor.dims[0] === 1 && tensor.dims[1] > 0 && tensor.dims[2] > 0 && (lastDimension === void 0 || tensor.dims[2] === lastDimension);
}
function extractTableStructureOutputData(tensor, name) {
	if (!(tensor.data instanceof Float32Array)) throw new Error(`Table structure ${name} tensor must contain Float32Array data.`);
	return tensor.data;
}
function validateTableStructureTensorShape(tensor, data, name) {
	const [batchSize, sequenceLength, width] = tensor.dims;
	if (tensor.dims.length !== 3 || batchSize <= 0 || sequenceLength <= 0 || width <= 0) throw new Error(`Unsupported table structure ${name} shape [${tensor.dims.join(",")}]. Expected [1,T,C].`);
	if (data.length !== batchSize * sequenceLength * width) throw new Error(`Table structure ${name} shape [${tensor.dims.join(",")}] does not match data length ${data.length}.`);
	return [
		batchSize,
		sequenceLength,
		width
	];
}
function validateTableStructureShape(shape) {
	if (!(shape.data instanceof Float32Array) || shape.dims.length !== 2 || shape.dims[1] !== 6) throw new Error(`Unsupported table structure shape tensor [${shape.dims.join(",")}]. Expected [1,6].`);
	if (shape.data.length !== 6) throw new Error(`Table structure shape tensor [${shape.dims.join(",")}] does not match data length ${shape.data.length}.`);
}
function decodeTableStructure(structureData, locData, characters, options) {
	const eosIndex = characters.length - 1;
	const structure = [];
	const bbox = [];
	const scores = [];
	const tdTokens = new Set([
		"<td>",
		"<td",
		"<td></td>"
	]);
	for (let index = 0; index < options.sequenceLength; index++) {
		const { classIndex, score } = findMaxClass(structureData, index * options.classCount, options.classCount);
		if (index > 0 && classIndex === eosIndex) break;
		if (classIndex === 0 || classIndex === eosIndex) continue;
		const text = characters[classIndex];
		if (tdTokens.has(text) && !options.ignoreBboxes) bbox.push(decodeTableStructureBbox(locData, index * options.locRegNum, options.locRegNum, options.shape));
		structure.push(text);
		scores.push(score);
	}
	return {
		bbox,
		structure,
		html: structure.join(""),
		fullHtml: createTableStructureHtmlDocument(structure),
		structureScore: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : 0
	};
}
function matchTableStructureToOcr(table, ocrResults, options = {}) {
	const cellBoxes = table.bbox.map((box, index) => normalizeTableCellBox(box, index));
	const matchedOcrIndices = matchOcrToTableCells(cellBoxes, options.filterOcrAboveTable ? filterOcrResultsAboveTable(ocrResults, cellBoxes) : ocrResults.map((result, index) => ({
		result,
		index
	})));
	const cellTextEntries = cellBoxes.map((_, cellIndex) => createMatchedTableCellText(matchedOcrIndices[cellIndex] ?? [], ocrResults));
	const html = fillTableStructureHtml(table.structure, cellTextEntries);
	return {
		html,
		fullHtml: createTableStructureHtmlDocument(html),
		matches: cellBoxes.map((box, cellIndex) => ({
			cellIndex,
			ocrIndices: matchedOcrIndices[cellIndex] ?? [],
			text: cellTextEntries[cellIndex]?.text ?? "",
			box
		})),
		cellTexts: cellTextEntries.map((entry) => entry.text)
	};
}
function createTableStructureHtmlDocument(structure) {
	return `<html><body><table>${Array.isArray(structure) ? structure.join("") : structure}</table></body></html>`;
}
function findMaxClass(data, offset, classCount) {
	let classIndex = 0;
	let score = data[offset];
	for (let index = 1; index < classCount; index++) {
		const currentScore = data[offset + index];
		if (currentScore > score) {
			classIndex = index;
			score = currentScore;
		}
	}
	return {
		classIndex,
		score
	};
}
function decodeTableStructureBbox(locData, offset, locRegNum, shape) {
	const [, , ratioHeight, ratioWidth, paddedHeight, paddedWidth] = shape;
	const bbox = [];
	for (let index = 0; index < locRegNum; index++) {
		const value = locData[offset + index];
		bbox.push(index % 2 === 0 ? value * paddedWidth / ratioWidth : value * paddedHeight / ratioHeight);
	}
	return bbox;
}
function matchOcrToTableCells(cellBoxes, indexedOcrResults) {
	const matchedOcrIndices = cellBoxes.map(() => []);
	if (!cellBoxes.length) return matchedOcrIndices;
	for (const { result, index } of indexedOcrResults) {
		const ocrBox = normalizeOcrBox$1(result.box, index);
		let bestCellIndex = 0;
		let bestIouDistance = Number.POSITIVE_INFINITY;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (let cellIndex = 0; cellIndex < cellBoxes.length; cellIndex++) {
			const cellBox = cellBoxes[cellIndex];
			const iouDistance = 1 - calculateBoxIou(ocrBox, cellBox);
			const distance = calculateOfficialTableMatchDistance(ocrBox, cellBox);
			if (iouDistance < bestIouDistance || iouDistance === bestIouDistance && distance < bestDistance) {
				bestCellIndex = cellIndex;
				bestIouDistance = iouDistance;
				bestDistance = distance;
			}
		}
		matchedOcrIndices[bestCellIndex].push(index);
	}
	return matchedOcrIndices;
}
function filterOcrResultsAboveTable(ocrResults, cellBoxes) {
	if (!cellBoxes.length) return [];
	const tableTop = Math.min(...cellBoxes.map((box) => box[1]));
	return ocrResults.map((result, index) => ({
		result,
		index
	})).filter(({ result, index }) => normalizeOcrBox$1(result.box, index)[3] >= tableTop);
}
function fillTableStructureHtml(structure, cellTexts) {
	const parts = [];
	let cellIndex = 0;
	for (const tag of structure) if (tag.includes("</td>")) {
		const text = cellTexts[cellIndex]?.html ?? "";
		if (tag === "<td></td>") parts.push("<td>", text, "</td>");
		else parts.push(text, tag);
		cellIndex++;
	} else parts.push(tag);
	return parts.join("");
}
function createMatchedTableCellText(ocrIndices, ocrResults) {
	const isMultiline = ocrIndices.length > 1;
	const wrapBold = isMultiline && (ocrResults[ocrIndices[0]]?.text ?? "").includes("<b>");
	const fragments = [];
	for (let textIndex = 0; textIndex < ocrIndices.length; textIndex++) {
		let text = ocrResults[ocrIndices[textIndex]]?.text ?? "";
		if (isMultiline) {
			text = cleanMultilineTableCellText(text);
			if (!text) continue;
			if (textIndex !== ocrIndices.length - 1 && !text.endsWith(" ")) text = `${text} `;
		}
		fragments.push(text);
	}
	const escapedText = fragments.map((text) => escapeHtml$1(text)).join("");
	return {
		text: fragments.join(""),
		html: wrapBold ? `<b>${escapedText}</b>` : escapedText
	};
}
function cleanMultilineTableCellText(text) {
	let result = text;
	if (result.startsWith(" ")) result = result.slice(1);
	if (result.includes("<b>")) result = result.slice(3);
	if (result.includes("</b>")) result = result.slice(0, -4);
	return result;
}
function normalizeTableCellBox(box, index) {
	return normalizeCoordinateBox(box, `table cell ${index}`);
}
function normalizeOcrBox$1(box, index) {
	if (Array.isArray(box)) return normalizeCoordinateBox(box, `OCR box ${index}`);
	const { x, y, width, height } = box;
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) throw new Error(`Invalid OCR box ${index}. Expected finite x/y/width/height.`);
	return [
		x,
		y,
		x + width,
		y + height
	];
}
function normalizeCoordinateBox(box, name) {
	if (box.length !== 4 && box.length !== 8) throw new Error(`Invalid ${name} coordinate length ${box.length}. Expected 4 or 8.`);
	if (box.some((value) => !Number.isFinite(value))) throw new Error(`Invalid ${name} coordinates. Expected finite numbers.`);
	if (box.length === 4) {
		const [x1, y1, x2, y2] = box;
		return [
			Math.min(x1, x2),
			Math.min(y1, y2),
			Math.max(x1, x2),
			Math.max(y1, y2)
		];
	}
	const xs = [
		box[0],
		box[2],
		box[4],
		box[6]
	];
	const ys = [
		box[1],
		box[3],
		box[5],
		box[7]
	];
	return [
		Math.min(...xs),
		Math.min(...ys),
		Math.max(...xs),
		Math.max(...ys)
	];
}
function calculateOfficialTableMatchDistance(boxA, boxB) {
	const [x1, y1, x2, y2] = boxA;
	const [x3, y3, x4, y4] = boxB;
	const fullDistance = Math.abs(x3 - x1) + Math.abs(y3 - y1) + Math.abs(x4 - x2) + Math.abs(y4 - y2);
	const topLeftDistance = Math.abs(x3 - x1) + Math.abs(y3 - y1);
	const bottomRightDistance = Math.abs(x4 - x2) + Math.abs(y4 - y2);
	return fullDistance + Math.min(topLeftDistance, bottomRightDistance);
}
function calculateBoxIou(boxA, boxB) {
	const areaA = Math.max(0, boxA[2] - boxA[0]) * Math.max(0, boxA[3] - boxA[1]);
	const areaB = Math.max(0, boxB[2] - boxB[0]) * Math.max(0, boxB[3] - boxB[1]);
	const intersectionLeft = Math.max(boxA[0], boxB[0]);
	const intersectionTop = Math.max(boxA[1], boxB[1]);
	const intersectionRight = Math.min(boxA[2], boxB[2]);
	const intersectionBottom = Math.min(boxA[3], boxB[3]);
	const intersection = Math.max(0, intersectionRight - intersectionLeft) * Math.max(0, intersectionBottom - intersectionTop);
	const union = areaA + areaB - intersection;
	return union > 0 ? intersection / union : 0;
}
function escapeHtml$1(text) {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
//#endregion
//#region src/modules/table-structure/preprocess.ts
function preprocessTableStructure(image, runtimeOptions) {
	validateTableStructurePreprocessOptions(runtimeOptions);
	const resizeParams = calculateTableStructureResizeParams(image, runtimeOptions);
	return {
		image: {
			data: padNormalizedChwTensor(image.resize({
				width: resizeParams.resizedWidth,
				height: resizeParams.resizedHeight
			}).tensor({
				mean_values: runtimeOptions.mean,
				norm_values: runtimeOptions.stdDeviation,
				channel_order: runtimeOptions.channelOrder
			}), resizeParams),
			dims: [
				1,
				3,
				resizeParams.paddedHeight,
				resizeParams.paddedWidth
			]
		},
		shape: {
			data: new Float32Array([
				resizeParams.srcHeight,
				resizeParams.srcWidth,
				resizeParams.ratioHeight,
				resizeParams.ratioWidth,
				resizeParams.paddedHeight,
				resizeParams.paddedWidth
			]),
			dims: [1, 6]
		},
		resizeParams
	};
}
function createTableStructureInputFeeds(ortModule, session, input) {
	return { [session.inputNames?.[0] ?? "x"]: new ortModule.Tensor("float32", input.image.data, input.image.dims) };
}
function calculateTableStructureResizeParams(image, runtimeOptions) {
	const { imageHeight, imageWidth, maxSideLength } = runtimeOptions;
	validateTableStructureImageSize(imageHeight, imageWidth, maxSideLength);
	const ratio = maxSideLength / Math.max(image.width, image.height);
	const resizedWidth = Math.floor(image.width * ratio);
	const resizedHeight = Math.floor(image.height * ratio);
	if (resizedWidth <= 0 || resizedHeight <= 0) throw new Error(`Invalid table structure resize result: ${resizedWidth}x${resizedHeight}. Source image is too narrow for maxSideLength ${maxSideLength}.`);
	if (resizedWidth > imageWidth || resizedHeight > imageHeight) throw new Error(`Invalid table structure resize result: ${resizedWidth}x${resizedHeight} exceeds padded size ${imageWidth}x${imageHeight}.`);
	return {
		srcWidth: image.width,
		srcHeight: image.height,
		resizedWidth,
		resizedHeight,
		paddedWidth: imageWidth,
		paddedHeight: imageHeight,
		ratioWidth: ratio,
		ratioHeight: ratio
	};
}
function padNormalizedChwTensor(resizedTensor, resizeParams) {
	const { resizedWidth, resizedHeight, paddedWidth, paddedHeight } = resizeParams;
	const channelCount = 3;
	const paddedTensor = new Float32Array(channelCount * paddedWidth * paddedHeight);
	for (let channel = 0; channel < channelCount; channel++) {
		const resizedChannelOffset = channel * resizedWidth * resizedHeight;
		const paddedChannelOffset = channel * paddedWidth * paddedHeight;
		for (let y = 0; y < resizedHeight; y++) {
			const sourceOffset = resizedChannelOffset + y * resizedWidth;
			const targetOffset = paddedChannelOffset + y * paddedWidth;
			paddedTensor.set(resizedTensor.subarray(sourceOffset, sourceOffset + resizedWidth), targetOffset);
		}
	}
	return paddedTensor;
}
function validateTableStructurePreprocessOptions(runtimeOptions) {
	validateTableStructureImageSize(runtimeOptions.imageHeight, runtimeOptions.imageWidth, runtimeOptions.maxSideLength);
	if (runtimeOptions.channelOrder !== "rgb" && runtimeOptions.channelOrder !== "bgr") throw new Error(`Unsupported table structure channelOrder: ${runtimeOptions.channelOrder}. Expected "rgb" or "bgr".`);
}
function validateTableStructureImageSize(imageHeight, imageWidth, maxSideLength) {
	if (!Number.isInteger(imageWidth) || (imageWidth ?? 0) <= 0) throw new Error(`Invalid table structure imageWidth: ${imageWidth}. Expected a positive integer.`);
	if (!Number.isInteger(imageHeight) || (imageHeight ?? 0) <= 0) throw new Error(`Invalid table structure imageHeight: ${imageHeight}. Expected a positive integer.`);
	if (!Number.isInteger(maxSideLength) || (maxSideLength ?? 0) <= 0) throw new Error(`Invalid table structure maxSideLength: ${maxSideLength}. Expected a positive integer.`);
}
//#endregion
//#region src/modules/table-structure/preset.ts
const SLANET_OPTIONS = {
	imageHeight: 488,
	imageWidth: 488,
	maxSideLength: 488,
	mean: [
		.485 * 255,
		.456 * 255,
		.406 * 255
	],
	stdDeviation: [
		1 / .229 / 255,
		1 / .224 / 255,
		1 / .225 / 255
	],
	channelOrder: "bgr",
	maxTextLength: 500,
	locRegNum: 8,
	mergeNoSpanStructure: true,
	replaceEmptyCellToken: false,
	learnEmptyBox: false,
	structureDictionary: [
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
		" colspan=\"2\"",
		" colspan=\"3\"",
		" colspan=\"4\"",
		" colspan=\"5\"",
		" colspan=\"6\"",
		" colspan=\"7\"",
		" colspan=\"8\"",
		" colspan=\"9\"",
		" colspan=\"10\"",
		" colspan=\"11\"",
		" colspan=\"12\"",
		" colspan=\"13\"",
		" colspan=\"14\"",
		" colspan=\"15\"",
		" colspan=\"16\"",
		" colspan=\"17\"",
		" colspan=\"18\"",
		" colspan=\"19\"",
		" colspan=\"20\"",
		" rowspan=\"2\"",
		" rowspan=\"3\"",
		" rowspan=\"4\"",
		" rowspan=\"5\"",
		" rowspan=\"6\"",
		" rowspan=\"7\"",
		" rowspan=\"8\"",
		" rowspan=\"9\"",
		" rowspan=\"10\"",
		" rowspan=\"11\"",
		" rowspan=\"12\"",
		" rowspan=\"13\"",
		" rowspan=\"14\"",
		" rowspan=\"15\"",
		" rowspan=\"16\"",
		" rowspan=\"17\"",
		" rowspan=\"18\"",
		" rowspan=\"19\"",
		" rowspan=\"20\""
	]
};
const SLANEXT_OPTIONS = {
	...SLANET_OPTIONS,
	imageHeight: 512,
	imageWidth: 512,
	maxSideLength: 512,
	ignoreBboxes: true
};
const TABLE_STRUCTURE_RECOGNITION_PRESETS = {
	SLANet: {
		name: "SLANet",
		module: "table_structure_recognition",
		architecture: "SLANet",
		options: SLANET_OPTIONS
	},
	SLANeXt_wired: {
		name: "SLANeXt_wired",
		module: "table_structure_recognition",
		architecture: "SLANeXt",
		options: SLANEXT_OPTIONS
	},
	SLANeXt_wireless: {
		name: "SLANeXt_wireless",
		module: "table_structure_recognition",
		architecture: "SLANeXt",
		options: SLANEXT_OPTIONS
	}
};
function getTableStructureRecognitionPreset(name) {
	const preset = TABLE_STRUCTURE_RECOGNITION_PRESETS[name];
	if (!preset) throw new Error(`Unsupported table structure recognition preset: ${name}`);
	return preset;
}
function getTableStructureRecognitionPresetOptions(name) {
	if (!name) return {};
	const options = getTableStructureRecognitionPreset(name).options;
	return {
		...options,
		structureDictionary: options.structureDictionary ? [...options.structureDictionary] : void 0
	};
}
//#endregion
//#region src/modules/table-structure/service.ts
/**
* Lightweight raw runner for PaddleOCR/PaddleX table-structure recognition modules.
*/
var TableStructureRecognitionService = class {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = { ...options };
	}
	async runRaw(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		return this.runRawWithRuntimeOptions(input, runtimeOptions);
	}
	async run(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		const raw = await this.runRawWithRuntimeOptions(input, runtimeOptions);
		return postprocessTableStructure(raw.outputs, raw.shape, runtimeOptions);
	}
	async runRawWithRuntimeOptions(input, runtimeOptions) {
		const preprocessed = preprocessTableStructure(normalizeInputToRgb(input), runtimeOptions);
		const outputs = await this.session.run(createTableStructureInputFeeds(this.ortModule, this.session, preprocessed));
		if (Object.keys(outputs).length === 0) throw new Error("Table structure recognition session returned no output tensors.");
		return {
			outputs,
			resizeParams: preprocessed.resizeParams,
			shape: preprocessed.shape
		};
	}
	resolveRuntimeOptions(options) {
		const runtimeOptions = {
			...this.options,
			...options
		};
		return {
			imageHeight: this.requirePositiveInteger(runtimeOptions.imageHeight, "imageHeight"),
			imageWidth: this.requirePositiveInteger(runtimeOptions.imageWidth, "imageWidth"),
			maxSideLength: this.requirePositiveInteger(runtimeOptions.maxSideLength, "maxSideLength"),
			mean: this.requireTriple(runtimeOptions.mean, "mean"),
			stdDeviation: this.requireTriple(runtimeOptions.stdDeviation, "stdDeviation"),
			channelOrder: this.requireChannelOrder(runtimeOptions.channelOrder),
			maxTextLength: runtimeOptions.maxTextLength,
			locRegNum: runtimeOptions.locRegNum,
			mergeNoSpanStructure: runtimeOptions.mergeNoSpanStructure,
			replaceEmptyCellToken: runtimeOptions.replaceEmptyCellToken,
			learnEmptyBox: runtimeOptions.learnEmptyBox,
			structureDictionary: runtimeOptions.structureDictionary,
			ignoreBboxes: runtimeOptions.ignoreBboxes
		};
	}
	requirePositiveInteger(value, name) {
		if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid table structure recognition ${name}: ${value}. Expected a positive integer.`);
		return value;
	}
	requireTriple(value, name) {
		if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) throw new Error(`Invalid table structure recognition ${name}: ${String(value)}. Expected three finite numbers.`);
		return [
			value[0],
			value[1],
			value[2]
		];
	}
	requireChannelOrder(value) {
		if (value !== "rgb" && value !== "bgr") throw new Error(`Unsupported table structure recognition channelOrder: ${value}. Expected "rgb" or "bgr".`);
		return value;
	}
};
//#endregion
//#region src/modules/text-detection/preset.ts
const PPOCRV6_DETECTION$1 = {
	channelOrder: "bgr",
	maxSideLength: 736,
	limitType: "min",
	maxSideLimit: 4e3,
	textPixelThreshold: .2,
	boxScoreThreshold: .45,
	maxCandidates: 3e3,
	unclipRatio: 1.4
};
const PPOCRV4_SEAL_DETECTION = {
	channelOrder: "bgr",
	maxSideLength: 736,
	limitType: "resize_long",
	maxSideLimit: 4e3,
	textPixelThreshold: .2,
	boxScoreThreshold: .6,
	maxCandidates: 1e3,
	unclipRatio: .5,
	boxType: "poly"
};
const TEXT_DETECTION_PRESETS = {
	"PP-OCRv6_tiny_det": {
		name: "PP-OCRv6_tiny_det",
		module: "text_detection",
		options: {
			...PPOCRV6_DETECTION$1,
			boxScoreThreshold: .4
		}
	},
	"PP-OCRv6_small_det": {
		name: "PP-OCRv6_small_det",
		module: "text_detection",
		options: PPOCRV6_DETECTION$1
	},
	"PP-OCRv6_medium_det": {
		name: "PP-OCRv6_medium_det",
		module: "text_detection",
		options: PPOCRV6_DETECTION$1
	},
	"PP-OCRv4_mobile_seal_det": {
		name: "PP-OCRv4_mobile_seal_det",
		module: "seal_text_detection",
		options: PPOCRV4_SEAL_DETECTION
	},
	"PP-OCRv4_server_seal_det": {
		name: "PP-OCRv4_server_seal_det",
		module: "seal_text_detection",
		options: PPOCRV4_SEAL_DETECTION
	}
};
function getTextDetectionPreset(name) {
	const preset = TEXT_DETECTION_PRESETS[name];
	if (!preset) throw new Error(`Unsupported text detection preset: ${name}`);
	return preset;
}
function getTextDetectionPresetOptions(name) {
	if (!name) return {};
	return { ...getTextDetectionPreset(name).options };
}
//#endregion
//#region src/core/geometry/clipper-offset.ts
const FLOATING_POINT_TOLERANCE = 1e-12;
const CLIPPER_ARC_TOLERANCE_RATIO = .002;
function offsetClosedPolygonRound(points, distance) {
	const path = removeDuplicateClosingPoint$1(points);
	if (path.length < 3 || !Number.isFinite(distance)) return path;
	if (Math.abs(distance) < .5) return path;
	const area = polygonArea$2(path);
	if (Math.abs(area) <= FLOATING_POINT_TOLERANCE) return [];
	const groupDelta = area < 0 ? -distance : distance;
	const absDelta = Math.abs(groupDelta);
	if (absDelta <= FLOATING_POINT_TOLERANCE) return path;
	const normals = buildNormals(path);
	const arcTolerance = absDelta * CLIPPER_ARC_TOLERANCE_RATIO;
	const stepsPer360 = Math.min(Math.PI / Math.acos(1 - arcTolerance / absDelta), absDelta * Math.PI);
	const stepSin = Math.sin(2 * Math.PI / stepsPer360) * (groupDelta < 0 ? -1 : 1);
	const stepCos = Math.cos(2 * Math.PI / stepsPer360);
	const stepsPerRad = stepsPer360 / (2 * Math.PI);
	const out = [];
	for (let j = 0, k = path.length - 1; j < path.length; k = j, j++) offsetRoundPoint(path, normals, j, k, groupDelta, stepSin, stepCos, stepsPerRad, out);
	return trimCollinearPoints(dedupeAdjacentPoints$1(out));
}
function offsetRoundPoint(path, normals, j, k, delta, stepSin, stepCos, stepsPerRad, out) {
	if (samePoint(path[j], path[k])) return;
	let sinA = cross$1(normals[j], normals[k]);
	const cosA = dot(normals[j], normals[k]);
	sinA = Math.max(-1, Math.min(1, sinA));
	if (Math.abs(delta) <= FLOATING_POINT_TOLERANCE) {
		pushRoundedPoint(out, path[j]);
		return;
	}
	if (cosA > -.999 && sinA * delta < 0) {
		pushRoundedPoint(out, createConcaveJoinPoint(path, normals, j, k, delta));
		return;
	}
	doRound(path, normals, j, k, Math.atan2(sinA, cosA), delta, stepSin, stepCos, stepsPerRad, out);
}
function createConcaveJoinPoint(path, normals, j, k, delta) {
	const next = (j + 1) % path.length;
	return lineIntersection(getPerpendicular(path[k], normals[k], delta), getPerpendicular(path[j], normals[k], delta), getPerpendicular(path[j], normals[j], delta), getPerpendicular(path[next], normals[j], delta)) ?? getPerpendicular(path[j], normals[j], delta);
}
function doRound(path, normals, j, k, angle, delta, stepSin, stepCos, stepsPerRad, out) {
	const point = path[j];
	let offset = {
		x: normals[k].x * delta,
		y: normals[k].y * delta
	};
	pushRoundedPoint(out, {
		x: point.x + offset.x,
		y: point.y + offset.y
	});
	const steps = Math.ceil(stepsPerRad * Math.abs(angle));
	for (let i = 1; i < steps; i++) {
		offset = {
			x: offset.x * stepCos - stepSin * offset.y,
			y: offset.x * stepSin + offset.y * stepCos
		};
		pushRoundedPoint(out, {
			x: point.x + offset.x,
			y: point.y + offset.y
		});
	}
	pushRoundedPoint(out, getPerpendicular(point, normals[j], delta));
}
function buildNormals(path) {
	return path.map((point, index) => getUnitNormal(point, path[(index + 1) % path.length]));
}
function getUnitNormal(pointA, pointB) {
	const dx = pointB.x - pointA.x;
	const dy = pointB.y - pointA.y;
	const length = Math.hypot(dx, dy);
	if (length <= FLOATING_POINT_TOLERANCE) return {
		x: 0,
		y: 0
	};
	return {
		x: dy / length,
		y: -dx / length
	};
}
function getPerpendicular(point, normal, delta) {
	return {
		x: point.x + normal.x * delta,
		y: point.y + normal.y * delta
	};
}
function pushRoundedPoint(points, point) {
	points.push({
		x: Math.round(point.x),
		y: Math.round(point.y)
	});
}
function removeDuplicateClosingPoint$1(points) {
	const path = points.slice();
	const first = path[0];
	const last = path[path.length - 1];
	if (first && last && samePoint(first, last)) path.pop();
	return path;
}
function dedupeAdjacentPoints$1(points) {
	const deduped = [];
	for (const point of points) {
		const previous = deduped[deduped.length - 1];
		if (previous && samePoint(previous, point)) continue;
		deduped.push(point);
	}
	const first = deduped[0];
	const last = deduped[deduped.length - 1];
	if (first && last && samePoint(first, last)) deduped.pop();
	return deduped;
}
function trimCollinearPoints(points) {
	if (points.length < 3) return points;
	const trimmed = [];
	for (let index = 0; index < points.length; index++) {
		const previous = points[(index + points.length - 1) % points.length];
		const current = points[index];
		const next = points[(index + 1) % points.length];
		if (isPointOnSegment$1(current, previous, next)) continue;
		trimmed.push(current);
	}
	return trimmed;
}
function isPointOnSegment$1(point, start, end) {
	const area = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
	if (Math.abs(area) > 1e-9) return false;
	return point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x) && point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y);
}
function lineIntersection(a1, a2, b1, b2) {
	const dax = a2.x - a1.x;
	const day = a2.y - a1.y;
	const dbx = b2.x - b1.x;
	const dby = b2.y - b1.y;
	const denominator = dax * dby - day * dbx;
	if (Math.abs(denominator) < FLOATING_POINT_TOLERANCE) return null;
	const t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / denominator;
	return {
		x: a1.x + t * dax,
		y: a1.y + t * day
	};
}
function samePoint(pointA, pointB) {
	return pointA.x === pointB.x && pointA.y === pointB.y;
}
function dot(pointA, pointB) {
	return pointA.x * pointB.x + pointA.y * pointB.y;
}
function cross$1(pointA, pointB) {
	return pointA.y * pointB.x - pointB.y * pointA.x;
}
function polygonArea$2(points) {
	let area = 0;
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		area += current.x * next.y - next.x * current.y;
	}
	return area / 2;
}
//#endregion
//#region src/core/geometry/contours.ts
function findContours(bitmap, width, height, options) {
	const visited = new Uint8Array(width * height);
	const contours = [];
	const at = (x, y) => y * width + x;
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const startIndex = at(x, y);
		if (!bitmap[startIndex] || visited[startIndex]) continue;
		const queue = [{
			x,
			y
		}];
		const points = [];
		const boundary = [];
		let queueHead = 0;
		visited[startIndex] = 1;
		while (queueHead < queue.length) {
			const point = queue[queueHead];
			queueHead++;
			points.push(point);
			if (isBoundaryPoint(bitmap, width, height, point.x, point.y)) boundary.push(point);
			for (const [dx, dy] of [
				[-1, 0],
				[1, 0],
				[0, -1],
				[0, 1],
				[-1, -1],
				[1, -1],
				[-1, 1],
				[1, 1]
			]) {
				const nextX = point.x + dx;
				const nextY = point.y + dy;
				if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
				const nextIndex = at(nextX, nextY);
				if (!bitmap[nextIndex] || visited[nextIndex]) continue;
				visited[nextIndex] = 1;
				queue.push({
					x: nextX,
					y: nextY
				});
			}
		}
		if (points.length >= options.minimumAreaThreshold && boundary.length >= 3) {
			const orderedBoundaries = traceComponentBoundaries(points, bitmap, width, height);
			for (const orderedBoundary of orderedBoundaries) contours.push({
				area: Math.abs(polygonArea$1(orderedBoundary)),
				points: orderedBoundary,
				pixels: points
			});
		}
	}
	return contours;
}
function approxPolyDP(points, epsilon, closed) {
	if (epsilon < 0 || !Number.isFinite(epsilon)) throw new Error("Epsilon must be a finite non-negative number");
	if (points.length <= 2) return [...points];
	const curve = closed ? removeDuplicateClosingPoint(points) : [...points];
	if (curve.length <= 2) return curve;
	if (closed) return approxClosedPolyDP(curve, epsilon);
	return approxOpenPolyDP(curve, epsilon);
}
function approxClosedPolyDP(curve, epsilon) {
	const splitIndex = findFarthestPointIndex(curve, curve[0]);
	if (splitIndex <= 0) return [...curve];
	const firstArc = approxOpenPolyDP(curve.slice(0, splitIndex + 1), epsilon);
	const secondArc = approxOpenPolyDP([...curve.slice(splitIndex), curve[0]], epsilon);
	const approximated = dedupeAdjacentPoints([...firstArc, ...secondArc.slice(1, -1)]);
	return approximated.length >= 3 ? approximated : [...curve];
}
function approxOpenPolyDP(curve, epsilon) {
	const keep = new Uint8Array(curve.length);
	keep[0] = 1;
	keep[curve.length - 1] = 1;
	const stack = [[0, curve.length - 1]];
	const epsilonSquared = epsilon * epsilon;
	while (stack.length) {
		const [start, end] = stack.pop();
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
	const approximated = [];
	for (let index = 0; index < curve.length; index++) if (keep[index]) approximated.push(curve[index]);
	return approximated;
}
function removeDuplicateClosingPoint(points) {
	const curve = [...points];
	const first = curve[0];
	const last = curve[curve.length - 1];
	if (first && last && first.x === last.x && first.y === last.y) curve.pop();
	return curve;
}
function findFarthestPointIndex(points, origin) {
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
function dedupeAdjacentPoints(points) {
	const deduped = [];
	for (const point of points) {
		const previous = deduped[deduped.length - 1];
		if (previous && previous.x === point.x && previous.y === point.y) continue;
		deduped.push(point);
	}
	return deduped;
}
function isBoundaryPoint(bitmap, width, height, x, y) {
	for (const [dx, dy] of [
		[-1, 0],
		[1, 0],
		[0, -1],
		[0, 1]
	]) {
		const nextX = x + dx;
		const nextY = y + dy;
		if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) return true;
		if (!bitmap[nextY * width + nextX]) return true;
	}
	return false;
}
function traceComponentBoundaries(componentPixels, bitmap, width, height) {
	const edgesByStart = /* @__PURE__ */ new Map();
	for (const point of componentPixels) addPixelBoundaryEdges(edgesByStart, point, bitmap, width, height);
	const visited = /* @__PURE__ */ new Set();
	const loops = [];
	for (const edges of edgesByStart.values()) for (const edge of edges) {
		if (visited.has(edge.id)) continue;
		const loop = traceBoundaryLoop(edge, edgesByStart, visited);
		if (loop.length >= 3) loops.push(loop);
	}
	return loops.length > 0 ? loops : [componentPixels];
}
function addPixelBoundaryEdges(edgesByStart, point, bitmap, width, height) {
	const { x, y } = point;
	if (!hasForeground(bitmap, width, height, x, y - 1)) addBoundaryEdge(edgesByStart, {
		x,
		y
	}, {
		x: x + 1,
		y
	});
	if (!hasForeground(bitmap, width, height, x + 1, y)) addBoundaryEdge(edgesByStart, {
		x: x + 1,
		y
	}, {
		x: x + 1,
		y: y + 1
	});
	if (!hasForeground(bitmap, width, height, x, y + 1)) addBoundaryEdge(edgesByStart, {
		x: x + 1,
		y: y + 1
	}, {
		x,
		y: y + 1
	});
	if (!hasForeground(bitmap, width, height, x - 1, y)) addBoundaryEdge(edgesByStart, {
		x,
		y: y + 1
	}, {
		x,
		y
	});
}
function addBoundaryEdge(edgesByStart, start, end) {
	const edge = {
		start,
		end,
		id: `${vertexKey(start)}>${vertexKey(end)}`
	};
	const edges = edgesByStart.get(vertexKey(start)) ?? [];
	edges.push(edge);
	edgesByStart.set(vertexKey(start), edges);
}
function traceBoundaryLoop(firstEdge, edgesByStart, visited) {
	const loop = [];
	let current = firstEdge;
	const startKey = vertexKey(firstEdge.start);
	while (current && !visited.has(current.id)) {
		visited.add(current.id);
		loop.push(current.start);
		current = (edgesByStart.get(vertexKey(current.end))?.filter((edge) => !visited.has(edge.id)))?.[0];
		if (current && vertexKey(current.start) === startKey && loop.length > 1) break;
	}
	return loop;
}
function hasForeground(bitmap, width, height, x, y) {
	return x >= 0 && x < width && y >= 0 && y < height && Boolean(bitmap[y * width + x]);
}
function vertexKey(point) {
	return `${point.x},${point.y}`;
}
function pointSegmentDistanceSquared(point, start, end) {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const lengthSquared = dx * dx + dy * dy;
	if (lengthSquared <= Number.EPSILON) return distanceSquared(point, start);
	const projection = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
	return distanceSquared(point, {
		x: start.x + projection * dx,
		y: start.y + projection * dy
	});
}
function distanceSquared(pointA, pointB) {
	const dx = pointA.x - pointB.x;
	const dy = pointA.y - pointB.y;
	return dx * dx + dy * dy;
}
function polygonArea$1(points) {
	let area = 0;
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		area += current.x * next.y - next.x * current.y;
	}
	return area / 2;
}
//#endregion
//#region src/modules/text-detection/postprocess.ts
const DB_MIN_SIZE = 3;
function postprocessDetection(detection, input, runtimeOptions) {
	validateScoreMode(runtimeOptions.scoreMode);
	validateBoxType(runtimeOptions.boxType);
	validateDilationKernelSize(runtimeOptions.dilationKernelSize);
	const { dstWidth, dstHeight } = input.resizeParams;
	const scoreMap = resolveDetectionMap(detection, dstWidth, dstHeight);
	const thresholdedImage = new Image(dstWidth, dstHeight, 1, createDetectionBitmap(scoreMap, runtimeOptions.textPixelThreshold));
	const contours = findContours((runtimeOptions.dilationKernelSize > 0 ? thresholdedImage.dilate({
		norm: "LInf",
		k: runtimeOptions.dilationKernelSize
	}) : thresholdedImage).data, dstWidth, dstHeight, { minimumAreaThreshold: runtimeOptions.minimumAreaThreshold });
	const finalBoxes = [];
	for (const contour of contours.slice(0, runtimeOptions.maxCandidates)) {
		const box = runtimeOptions.boxType === "poly" ? postprocessPolygonContour(contour, scoreMap, input, runtimeOptions) : postprocessQuadContour(contour, scoreMap, input, runtimeOptions);
		if (!box) continue;
		finalBoxes.push(box);
	}
	return finalBoxes;
}
function validateScoreMode(scoreMode) {
	if (scoreMode === "fast" || scoreMode === "slow") return;
	throw new Error(`Unsupported DB scoreMode: ${String(scoreMode)}. Expected "fast" or "slow".`);
}
function validateBoxType(boxType) {
	if (boxType === "quad" || boxType === "poly") return;
	throw new Error(`Unsupported DB boxType: ${String(boxType)}. Expected "quad" or "poly".`);
}
function validateDilationKernelSize(dilationKernelSize) {
	if (Number.isInteger(dilationKernelSize) && dilationKernelSize >= 0) return;
	throw new Error(`Invalid DB dilationKernelSize: ${String(dilationKernelSize)}. Expected a non-negative integer.`);
}
function postprocessQuadContour(contour, scoreMap, input, runtimeOptions) {
	const { dstWidth, dstHeight } = input.resizeParams;
	const miniBox = getMiniBox(contour.points);
	if (!miniBox) return null;
	if (miniBox.shortSide < DB_MIN_SIZE) return null;
	if (boxScoreFast(scoreMap, dstWidth, dstHeight, runtimeOptions.scoreMode === "slow" ? contour.points : miniBox.points) < runtimeOptions.boxScoreThreshold) return null;
	const unclippedMiniBox = getMiniBox(unclipPolygon(miniBox.points, runtimeOptions.unclipRatio));
	if (!unclippedMiniBox || unclippedMiniBox.shortSide < DB_MIN_SIZE + 2) return null;
	return pointsToBox(orderPointsClockwise(convertQuadToOriginalCoordinates(unclippedMiniBox.points, input.resizeParams)), input.resizeParams.srcWidth, input.resizeParams.srcHeight);
}
function postprocessPolygonContour(contour, scoreMap, input, runtimeOptions) {
	const { dstWidth, dstHeight } = input.resizeParams;
	const points = approximatePolygonContour(contour.points);
	if (points.length < 4) return null;
	if (boxScoreFast(scoreMap, dstWidth, dstHeight, points) < runtimeOptions.boxScoreThreshold) return null;
	const unclipped = unclipPolygon(points, runtimeOptions.unclipRatio);
	const miniBox = getMiniBox(unclipped);
	if (!miniBox || miniBox.shortSide < DB_MIN_SIZE + 2) return null;
	return polygonToBox(convertPolygonToOriginalCoordinates(unclipped, input.resizeParams), input.resizeParams.srcWidth, input.resizeParams.srcHeight);
}
function approximatePolygonContour(points) {
	return approxPolyDP(points, .002 * polygonPerimeter(points), true);
}
function boxScoreFast(scoreMap, width, height, points) {
	const minX = Math.max(0, Math.floor(Math.min(...points.map((point) => point.x))));
	const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map((point) => point.x))));
	const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point.y))));
	const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((point) => point.y))));
	const localPolygon = points.map((point) => ({
		x: Math.trunc(point.x - minX),
		y: Math.trunc(point.y - minY)
	}));
	let sum = 0;
	let count = 0;
	for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
		if (!isPointInPolygonInclusive({
			x: x - minX,
			y: y - minY
		}, localPolygon)) continue;
		sum += scoreMap[y * width + x];
		count++;
	}
	return count > 0 ? sum / count : 0;
}
function resolveDetectionMap(detection, width, height) {
	const pixelCount = width * height;
	if (detection.length < pixelCount || detection.length % pixelCount !== 0) throw new Error(`Invalid DB output length: got ${detection.length} values for ${width}x${height} score maps; expected one or more complete channels of ${pixelCount} values.`);
	return detection.slice(0, pixelCount);
}
function createDetectionBitmap(scoreMap, threshold) {
	const bitmap = new Uint8Array(scoreMap.length);
	for (let i = 0; i < scoreMap.length; i++) bitmap[i] = scoreMap[i] > threshold ? 255 : 0;
	return bitmap;
}
function getMiniBox(points) {
	if (points.length < 3) return null;
	const hull = convexHull(points);
	if (hull.length < 3) return null;
	let bestBox = null;
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
		if (area >= bestArea) continue;
		bestBox = orderPointsClockwise([
			{
				x: minX,
				y: minY
			},
			{
				x: maxX,
				y: minY
			},
			{
				x: maxX,
				y: maxY
			},
			{
				x: minX,
				y: maxY
			}
		].map((point) => rotatePoint(point, angle)));
		bestArea = area;
		bestShortSide = Math.min(width, height);
	}
	if (!bestBox) return null;
	return {
		points: bestBox,
		shortSide: bestShortSide
	};
}
function convexHull(points) {
	const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x).filter((point, index, array) => index === 0 || point.x !== array[index - 1].x || point.y !== array[index - 1].y);
	if (sorted.length <= 1) return sorted;
	const lower = [];
	for (const point of sorted) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
		lower.push(point);
	}
	const upper = [];
	for (let i = sorted.length - 1; i >= 0; i--) {
		const point = sorted[i];
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
		upper.push(point);
	}
	lower.pop();
	upper.pop();
	return lower.concat(upper);
}
function rotatePoint(point, angle) {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return {
		x: point.x * cos - point.y * sin,
		y: point.x * sin + point.y * cos
	};
}
function unclipPolygon(points, unclipRatio) {
	const area = Math.abs(polygonArea(points));
	const perimeter = polygonPerimeter(points);
	if (area <= 0 || perimeter <= 0) return points;
	return offsetClosedPolygonRound(points, area * unclipRatio / perimeter);
}
function convertQuadToOriginalCoordinates(points, resizeParams) {
	return points.map((point) => ({
		x: point.x / resizeParams.scaleWidth,
		y: point.y / resizeParams.scaleHeight
	}));
}
function convertPolygonToOriginalCoordinates(points, resizeParams) {
	return points.map((point) => ({
		x: point.x / resizeParams.scaleWidth,
		y: point.y / resizeParams.scaleHeight
	}));
}
function orderPointsClockwise(points) {
	if (points.length !== 4) throw new Error(`Expected exactly four points, got ${points.length}.`);
	const [leftA, leftB, rightA, rightB] = [...points].sort((a, b) => a.x - b.x);
	const topLeft = leftB.y > leftA.y ? leftA : leftB;
	const bottomLeft = leftB.y > leftA.y ? leftB : leftA;
	return [
		topLeft,
		rightB.y > rightA.y ? rightA : rightB,
		rightB.y > rightA.y ? rightB : rightA,
		bottomLeft
	];
}
function pointsToBox(points, imageWidth, imageHeight) {
	const clippedPoints = points.map((point) => clipDetectionPoint(point, imageWidth, imageHeight));
	if (!hasOfficialQuadSize(clippedPoints)) return null;
	const minX = Math.floor(Math.min(...clippedPoints.map((point) => point.x)));
	const maxX = Math.ceil(Math.max(...clippedPoints.map((point) => point.x)));
	const minY = Math.floor(Math.min(...clippedPoints.map((point) => point.y)));
	const maxY = Math.ceil(Math.max(...clippedPoints.map((point) => point.y)));
	const width = Math.min(imageWidth - minX, maxX - minX);
	const height = Math.min(imageHeight - minY, maxY - minY);
	if (width <= 0 || height <= 0) return null;
	return {
		x: minX,
		y: minY,
		width,
		height,
		points: clippedPoints
	};
}
function hasOfficialQuadSize(points) {
	const rectWidth = Math.trunc(Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
	const rectHeight = Math.trunc(Math.hypot(points[0].x - points[3].x, points[0].y - points[3].y));
	return rectWidth > DB_MIN_SIZE && rectHeight > DB_MIN_SIZE;
}
function polygonToBox(points, imageWidth, imageHeight) {
	const clippedPoints = points.map((point) => clipDetectionPoint(point, imageWidth, imageHeight));
	const minX = Math.floor(Math.min(...clippedPoints.map((point) => point.x)));
	const maxX = Math.ceil(Math.max(...clippedPoints.map((point) => point.x)));
	const minY = Math.floor(Math.min(...clippedPoints.map((point) => point.y)));
	const maxY = Math.ceil(Math.max(...clippedPoints.map((point) => point.y)));
	const width = Math.min(imageWidth - minX, maxX - minX);
	const height = Math.min(imageHeight - minY, maxY - minY);
	if (width <= 0 || height <= 0) return null;
	return {
		x: minX,
		y: minY,
		width,
		height,
		polygon: clippedPoints
	};
}
function clipDetectionPoint(point, imageWidth, imageHeight) {
	const maxX = Math.max(0, imageWidth - 1);
	const maxY = Math.max(0, imageHeight - 1);
	return {
		x: Math.max(0, Math.min(maxX, Math.round(point.x))),
		y: Math.max(0, Math.min(maxY, Math.round(point.y)))
	};
}
function cross(origin, pointA, pointB) {
	return (pointA.x - origin.x) * (pointB.y - origin.y) - (pointA.y - origin.y) * (pointB.x - origin.x);
}
function isPointInPolygonInclusive(point, polygon) {
	let inside = false;
	for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
		const current = polygon[index];
		const previous = polygon[previousIndex];
		if (isPointOnSegment(point, previous, current)) return true;
		if (current.y > point.y !== previous.y > point.y && point.x < (previous.x - current.x) * (point.y - current.y) / (previous.y - current.y) + current.x) inside = !inside;
	}
	return inside;
}
function isPointOnSegment(point, start, end) {
	const area = cross(start, end, point);
	if (Math.abs(area) > 1e-6) return false;
	return point.x >= Math.min(start.x, end.x) - 1e-6 && point.x <= Math.max(start.x, end.x) + 1e-6 && point.y >= Math.min(start.y, end.y) - 1e-6 && point.y <= Math.max(start.y, end.y) + 1e-6;
}
function polygonArea(points) {
	let area = 0;
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		area += current.x * next.y - next.x * current.y;
	}
	return area / 2;
}
function polygonPerimeter(points) {
	let perimeter = 0;
	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		perimeter += Math.hypot(current.x - next.x, current.y - next.y);
	}
	return perimeter;
}
//#endregion
//#region src/modules/text-detection/preprocess.ts
function preprocessDetection(image, runtimeOptions) {
	const resizeParams = calculateDetectionResizeDimensions(image, runtimeOptions);
	return {
		tensor: (image.width === resizeParams.resizeSourceWidth && image.height === resizeParams.resizeSourceHeight ? image : image.padding({
			right: resizeParams.resizeSourceWidth - image.width,
			bottom: resizeParams.resizeSourceHeight - image.height,
			color: [
				0,
				0,
				0
			]
		})).resize({
			width: resizeParams.dstWidth,
			height: resizeParams.dstHeight
		}).tensor({
			mean_values: runtimeOptions.mean,
			norm_values: runtimeOptions.stdDeviation,
			channel_order: runtimeOptions.channelOrder
		}),
		resizeParams
	};
}
function calculateDetectionResizeDimensions(image, runtimeOptions) {
	const { width: srcWidth, height: srcHeight } = image;
	const resizeSourceWidth = srcWidth + srcHeight < 64 ? Math.max(32, srcWidth) : srcWidth;
	const resizeSourceHeight = srcWidth + srcHeight < 64 ? Math.max(32, srcHeight) : srcHeight;
	const fixedInputShape = runtimeOptions.inputShape;
	if (fixedInputShape) {
		const [, fixedHeight, fixedWidth] = fixedInputShape;
		if (!Number.isInteger(fixedWidth) || fixedWidth <= 0) throw new Error(`Invalid detection inputShape width: ${fixedWidth}. Expected a positive integer.`);
		if (!Number.isInteger(fixedHeight) || fixedHeight <= 0) throw new Error(`Invalid detection inputShape height: ${fixedHeight}. Expected a positive integer.`);
		return {
			srcHeight,
			srcWidth,
			resizeSourceHeight,
			resizeSourceWidth,
			dstHeight: fixedHeight,
			dstWidth: fixedWidth,
			scaleWidth: fixedWidth / resizeSourceWidth,
			scaleHeight: fixedHeight / resizeSourceHeight
		};
	}
	const limitSideLength = runtimeOptions.maxSideLength;
	const limitType = runtimeOptions.limitType;
	const maxSideLimit = runtimeOptions.maxSideLimit;
	const shortSide = Math.min(resizeSourceWidth, resizeSourceHeight);
	const longSide = Math.max(resizeSourceWidth, resizeSourceHeight);
	let ratio = 1;
	if (limitType === "max") ratio = longSide > limitSideLength ? limitSideLength / longSide : 1;
	else if (limitType === "min") ratio = shortSide < limitSideLength ? limitSideLength / shortSide : 1;
	else if (limitType === "resize_long") ratio = limitSideLength / longSide;
	else throw new Error(`Unsupported detection resize limitType: ${limitType}`);
	let dstWidth = Math.round(resizeSourceWidth * ratio);
	let dstHeight = Math.round(resizeSourceHeight * ratio);
	const resizedLongSide = Math.max(dstWidth, dstHeight);
	if (resizedLongSide > maxSideLimit) {
		const sideLimitRatio = maxSideLimit / resizedLongSide;
		dstWidth = Math.round(dstWidth * sideLimitRatio);
		dstHeight = Math.round(dstHeight * sideLimitRatio);
	}
	if (dstWidth % 32 !== 0) dstWidth = Math.max(Math.round(dstWidth / 32) * 32, 32);
	if (dstHeight % 32 !== 0) dstHeight = Math.max(Math.round(dstHeight / 32) * 32, 32);
	return {
		srcHeight,
		srcWidth,
		resizeSourceHeight,
		resizeSourceWidth,
		dstHeight,
		dstWidth,
		scaleWidth: dstWidth / resizeSourceWidth,
		scaleHeight: dstHeight / resizeSourceHeight
	};
}
//#endregion
//#region src/modules/text-detection/service.ts
/**
* Service for detecting text regions in images
*/
var DetectionService = class DetectionService {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = {
			...DEFAULT_DETECTION_OPTIONS,
			...options
		};
	}
	/**
	* Main method to run text detection on an image
	* @param image ArrayBuffer of the image or Canvas
	*/
	async run(image, options = {}) {
		const { onProgress, ...runtimeOverrides } = options;
		const runtimeOptions = this.resolveRuntimeOptions(runtimeOverrides);
		const input = await this.preprocessDetection(image, runtimeOptions);
		onProgress?.({
			type: "det",
			stage: "preprocess",
			progress: this.createProgress(1)
		});
		const detection = await this.runInference(input.tensor, input.resizeParams);
		onProgress?.({
			type: "det",
			stage: "infer",
			progress: this.createProgress(2)
		});
		const detectedBoxes = this.postprocessDetection(detection, input, runtimeOptions);
		onProgress?.({
			type: "det",
			stage: "postprocess",
			progress: this.createProgress(3),
			detectedCount: detectedBoxes.length
		});
		return detectedBoxes;
	}
	resolveRuntimeOptions(options = {}) {
		const inputShape = options.inputShape ?? this.options.inputShape ?? this.resolveFixedInputShape();
		const runtimeOptions = {
			...this.options,
			...options
		};
		if (!inputShape) return runtimeOptions;
		return {
			...runtimeOptions,
			inputShape
		};
	}
	resolveFixedInputShape() {
		const fixedInputShape = getFixedInputShape(this.session);
		if (!fixedInputShape.height || !fixedInputShape.width) return;
		return [
			fixedInputShape.channels ?? 3,
			fixedInputShape.height,
			fixedInputShape.width
		];
	}
	createProgress(current) {
		return {
			current,
			remain: DetectionService.TOTAL_PROGRESS_STEPS - current,
			total: DetectionService.TOTAL_PROGRESS_STEPS
		};
	}
	/**
	* Preprocess an image for text detection
	*/
	async preprocessDetection(image, runtimeOptions) {
		return preprocessDetection(image, runtimeOptions);
	}
	/**
	* Run the detection model inference
	*/
	async runInference(tensor, resizeParams) {
		const inputTensor = new this.ortModule.Tensor("float32", tensor, [
			1,
			3,
			resizeParams.dstHeight,
			resizeParams.dstWidth
		]);
		const results = await this.session.run(createInputFeeds(this.session, inputTensor));
		const outputNodeName = this.session.outputNames[0] ?? Object.keys(results)[0];
		const outputTensor = outputNodeName ? results[outputNodeName] : void 0;
		if (!outputTensor) throw new Error(`Detection output tensor '${outputNodeName ?? "<none>"}' not found. Available keys: ${Object.keys(results).join(", ")}`);
		const outputData = extractDetectionOutputData(outputTensor);
		validateDetectionOutputShape(outputTensor, outputData, resizeParams);
		return outputData;
	}
	/**
	* Process detection results to extract bounding boxes
	*/
	postprocessDetection(detection, input, runtimeOptions) {
		return postprocessDetection(detection, input, runtimeOptions);
	}
};
_defineProperty(DetectionService, "TOTAL_PROGRESS_STEPS", 3);
function extractDetectionOutputData(tensor) {
	if (!(tensor.data instanceof Float32Array)) throw new Error("Detection output tensor must contain Float32Array data.");
	return tensor.data;
}
function validateDetectionOutputShape(tensor, data, resizeParams) {
	const [batch, channels, height, width] = tensor.dims;
	if (tensor.dims.length !== 4 || batch !== 1 || !Number.isInteger(channels) || channels < 1 || height !== resizeParams.dstHeight || width !== resizeParams.dstWidth) throw new Error(`Detection output tensor shape [${tensor.dims.join(",")}] must be DB maps in [1,C,${resizeParams.dstHeight},${resizeParams.dstWidth}] layout.`);
	const expectedLength = batch * channels * height * width;
	if (data.length !== expectedLength) throw new Error(`Detection output tensor shape [${tensor.dims.join(",")}] does not match data length ${data.length}.`);
}
//#endregion
//#region src/modules/text-image-unwarping/postprocess.ts
function postprocessTextImageUnwarping(outputs, runtimeOptions) {
	const tensor = selectTextImageUnwarpingOutput(outputs);
	const [batchSize, channelCount, height, width] = tensor.dims;
	if (batchSize !== 1) throw new Error(`Unsupported text image unwarping batch size: ${batchSize}. Expected 1.`);
	if (channelCount !== 3) throw new Error(`Unsupported text image unwarping output channels: ${channelCount}. Expected 3.`);
	if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) throw new Error(`Invalid text image unwarping output size: ${width}x${height}. Expected positive integer dimensions.`);
	if (!Number.isFinite(runtimeOptions.outputScale)) throw new Error(`Invalid text image unwarping outputScale: ${runtimeOptions.outputScale}. Expected a finite number.`);
	if (runtimeOptions.outputChannelOrder !== "rgb" && runtimeOptions.outputChannelOrder !== "bgr") throw new Error(`Unsupported text image unwarping outputChannelOrder: ${runtimeOptions.outputChannelOrder}. Expected "rgb" or "bgr".`);
	const output = new Uint8Array(width * height * 3);
	const source = tensor.data;
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const pixelIndex = y * width + x;
		const targetIndex = pixelIndex * 3;
		for (let channel = 0; channel < 3; channel++) {
			const value = source[(runtimeOptions.outputChannelOrder === "bgr" ? 2 - channel : channel) * width * height + pixelIndex];
			output[targetIndex + channel] = clampToUint8(value * runtimeOptions.outputScale);
		}
	}
	return { doctrImage: {
		width,
		height,
		data: output
	} };
}
function selectTextImageUnwarpingOutput(outputs) {
	const candidates = Object.values(outputs).filter((tensor) => tensor.data instanceof Float32Array && tensor.dims.length === 4 && tensor.dims.every((dimension) => Number.isInteger(dimension) && dimension > 0));
	if (candidates.length !== 1) throw new Error(`Expected exactly one 4D Float32 text image unwarping output tensor, got ${candidates.length}.`);
	return candidates[0];
}
function clampToUint8(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(255, Math.round(value)));
}
//#endregion
//#region src/modules/text-image-unwarping/preprocess.ts
function preprocessTextImageUnwarping(image, runtimeOptions) {
	validateTextImageUnwarpingPreprocessOptions(runtimeOptions);
	return {
		image: {
			data: image.tensor({
				mean_values: runtimeOptions.mean,
				norm_values: runtimeOptions.stdDeviation,
				channel_order: runtimeOptions.channelOrder
			}),
			dims: [
				1,
				3,
				image.height,
				image.width
			]
		},
		resizeParams: {
			srcWidth: image.width,
			srcHeight: image.height,
			tensorWidth: image.width,
			tensorHeight: image.height
		}
	};
}
function createTextImageUnwarpingInputFeeds(ortModule, session, input, runtimeOptions = {}) {
	return { [session.inputNames?.[0] ?? runtimeOptions.inputName ?? "img"]: new ortModule.Tensor("float32", input.image.data, input.image.dims) };
}
function validateTextImageUnwarpingPreprocessOptions(runtimeOptions) {
	if (runtimeOptions.channelOrder !== "rgb" && runtimeOptions.channelOrder !== "bgr") throw new Error(`Unsupported text image unwarping channelOrder: ${runtimeOptions.channelOrder}. Expected "rgb" or "bgr".`);
	validateTriple(runtimeOptions.mean, "mean");
	validateTriple(runtimeOptions.stdDeviation, "stdDeviation");
}
function validateTriple(value, name) {
	if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) throw new Error(`Invalid text image unwarping ${name}: ${String(value)}. Expected three finite numbers.`);
}
const TEXT_IMAGE_UNWARPING_PRESETS = { UVDoc: {
	name: "UVDoc",
	module: "text_image_unwarping",
	architecture: "UVDoc",
	options: {
		inputName: "img",
		mean: [
			0,
			0,
			0
		],
		stdDeviation: [
			1 / 255,
			1 / 255,
			1 / 255
		],
		channelOrder: "bgr",
		preprocessPipeline: [
			"Read",
			"Normalize",
			"ToCHW",
			"ToBatch"
		],
		postprocessName: "DocTr",
		outputScale: 255,
		outputChannelOrder: "bgr",
		resultImageKey: "doctr_img",
		dynamicInputShape: {
			min: [
				1,
				3,
				128,
				64
			],
			opt: [
				1,
				3,
				256,
				128
			],
			max: [
				8,
				3,
				512,
				256
			]
		}
	}
} };
function getTextImageUnwarpingPreset(name) {
	const preset = TEXT_IMAGE_UNWARPING_PRESETS[name];
	if (!preset) throw new Error(`Unsupported text image unwarping preset: ${name}`);
	return preset;
}
function getTextImageUnwarpingPresetOptions(name) {
	if (!name) return {};
	const options = getTextImageUnwarpingPreset(name).options;
	return {
		...options,
		mean: options.mean ? [...options.mean] : void 0,
		stdDeviation: options.stdDeviation ? [...options.stdDeviation] : void 0,
		preprocessPipeline: options.preprocessPipeline ? [...options.preprocessPipeline] : void 0,
		dynamicInputShape: options.dynamicInputShape ? {
			min: [...options.dynamicInputShape.min],
			opt: [...options.dynamicInputShape.opt],
			max: [...options.dynamicInputShape.max]
		} : void 0
	};
}
//#endregion
//#region src/modules/text-image-unwarping/service.ts
/**
* Lightweight runner for PaddleOCR/PaddleX UVDoc text image unwarping modules.
*/
var TextImageUnwarpingService = class {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = { ...options };
	}
	async runRaw(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		return this.runRawWithRuntimeOptions(input, runtimeOptions);
	}
	async run(input, options = {}) {
		const runtimeOptions = this.resolveRuntimeOptions(options);
		return postprocessTextImageUnwarping((await this.runRawWithRuntimeOptions(input, runtimeOptions)).outputs, runtimeOptions);
	}
	async runRawWithRuntimeOptions(input, runtimeOptions) {
		const preprocessed = preprocessTextImageUnwarping(normalizeInputToRgb(input), runtimeOptions);
		const outputs = await this.session.run(createTextImageUnwarpingInputFeeds(this.ortModule, this.session, preprocessed, runtimeOptions));
		if (Object.keys(outputs).length === 0) throw new Error("Text image unwarping session returned no output tensors.");
		return {
			outputs,
			resizeParams: preprocessed.resizeParams
		};
	}
	resolveRuntimeOptions(options) {
		const runtimeOptions = {
			...this.options,
			...options
		};
		return {
			inputName: runtimeOptions.inputName,
			mean: this.requireTriple(runtimeOptions.mean, "mean"),
			stdDeviation: this.requireTriple(runtimeOptions.stdDeviation, "stdDeviation"),
			channelOrder: this.requireChannelOrder(runtimeOptions.channelOrder, "channelOrder"),
			preprocessPipeline: runtimeOptions.preprocessPipeline,
			postprocessName: runtimeOptions.postprocessName,
			outputScale: this.requireFiniteNumber(runtimeOptions.outputScale, "outputScale"),
			outputChannelOrder: this.requireChannelOrder(runtimeOptions.outputChannelOrder, "outputChannelOrder"),
			resultImageKey: runtimeOptions.resultImageKey,
			dynamicInputShape: runtimeOptions.dynamicInputShape
		};
	}
	requireTriple(value, name) {
		if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !Number.isFinite(item))) throw new Error(`Invalid text image unwarping ${name}: ${String(value)}. Expected three finite numbers.`);
		return [
			value[0],
			value[1],
			value[2]
		];
	}
	requireChannelOrder(value, name) {
		if (value !== "rgb" && value !== "bgr") throw new Error(`Unsupported text image unwarping ${name}: ${value}. Expected "rgb" or "bgr".`);
		return value;
	}
	requireFiniteNumber(value, name) {
		if (!Number.isFinite(value)) throw new Error(`Invalid text image unwarping ${name}: ${value}. Expected a finite number.`);
		return value;
	}
};
//#endregion
//#region src/modules/text-recognition/preset.ts
const PPOCR_RECOGNITION$1 = {
	channelOrder: "bgr",
	outputSelectionStrategy: "ctc-logits",
	imageHeight: 48,
	imageWidth: 320
};
const PPOCR_PREPROCESS_PIPELINE = [
	"DecodeImage",
	"MultiLabelEncode",
	"RecResizeImg",
	"KeepKeys"
];
const PPOCRV5_DICTIONARY$1 = {
	name: "ppocrv5",
	fileName: "ppocrv5_dict.txt",
	useSpaceChar: true,
	dictionaryLength: 18384,
	recognitionOutputClasses: 18385
};
const PPOCRV6_DICTIONARY$1 = {
	name: "ppocrv6",
	fileName: "ppocrv6_dict.txt",
	useSpaceChar: true,
	dictionaryLength: 18708,
	recognitionOutputClasses: 18710
};
const PPOCRV6_TINY_DICTIONARY$1 = {
	name: "ppocrv6_tiny",
	fileName: "ppocrv6_tiny_dict.txt",
	useSpaceChar: true,
	dictionaryLength: 6904,
	recognitionOutputClasses: 6906
};
function createTextRecognitionPreset(name, dictionary) {
	return {
		name,
		module: "text_recognition",
		architecture: "CTC",
		inputName: "x",
		preprocessPipeline: PPOCR_PREPROCESS_PIPELINE,
		postprocessName: "CTCLabelDecode",
		dictionary,
		options: PPOCR_RECOGNITION$1
	};
}
const TEXT_RECOGNITION_PRESETS = {
	"PP-OCRv5_mobile_rec": createTextRecognitionPreset("PP-OCRv5_mobile_rec", PPOCRV5_DICTIONARY$1),
	"PP-OCRv5_server_rec": createTextRecognitionPreset("PP-OCRv5_server_rec", PPOCRV5_DICTIONARY$1),
	"PP-OCRv6_tiny_rec": createTextRecognitionPreset("PP-OCRv6_tiny_rec", PPOCRV6_TINY_DICTIONARY$1),
	"PP-OCRv6_small_rec": createTextRecognitionPreset("PP-OCRv6_small_rec", PPOCRV6_DICTIONARY$1),
	"PP-OCRv6_medium_rec": createTextRecognitionPreset("PP-OCRv6_medium_rec", PPOCRV6_DICTIONARY$1)
};
function getTextRecognitionPreset(name) {
	const preset = TEXT_RECOGNITION_PRESETS[name];
	if (!preset) throw new Error(`Unsupported text recognition preset: ${name}`);
	return preset;
}
function getTextRecognitionPresetOptions(name) {
	if (!name) return {};
	return { ...getTextRecognitionPreset(name).options };
}
//#endregion
//#region src/modules/text-recognition/service.ts
/**
* Service for detecting and recognizing text in images
*/
var RecognitionService = class {
	constructor(ortModule, session, options = {}) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "session", void 0);
		_defineProperty(this, "ortModule", void 0);
		this.session = session;
		this.ortModule = ortModule;
		this.options = {
			...DEFAULT_RECOGNITION_OPTIONS,
			...options
		};
	}
	/**
	* Main method to run text recognition on an image with detected regions
	* @param image The original image buffer or image in Canvas
	* @param detection Array of bounding boxes from text detection
	* @returns Array of recognition results with text and bounding box, sorted in reading order
	*/
	async run(image, detection, options) {
		const recognitionOptions = this.resolveRuntimeOptions(options?.recognition);
		const orderingOptions = this.resolveOrderingOptions(options?.ordering);
		const validBoxes = this.sortBoxesByReadingOrder(detection.filter((box) => box.width > 0 && box.height > 0), orderingOptions);
		const maxWhRatio = this.calculateBatchMaxWhRatio(validBoxes, recognitionOptions);
		const results = [];
		const charWhiteListSet = options?.charWhiteList?.length ? new Set(options.charWhiteList) : void 0;
		const total = validBoxes.length;
		const onProgress = options?.onProgress;
		onProgress?.({
			type: "rec",
			stage: "start",
			progress: this.createProgress(0, total)
		});
		for (const [i, box] of validBoxes.entries()) {
			const result = await this.processBox({
				image,
				index: i,
				box,
				maxWhRatio,
				charWhiteSet: charWhiteListSet,
				textlineOrientation: options?.textlineOrientation,
				textlineOrientationClassifier: options?.textlineOrientationClassifier
			}, recognitionOptions);
			if (result) results.push(result);
			onProgress?.({
				type: "rec",
				stage: "item",
				progress: this.createProgress(i + 1, total),
				index: i,
				box,
				result: result ?? void 0,
				textlineOrientation: result?.textlineOrientation
			});
		}
		onProgress?.({
			type: "rec",
			stage: "complete",
			progress: this.createProgress(total, total)
		});
		return results;
	}
	resolveRuntimeOptions(options = {}) {
		return {
			...this.options,
			...options
		};
	}
	resolveOrderingOptions(options = {}) {
		return {
			...DEFAULT_RECOGNITION_ORDERING_OPTIONS,
			...options
		};
	}
	/**
	* Process a single text box
	*/
	async processBox(task, runtimeOptions) {
		const { image, box } = task;
		let crop = box.points ? image.cropRotated(box.points) : image.crop(box);
		const textlineOrientation = await this.correctTextlineOrientation(crop, task);
		if (textlineOrientation?.rotated) crop = crop.rotate180();
		const fixedInputWidth = getFixedInputShape(this.session).width;
		const proportionalWidth = Math.ceil(runtimeOptions.imageHeight * (crop.width / crop.height));
		const targetWidth = fixedInputWidth ?? Math.max(runtimeOptions.imageWidth, proportionalWidth, Math.ceil(runtimeOptions.imageHeight * (task.maxWhRatio ?? 0)));
		const resizedWidth = Math.min(proportionalWidth, targetWidth);
		const resizedTensor = crop.resize({
			width: resizedWidth,
			height: runtimeOptions.imageHeight
		}).tensor({
			mean_values: runtimeOptions.mean,
			norm_values: runtimeOptions.stdDeviation,
			channel_order: runtimeOptions.channelOrder
		});
		const tensor = this.padRecognitionTensor(resizedTensor, resizedWidth, runtimeOptions.imageHeight, targetWidth);
		const inputTensor = new this.ortModule.Tensor("float32", tensor, [
			1,
			3,
			runtimeOptions.imageHeight,
			targetWidth
		]);
		const { data: outputData, dims: shape } = await this.runInference(inputTensor, runtimeOptions);
		const [, sequenceLength, numClasses] = shape;
		const { text: recognizedText, confidence } = this.ctcLabelDecode(outputData, sequenceLength, numClasses, runtimeOptions, task.charWhiteSet);
		return {
			text: recognizedText,
			box,
			confidence,
			textlineOrientation
		};
	}
	async correctTextlineOrientation(crop, task) {
		const classifier = task.textlineOrientationClassifier;
		if (!classifier) return;
		const runtimeOptions = {
			enabled: true,
			threshold: .9,
			...task.textlineOrientation
		};
		if (!runtimeOptions.enabled) return;
		const topResult = (await classifier.run(crop, runtimeOptions))[0];
		if (!topResult) return;
		return {
			classId: topResult.classId,
			label: topResult.label,
			score: topResult.score,
			rotated: topResult.label.includes("180") && topResult.score > runtimeOptions.threshold
		};
	}
	calculateBatchMaxWhRatio(boxes, runtimeOptions) {
		let maxWhRatio = runtimeOptions.imageWidth / runtimeOptions.imageHeight;
		for (const box of boxes) maxWhRatio = Math.max(maxWhRatio, this.calculateBoxWhRatio(box));
		return maxWhRatio;
	}
	calculateBoxWhRatio(box) {
		if (!box.points) return box.width / box.height;
		const cropWidth = Math.max(this.distance(box.points[0], box.points[1]), this.distance(box.points[2], box.points[3]), 1);
		const cropHeight = Math.max(this.distance(box.points[0], box.points[3]), this.distance(box.points[1], box.points[2]), 1);
		if (cropHeight / cropWidth >= 1.5) return cropHeight / cropWidth;
		return cropWidth / cropHeight;
	}
	distance(a, b) {
		return Math.hypot(a.x - b.x, a.y - b.y);
	}
	padRecognitionTensor(source, sourceWidth, height, targetWidth) {
		if (sourceWidth === targetWidth) return source;
		const channels = 3;
		const padded = new Float32Array(channels * height * targetWidth);
		for (let channel = 0; channel < channels; channel++) for (let y = 0; y < height; y++) {
			const sourceStart = channel * height * sourceWidth + y * sourceWidth;
			const targetStart = channel * height * targetWidth + y * targetWidth;
			padded.set(source.subarray(sourceStart, sourceStart + sourceWidth), targetStart);
		}
		return padded;
	}
	/**
	* Sort recognition results by reading order (top to bottom, left to right)
	*/
	sortBoxesByReadingOrder(boxes, orderingOptions) {
		if (!orderingOptions.sortByReadingOrder) return [...boxes];
		const sortedBoxes = [...boxes].sort((boxA, boxB) => {
			const pointA = this.getBoxTopLeft(boxA);
			const pointB = this.getBoxTopLeft(boxB);
			if (pointA.y !== pointB.y) return pointA.y - pointB.y;
			return pointA.x - pointB.x;
		});
		for (let i = 0; i < sortedBoxes.length - 1; i++) for (let j = i; j >= 0; j--) {
			const current = sortedBoxes[j];
			const next = sortedBoxes[j + 1];
			if (!current || !next) break;
			const currentPoint = this.getBoxTopLeft(current);
			const nextPoint = this.getBoxTopLeft(next);
			const sameLineThreshold = this.resolveSameLineThreshold(current, next, orderingOptions);
			if (Math.abs(nextPoint.y - currentPoint.y) < sameLineThreshold && nextPoint.x < currentPoint.x) {
				sortedBoxes[j] = next;
				sortedBoxes[j + 1] = current;
				continue;
			}
			break;
		}
		return sortedBoxes;
	}
	getBoxTopLeft(box) {
		return box.points?.[0] ?? box;
	}
	resolveSameLineThreshold(boxA, boxB, orderingOptions) {
		if (orderingOptions.sameLineThresholdRatio !== void 0) return (boxA.height + boxB.height) * orderingOptions.sameLineThresholdRatio;
		return orderingOptions.sameLinePixelThreshold ?? 10;
	}
	createProgress(current, total) {
		return {
			current,
			remain: total - current,
			total
		};
	}
	/**
	* Runs the ONNX inference session with the prepared tensor
	*/
	async runInference(inputTensor, runtimeOptions) {
		const results = await this.session.run(createInputFeeds(this.session, inputTensor));
		const outputTensor = this.selectOutputTensor(results, runtimeOptions);
		if (!outputTensor) throw new Error(`Recognition output tensor not found. Available keys: ${Object.keys(results).join(", ")}`);
		return outputTensor;
	}
	selectOutputTensor(results, runtimeOptions) {
		if (runtimeOptions.outputSelectionStrategy !== "ctc-logits") {
			const outputNodeName = Object.keys(results)[0];
			return outputNodeName ? results[outputNodeName] : void 0;
		}
		let ctcOutputTensor;
		for (const outputName of Object.keys(results)) {
			const outputTensor = results[outputName];
			const dims = outputTensor?.dims;
			if (outputTensor?.data instanceof Float32Array && dims?.length === 3 && (dims[0] === 1 || dims[0] === -1) && (dims[1] ?? 0) > 0 && (dims[2] ?? 0) > 1) ctcOutputTensor = outputTensor;
		}
		if (ctcOutputTensor) return ctcOutputTensor;
		throw new Error(`Recognition CTC logits output not found. Available outputs: ${Object.entries(results).map(([name, tensor]) => `${name}[${tensor.dims.join(",")}]`).join(", ")}`);
	}
	ctcLabelDecode(logits, sequenceLength, numClasses, runtimeOptions, charWhiteSet) {
		const dict = runtimeOptions.charactersDictionary;
		const dictionaryIncludesBlank = dict[0] === "" || dict[0] === "blank";
		const requiredDictionaryLength = dictionaryIncludesBlank ? numClasses : numClasses - 1;
		if (dict.length < requiredDictionaryLength) throw new Error(`Recognition charactersDictionary length ${dict.length} is too small for model output classes ${numClasses}. Expected at least ${requiredDictionaryLength}${dictionaryIncludesBlank ? " including the CTC blank entry" : ""}.`);
		let text = "";
		const scores = [];
		let lastIndex = -1;
		for (let t = 0; t < sequenceLength; t++) {
			let maxScore = -Infinity;
			let maxScoreIndex = 0;
			const offset = t * numClasses;
			for (let i = 0; i < numClasses; i++) {
				const val = logits[offset + i];
				if (val > maxScore) {
					maxScore = val;
					maxScoreIndex = i;
				}
			}
			if (maxScoreIndex === lastIndex) continue;
			lastIndex = maxScoreIndex;
			if (maxScoreIndex === 0) continue;
			const char = dict[dictionaryIncludesBlank ? maxScoreIndex : maxScoreIndex - 1] || "";
			if (charWhiteSet && !charWhiteSet.has(char) && char !== " ") continue;
			text += char;
			scores.push(maxScore);
		}
		return {
			text: runtimeOptions.reverseText ? reverseTextLikePaddleOcr(text) : text,
			confidence: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
		};
	}
};
function reverseTextLikePaddleOcr(text) {
	const groups = [];
	let current = "";
	for (const char of text) {
		if (!/[a-zA-Z0-9 :*./%+-]/.test(char)) {
			if (current) groups.push(current);
			groups.push(char);
			current = "";
			continue;
		}
		current += char;
	}
	if (current) groups.push(current);
	return groups.reverse().join("");
}
//#endregion
//#region src/pipelines/ocr-preset.ts
const PPOCRV5_DETECTION = {
	channelOrder: "bgr",
	maxSideLength: 960,
	limitType: "max",
	maxSideLimit: 4e3,
	textPixelThreshold: .3,
	boxScoreThreshold: .6,
	maxCandidates: 1e3,
	unclipRatio: 1.5
};
const PPOCRV6_DETECTION = {
	channelOrder: "bgr",
	maxSideLength: 736,
	limitType: "min",
	maxSideLimit: 4e3,
	textPixelThreshold: .2,
	boxScoreThreshold: .45,
	maxCandidates: 3e3,
	unclipRatio: 1.4
};
const PPOCR_RECOGNITION = {
	channelOrder: "bgr",
	outputSelectionStrategy: "ctc-logits",
	imageHeight: 48,
	imageWidth: 320
};
const PPOCRV5_RECOGNITION_OUTPUT_CLASSES = 18385;
const PPOCRV5_DICTIONARY_LENGTH = 18384;
const PPOCRV6_RECOGNITION_OUTPUT_CLASSES = 18710;
const PPOCRV6_DICTIONARY_LENGTH = 18708;
const PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES = 6906;
const PPOCRV6_TINY_DICTIONARY_LENGTH = 6904;
const PPOCRV5_DICTIONARY = {
	name: "ppocrv5",
	fileName: "ppocrv5_dict.txt",
	useSpaceChar: true,
	dictionaryLength: PPOCRV5_DICTIONARY_LENGTH,
	recognitionOutputClasses: PPOCRV5_RECOGNITION_OUTPUT_CLASSES
};
const PPOCRV6_DICTIONARY = {
	name: "ppocrv6",
	fileName: "ppocrv6_dict.txt",
	useSpaceChar: true,
	dictionaryLength: PPOCRV6_DICTIONARY_LENGTH,
	recognitionOutputClasses: PPOCRV6_RECOGNITION_OUTPUT_CLASSES
};
const PPOCRV6_TINY_DICTIONARY = {
	name: "ppocrv6_tiny",
	fileName: "ppocrv6_tiny_dict.txt",
	useSpaceChar: true,
	dictionaryLength: PPOCRV6_TINY_DICTIONARY_LENGTH,
	recognitionOutputClasses: PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES
};
const MODEL_PRESETS = {
	"PP-OCRv5": {
		name: "PP-OCRv5",
		detection: PPOCRV5_DETECTION,
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV5_DICTIONARY
	},
	"PP-OCRv5_mobile": {
		name: "PP-OCRv5_mobile",
		detection: PPOCRV5_DETECTION,
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV5_DICTIONARY
	},
	"PP-OCRv5_server": {
		name: "PP-OCRv5_server",
		detection: PPOCRV5_DETECTION,
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV5_DICTIONARY
	},
	"PP-OCRv6": {
		name: "PP-OCRv6",
		detection: PPOCRV6_DETECTION,
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV6_DICTIONARY
	},
	"PP-OCRv6_tiny": {
		name: "PP-OCRv6_tiny",
		detection: {
			...PPOCRV6_DETECTION,
			boxScoreThreshold: .4
		},
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV6_TINY_DICTIONARY
	},
	"PP-OCRv6_small": {
		name: "PP-OCRv6_small",
		detection: PPOCRV6_DETECTION,
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV6_DICTIONARY
	},
	"PP-OCRv6_medium": {
		name: "PP-OCRv6_medium",
		detection: PPOCRV6_DETECTION,
		recognition: PPOCR_RECOGNITION,
		dictionary: PPOCRV6_DICTIONARY
	}
};
function getModelPreset(name) {
	const preset = MODEL_PRESETS[name];
	if (!preset) throw new Error(`Unsupported PaddleOCR model preset: ${name}`);
	return preset;
}
function getModelPresetOptions(name) {
	if (!name) return {
		detection: {},
		recognition: {}
	};
	const preset = getModelPreset(name);
	return {
		detection: { ...preset.detection },
		recognition: { ...preset.recognition }
	};
}
function inferModelPreset(input) {
	const signals = collectInferenceSignals(input);
	const normalized = signals.map((signal) => normalizeInferenceSignal(signal));
	if (normalized.some((signal) => signal.includes("ppocrv6tiny"))) return createInferenceResult("PP-OCRv6_tiny", "high", signals);
	if (normalized.some((signal) => signal.includes("ppocrv6small"))) return createInferenceResult("PP-OCRv6_small", "high", signals);
	if (normalized.some((signal) => signal.includes("ppocrv6medium"))) return createInferenceResult("PP-OCRv6_medium", "high", signals);
	if (normalized.some((signal) => signal.includes("ppocrv6"))) return createInferenceResult("PP-OCRv6", "medium", signals);
	if (normalized.some((signal) => signal.includes("ppocrv5server"))) return createInferenceResult("PP-OCRv5_server", "high", signals);
	if (normalized.some((signal) => signal.includes("ppocrv5mobile"))) return createInferenceResult("PP-OCRv5_mobile", "high", signals);
	if (normalized.some((signal) => signal.includes("ppocrv5"))) return createInferenceResult("PP-OCRv5", "medium", signals);
	return inferModelPresetFromMetadata(input);
}
function inferModelPresetFromMetadata(input) {
	const signals = /* @__PURE__ */ new Set();
	const recognitionOutputClasses = input.recognitionOutputClasses ?? getLastNumericShapeDimension(input.recognitionOutputShape);
	if (recognitionOutputClasses === PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES) signals.add(`recognitionOutputClasses:${PPOCRV6_TINY_RECOGNITION_OUTPUT_CLASSES}`);
	if (input.dictionaryLength === PPOCRV6_TINY_DICTIONARY_LENGTH) signals.add(`dictionaryLength:${PPOCRV6_TINY_DICTIONARY_LENGTH}`);
	if (signals.size > 0) return createInferenceResult("PP-OCRv6_tiny", "high", Array.from(signals));
	if (recognitionOutputClasses === PPOCRV6_RECOGNITION_OUTPUT_CLASSES) signals.add(`recognitionOutputClasses:${PPOCRV6_RECOGNITION_OUTPUT_CLASSES}`);
	if (input.dictionaryLength === PPOCRV6_DICTIONARY_LENGTH) signals.add(`dictionaryLength:${PPOCRV6_DICTIONARY_LENGTH}`);
	if (signals.size > 0) return createInferenceResult("PP-OCRv6_small", "medium", Array.from(signals));
	if (recognitionOutputClasses === PPOCRV5_RECOGNITION_OUTPUT_CLASSES) signals.add(`recognitionOutputClasses:${PPOCRV5_RECOGNITION_OUTPUT_CLASSES}`);
	if (input.dictionaryLength === PPOCRV5_DICTIONARY_LENGTH) signals.add(`dictionaryLength:${PPOCRV5_DICTIONARY_LENGTH}`);
	if (signals.size > 0) return createInferenceResult("PP-OCRv5", "medium", Array.from(signals));
}
function collectInferenceSignals(input) {
	return [
		input.modelName,
		input.fileName,
		input.detectionModelFileName,
		input.recognitionModelFileName,
		input.dictionaryName,
		input.dictionaryFileName
	].filter((signal) => Boolean(signal));
}
function getLastNumericShapeDimension(shape) {
	if (!shape) return;
	for (let index = shape.length - 1; index >= 0; index -= 1) {
		const dimension = shape[index];
		if (typeof dimension === "number" && Number.isFinite(dimension) && dimension > 0) return dimension;
	}
}
function normalizeInferenceSignal(signal) {
	return signal.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function createInferenceResult(name, confidence, signals) {
	return {
		name,
		confidence,
		signals: [...signals]
	};
}
//#endregion
//#region src/pipelines/ocr.ts
/**
* PaddleOcrService - Provides OCR functionality using PaddleOCR models
*
* This service can be used either as a singleton or as separate instances
* depending on your application needs.
*/
var PaddleOcrService = class PaddleOcrService {
	/**
	* Create a new PaddleOcrService instance
	* @param options Optional configuration options
	*/
	constructor(options) {
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "detectionSession", null);
		_defineProperty(this, "detectionService", null);
		_defineProperty(this, "recognitionSession", null);
		_defineProperty(this, "recognitionService", null);
		_defineProperty(this, "textlineOrientationSession", null);
		_defineProperty(this, "textlineOrientationService", null);
		if (!options?.ort) throw new Error("PaddleOcrService requires the 'ort' option to be set with onnxruntime-node or onnxruntime-wen.");
		const presetOptions = getModelPresetOptions(options.modelPreset);
		this.options = {
			...DEFAULT_PADDLE_OPTIONS,
			...presetOptions,
			...options || {},
			detection: {
				...DEFAULT_PADDLE_OPTIONS.detection,
				...presetOptions.detection,
				...options.detection
			},
			recognition: {
				...DEFAULT_PADDLE_OPTIONS.recognition,
				...presetOptions.recognition,
				...options.recognition
			},
			textlineOrientation: options.textlineOrientation ? {
				...DEFAULT_TEXTLINE_ORIENTATION_OPTIONS,
				...options.textlineOrientation
			} : void 0
		};
	}
	/**
	* Initialize the OCR service by loading models
	*/
	async initialize() {
		const ort = this.options.ort;
		if (!ort) throw new Error("PaddleOcrService requires the 'ort' option to be set with onnxruntime-node or onnxruntime-wen.");
		const detectionModelBuffer = this.options.detection?.modelBuffer;
		if (!detectionModelBuffer) throw new Error("Detection model buffer is required. Please provide a valid ONNX model.");
		this.detectionSession = await ort.InferenceSession.create(detectionModelBuffer);
		const { modelBuffer: _detectionModelBuffer, ...detectionOptions } = this.options.detection ?? {};
		this.detectionService = new DetectionService(ort, this.detectionSession, detectionOptions);
		const recognitionModelBuffer = this.options.recognition?.modelBuffer;
		if (!recognitionModelBuffer) throw new Error("Recognition model buffer is required. Please provide a valid ONNX model.");
		this.recognitionSession = await ort.InferenceSession.create(recognitionModelBuffer);
		const { modelBuffer: _recognitionModelBuffer, ...recognitionOptions } = this.options.recognition ?? {};
		this.recognitionService = new RecognitionService(ort, this.recognitionSession, recognitionOptions);
		const textlineOrientationModelBuffer = this.options.textlineOrientation?.modelBuffer;
		if (textlineOrientationModelBuffer) {
			this.textlineOrientationSession = await ort.InferenceSession.create(textlineOrientationModelBuffer);
			const { modelBuffer: _textlineOrientationModelBuffer, enabled: _enabled, threshold: _threshold, ...textlineOrientationOptions } = this.options.textlineOrientation ?? {};
			this.textlineOrientationService = new ImageClassificationService(ort, this.textlineOrientationSession, textlineOrientationOptions);
		}
	}
	/**
	* Check if the service is initialized with models loaded
	*/
	isInitialized() {
		return this.detectionSession !== null && this.recognitionSession !== null;
	}
	/**
	* Create a new instance instead of using the singleton
	* This is useful when you need multiple instances with different models
	* @param options Configuration options for this specific instance
	*/
	static async createInstance(options) {
		const instance = new PaddleOcrService(options);
		await instance.initialize();
		return instance;
	}
	resolveDetectionRuntimeOptions(options = {}) {
		const { modelBuffer: _modelBuffer, ...instanceOptions } = this.options.detection ?? {};
		return {
			...DEFAULT_DETECTION_OPTIONS,
			...instanceOptions,
			...options
		};
	}
	resolveRecognitionRuntimeOptions(options = {}) {
		const { modelBuffer: _modelBuffer, ...instanceOptions } = this.options.recognition ?? {};
		return {
			...DEFAULT_RECOGNITION_OPTIONS,
			...instanceOptions,
			...options
		};
	}
	resolveRecognitionOrderingOptions(options = {}) {
		return {
			...DEFAULT_RECOGNITION_ORDERING_OPTIONS,
			...options
		};
	}
	resolveTextlineOrientationOptions(options) {
		if (!this.options.textlineOrientation && !options) return;
		const { modelBuffer: _textlineOrientationModelBuffer, ...instanceOptions } = this.options.textlineOrientation ?? {};
		return {
			...DEFAULT_TEXTLINE_ORIENTATION_OPTIONS,
			...instanceOptions,
			...options
		};
	}
	formatDictionaryRequirement(preset) {
		const { dictionary } = preset;
		return ` The ${preset.name} preset expects ${dictionary.fileName} with ${dictionary.dictionaryLength} entries and ${dictionary.recognitionOutputClasses} CTC output classes.`;
	}
	/**
	* Runs object detection on the provided image input, then performs
	* recognition on the detected regions.
	*
	* @param image - The raw image data as an ArrayBuffer or Canvas.
	* @param options - Optional configuration for the recognition output, e.g., `{ flatten: true }`.
	* @return A promise that resolves to the OCR result, either grouped by lines or as a flat list.
	*/
	async recognize(input, options) {
		if (!this.detectionService || !this.recognitionService) throw new Error("PaddleOcrService is not initialized. Please call initialize() first.");
		const detectionRuntimeOptions = this.resolveDetectionRuntimeOptions(options?.detection);
		const recognitionRuntimeOptions = this.resolveRecognitionRuntimeOptions(options?.recognition);
		const orderingOptions = this.resolveRecognitionOrderingOptions(options?.ordering);
		const textlineOrientationOptions = this.resolveTextlineOrientationOptions(options?.textlineOrientation);
		if (textlineOrientationOptions?.enabled && !this.textlineOrientationService) throw new Error("Textline orientation correction requires textlineOrientation.modelBuffer in createInstance().");
		if (!recognitionRuntimeOptions.charactersDictionary?.length) {
			const preset = this.options.modelPreset ? getModelPreset(this.options.modelPreset) : void 0;
			throw new Error(`Recognition charactersDictionary is required. Provide it in createInstance({ recognition }) or recognize(_, { recognition }).${preset ? this.formatDictionaryRequirement(preset) : ""}`);
		}
		let image = normalizeInputToRgb(input);
		const padding = detectionRuntimeOptions.padding;
		if (padding) image = image.padding({
			padding,
			color: [
				255,
				255,
				255
			]
		});
		const detection = await this.detectionService.run(image, {
			...detectionRuntimeOptions,
			onProgress: options?.onProgress
		});
		const recognitionOptions = {
			...options,
			detection: detectionRuntimeOptions,
			recognition: recognitionRuntimeOptions,
			ordering: orderingOptions
		};
		if (textlineOrientationOptions) recognitionOptions.textlineOrientation = textlineOrientationOptions;
		if (this.textlineOrientationService) recognitionOptions.textlineOrientationClassifier = this.textlineOrientationService;
		return await this.recognitionService.run(image, detection, recognitionOptions);
	}
	/**
	* Processes raw recognition results to generate the final text,
	* grouped lines, and overall confidence.
	*/
	processRecognition(recognition, options) {
		const result = {
			text: "",
			lines: [],
			confidence: 0
		};
		const processOptions = {
			...DEFAULT_PROCESS_RECOGNITION_OPTIONS,
			...options
		};
		const recognitionScoreThreshold = processOptions.recognitionScoreThreshold ?? DEFAULT_PROCESS_RECOGNITION_OPTIONS.recognitionScoreThreshold;
		const filteredRecognition = recognition.filter((item) => item.confidence >= recognitionScoreThreshold);
		if (!filteredRecognition.length) return result;
		result.confidence = filteredRecognition.reduce((sum, r) => sum + r.confidence, 0) / filteredRecognition.length;
		let currentLine = [filteredRecognition[0]];
		let fullText = filteredRecognition[0].text;
		let avgHeight = filteredRecognition[0].box.height;
		for (let i = 1; i < filteredRecognition.length; i++) {
			const current = filteredRecognition[i];
			const previous = filteredRecognition[i - 1];
			if (Math.abs(current.box.y - previous.box.y) <= avgHeight * processOptions.lineMergeThresholdRatio) {
				currentLine.push(current);
				fullText += ` ${current.text}`;
				avgHeight = currentLine.reduce((sum, r) => sum + r.box.height, 0) / currentLine.length;
			} else {
				result.lines.push([...currentLine]);
				fullText += `\n${current.text}`;
				currentLine = [current];
				avgHeight = current.box.height;
			}
		}
		if (currentLine.length > 0) result.lines.push([...currentLine]);
		result.text = fullText;
		return result;
	}
	/**
	* Releases the onnx runtime session for both
	* detection and recognition model.
	*/
	async destroy() {
		await this.detectionSession?.release();
		await this.recognitionSession?.release();
	}
};
//#endregion
//#region src/pipelines/structure.ts
const DEFAULT_STRUCTURE_OPTIONS = {
	documentOrientation: {
		enabled: true,
		threshold: 0
	},
	textImageUnwarping: { enabled: true },
	regionDetection: { enabled: true },
	layout: {
		enabled: true,
		fallbackRegionType: "table"
	},
	readingOrder: { enabled: true },
	ocr: {
		enabled: true,
		stripStyleTokens: true
	},
	table: { enabled: true },
	formula: { enabled: true },
	seal: { enabled: true },
	markdown: { enabled: true },
	includeRegionImage: false
};
const TABLE_REGION_TYPES = new Set(["table"]);
const FORMULA_REGION_TYPES = new Set(["formula", "equation"]);
const SEAL_REGION_TYPES = new Set(["seal"]);
const STYLE_TOKENS = [
	"<strike>",
	"</strike>",
	"<sup>",
	"</sub>",
	"<b>",
	"</b>",
	"<sub>",
	"</sup>",
	"<overline>",
	"</overline>",
	"<underline>",
	"</underline>",
	"<i>",
	"</i>"
];
var PaddleStructureService = class PaddleStructureService {
	constructor(services = {}, options = {}) {
		_defineProperty(this, "services", void 0);
		_defineProperty(this, "options", void 0);
		this.services = { ...services };
		this.options = mergeStructureOptions(DEFAULT_STRUCTURE_OPTIONS, options);
	}
	static async createInstance(options) {
		if (!options.ort) throw new Error("PaddleStructureService.createInstance requires the 'ort' option to be set.");
		const services = {};
		if (options.documentOrientation?.modelBuffer) services.documentOrientation = await createImageClassificationService$1(options.ort, options.documentOrientation, "PP-LCNet_x1_0_doc_ori");
		if (options.textImageUnwarping?.modelBuffer) services.textImageUnwarping = await createTextImageUnwarpingService(options.ort, options.textImageUnwarping, "UVDoc");
		if (options.regionDetection?.modelBuffer) services.regionDetection = await createObjectDetectionService$1(options.ort, options.regionDetection, "PP-DocBlockLayout");
		if (options.layout?.modelBuffer) services.layout = await createObjectDetectionService$1(options.ort, options.layout, "PP-DocLayout_plus-L");
		if (options.ocr?.detection?.modelBuffer || options.ocr?.recognition?.modelBuffer) services.ocr = await PaddleOcrService.createInstance({
			...options.ocr,
			ort: options.ort
		});
		if (options.tableOcr?.detection?.modelBuffer || options.tableOcr?.recognition?.modelBuffer) services.tableOcr = await PaddleOcrService.createInstance({
			...options.tableOcr,
			ort: options.ort
		});
		if (options.tableStructure?.modelBuffer) services.tableStructure = await createTableStructureService$1(options.ort, options.tableStructure, "SLANet");
		if (options.formulaRecognition?.modelBuffer) services.formulaRecognition = await createFormulaRecognitionService(options.ort, options.formulaRecognition, "PP-FormulaNet_plus-M");
		if (options.sealTextDetection?.modelBuffer) services.sealTextDetection = await createTextDetectionService(options.ort, options.sealTextDetection, "PP-OCRv4_mobile_seal_det");
		if (options.sealTextRecognition?.modelBuffer) services.sealTextRecognition = await createTextRecognitionService(options.ort, options.sealTextRecognition, "PP-OCRv6_small_rec");
		if (Object.keys(services).length === 0) throw new Error("PaddleStructureService.createInstance requires at least one modelBuffer or OCR model pair.");
		return new PaddleStructureService(services, options.options);
	}
	async run(input, options = {}) {
		const runtimeOptions = mergeStructureOptions(this.options, options);
		let image = normalizeInputToRgb(input);
		const documentOrientation = await this.runDocumentOrientation(image, runtimeOptions);
		if (documentOrientation.result?.angle) image = rotateImageByAngle(image, documentOrientation.result.angle);
		const textImageUnwarping = await this.runTextImageUnwarping(image, runtimeOptions);
		if (textImageUnwarping.result) image = normalizeInputToRgb(textImageUnwarping.result.doctrImage);
		const regionDetection = await this.runRegionDetection(image, runtimeOptions);
		const layout = await this.runLayout(image, runtimeOptions);
		const readingOrder = this.runReadingOrder(layout.result ?? [], image, runtimeOptions);
		const pageOcr = await this.runPageOcr(image, runtimeOptions);
		const regions = [];
		for (const region of readingOrder.result ?? []) regions.push(await this.runRegion(image, region, pageOcr.result, runtimeOptions));
		const markdown = this.runMarkdown(regions, runtimeOptions);
		return {
			image: imageToInput(image),
			stages: {
				documentOrientation,
				textImageUnwarping,
				regionDetection,
				layout,
				readingOrder,
				ocr: pageOcr,
				markdown
			},
			regionDetections: regionDetection.result ?? [],
			regions,
			markdown: markdown.result
		};
	}
	async runDocumentOrientation(image, options) {
		if (!isEnabled(options.documentOrientation)) return {
			status: "skipped",
			reason: "document orientation disabled"
		};
		if (!this.services.documentOrientation) return {
			status: "skipped",
			reason: "document orientation service not configured"
		};
		const { enabled: _enabled, threshold, ...classificationOptions } = options.documentOrientation ?? {};
		const topResult = (await this.services.documentOrientation.run(image, classificationOptions))[0];
		if (!topResult || topResult.score < (threshold ?? 0)) return {
			status: "skipped",
			reason: "document orientation score below threshold"
		};
		const angle = parseOrientationAngle(topResult.label);
		if (angle === 0) return {
			status: "applied",
			result: {
				classification: topResult,
				angle
			}
		};
		return {
			status: "applied",
			result: {
				classification: topResult,
				angle
			}
		};
	}
	async runTextImageUnwarping(image, options) {
		if (!isEnabled(options.textImageUnwarping)) return {
			status: "skipped",
			reason: "text image unwarping disabled"
		};
		if (!this.services.textImageUnwarping) return {
			status: "skipped",
			reason: "text image unwarping service not configured"
		};
		const { enabled: _enabled, ...unwarpingOptions } = options.textImageUnwarping ?? {};
		return {
			status: "applied",
			result: await this.services.textImageUnwarping.run(image, unwarpingOptions)
		};
	}
	async runLayout(image, options) {
		const fallbackRegionType = options.layout?.fallbackRegionType ?? "table";
		if (!isEnabled(options.layout)) return fallbackRegionType === false ? {
			status: "skipped",
			reason: "layout disabled",
			result: []
		} : {
			status: "skipped",
			reason: "layout disabled",
			result: [createFullPageRegion(image, fallbackRegionType)]
		};
		if (!this.services.layout) return fallbackRegionType === false ? {
			status: "skipped",
			reason: "layout service not configured",
			result: []
		} : {
			status: "skipped",
			reason: "layout service not configured",
			result: [createFullPageRegion(image, fallbackRegionType)]
		};
		const { enabled: _enabled, fallbackRegionType: _fallbackRegionType, ...layoutOptions } = options.layout ?? {};
		return {
			status: "applied",
			result: (await this.services.layout.run(image, layoutOptions)).map((box) => objectBoxToRegion(box, image)).filter((region) => Boolean(region))
		};
	}
	runReadingOrder(regions, image, options) {
		if (!isEnabled(options.readingOrder)) return {
			status: "skipped",
			reason: "reading order disabled",
			result: assignBlockOrder(regions)
		};
		return {
			status: "applied",
			result: assignBlockOrder(sortLayoutRegionsByReadingOrder(regions, image.width))
		};
	}
	async runRegionDetection(image, options) {
		if (!isEnabled(options.regionDetection)) return {
			status: "skipped",
			reason: "region detection disabled",
			result: []
		};
		if (!this.services.regionDetection) return {
			status: "skipped",
			reason: "region detection service not configured",
			result: []
		};
		const { enabled: _enabled, ...regionDetectionOptions } = options.regionDetection ?? {};
		return {
			status: "applied",
			result: (await this.services.regionDetection.run(image, regionDetectionOptions)).map((box) => objectBoxToRegion(box, image)).filter((region) => Boolean(region))
		};
	}
	async runPageOcr(image, options) {
		if (!isEnabled(options.ocr)) return {
			status: "skipped",
			reason: "ocr disabled"
		};
		if (!this.services.ocr) return {
			status: "skipped",
			reason: "ocr service not configured"
		};
		const { enabled: _enabled, stripStyleTokens: _stripStyleTokens, ...ocrOptions } = options.ocr ?? {};
		return {
			status: "applied",
			result: sanitizeRecognitionResults(await this.services.ocr.recognize(image, ocrOptions), shouldStripStyleTokens(options.ocr))
		};
	}
	async runRegion(image, region, pageOcr, options) {
		const crop = cropRegion(image, region.bbox);
		const base = createRegionBase(region, crop, options.includeRegionImage);
		if (TABLE_REGION_TYPES.has(region.type)) return {
			...base,
			...await this.runTableRegion(crop, options)
		};
		if (FORMULA_REGION_TYPES.has(region.type)) return {
			...base,
			...await this.runFormulaRegion(crop, options)
		};
		if (SEAL_REGION_TYPES.has(region.type)) return {
			...base,
			...await this.runSealRegion(crop, options)
		};
		const filteredOcr = pageOcr ? filterRecognitionByRegion(pageOcr, region.bbox).map((result) => localizeRecognitionResult(result, region.bbox)) : void 0;
		return filteredOcr ? {
			...base,
			status: "applied",
			ocr: filteredOcr
		} : {
			...base,
			status: "skipped",
			reason: "ocr service not configured"
		};
	}
	async runTableRegion(crop, options) {
		if (!isEnabled(options.table)) return {
			status: "skipped",
			reason: "table recognition disabled"
		};
		if (!this.services.tableStructure) return {
			status: "skipped",
			reason: "table structure service not configured"
		};
		const { enabled: _enabled, ocr: tableOcrOptions, ...tableOptions } = options.table ?? {};
		const structure = await this.services.tableStructure.run(crop, tableOptions);
		const tableOcrService = this.services.tableOcr ?? this.services.ocr;
		if (!tableOcrService || !isEnabled(tableOcrOptions ?? options.ocr)) return {
			status: "applied",
			table: { structure }
		};
		const { enabled: _ocrEnabled, stripStyleTokens: _stripStyleTokens, ...ocrOptions } = tableOcrOptions ?? options.ocr ?? {};
		const ocr = sanitizeRecognitionResults(await tableOcrService.recognize(crop, ocrOptions), shouldStripStyleTokens(tableOcrOptions ?? options.ocr));
		return {
			status: "applied",
			table: {
				structure,
				ocr,
				matched: matchTableStructureToOcr(structure, ocr)
			}
		};
	}
	async runFormulaRegion(crop, options) {
		if (!isEnabled(options.formula)) return {
			status: "skipped",
			reason: "formula recognition disabled"
		};
		if (!this.services.formulaRecognition) return {
			status: "skipped",
			reason: "formula recognition service not configured"
		};
		const { enabled: _enabled, ...formulaOptions } = options.formula ?? {};
		return {
			status: "applied",
			formula: await this.services.formulaRecognition.run(crop, formulaOptions)
		};
	}
	async runSealRegion(crop, options) {
		if (!isEnabled(options.seal)) return {
			status: "skipped",
			reason: "seal recognition disabled"
		};
		if (!this.services.sealTextDetection || !this.services.sealTextRecognition) return {
			status: "skipped",
			reason: "seal text detection or recognition service not configured"
		};
		const boxes = await this.services.sealTextDetection.run(crop, options.seal?.detection);
		return {
			status: "applied",
			seal: {
				boxes,
				recognition: await this.services.sealTextRecognition.run(crop, boxes, options.seal?.recognition)
			}
		};
	}
	runMarkdown(regions, options) {
		if (!isEnabled(options.markdown)) return {
			status: "skipped",
			reason: "markdown disabled"
		};
		return {
			status: "applied",
			result: { text: createStructureMarkdown(regions, options.markdown?.ignoreLabels) }
		};
	}
};
async function createImageClassificationService$1(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new ImageClassificationService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getImageClassificationPresetOptions(preset),
		...runtimeOptions
	});
}
async function createTextImageUnwarpingService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new TextImageUnwarpingService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getTextImageUnwarpingPresetOptions(preset),
		...runtimeOptions
	});
}
async function createObjectDetectionService$1(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new ObjectDetectionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getObjectDetectionPresetOptions(preset),
		...runtimeOptions
	});
}
async function createTableStructureService$1(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new TableStructureRecognitionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getTableStructureRecognitionPresetOptions(preset),
		...runtimeOptions
	});
}
async function createFormulaRecognitionService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new FormulaRecognitionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getFormulaRecognitionPresetOptions(preset),
		...runtimeOptions
	});
}
async function createTextDetectionService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new DetectionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getTextDetectionPresetOptions(preset),
		...runtimeOptions
	});
}
async function createTextRecognitionService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new RecognitionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getTextRecognitionPresetOptions(preset),
		...runtimeOptions
	});
}
function mergeStructureOptions(defaults, options) {
	return {
		...defaults,
		...options,
		documentOrientation: {
			...defaults.documentOrientation,
			...options.documentOrientation
		},
		textImageUnwarping: {
			...defaults.textImageUnwarping,
			...options.textImageUnwarping
		},
		regionDetection: {
			...defaults.regionDetection,
			...options.regionDetection
		},
		layout: {
			...defaults.layout,
			...options.layout
		},
		readingOrder: {
			...defaults.readingOrder,
			...options.readingOrder
		},
		ocr: {
			...defaults.ocr,
			...options.ocr
		},
		table: {
			...defaults.table,
			...options.table,
			ocr: options.table?.ocr ? {
				...defaults.table?.ocr,
				...options.table.ocr
			} : defaults.table?.ocr
		},
		formula: {
			...defaults.formula,
			...options.formula
		},
		seal: {
			...defaults.seal,
			...options.seal
		},
		markdown: {
			...defaults.markdown,
			...options.markdown
		}
	};
}
function isEnabled(options) {
	return options?.enabled !== false;
}
function shouldStripStyleTokens(options) {
	return options?.stripStyleTokens !== false;
}
function parseOrientationAngle(label) {
	const match = label.match(/(?:^|[^0-9])(90|180|270)(?:[^0-9]|$)/);
	return match ? Number(match[1]) : 0;
}
function rotateImageByAngle(image, angle) {
	if (angle === 90) return image.rotateCounterClockwise();
	if (angle === 180) return image.rotate180();
	if (angle === 270) return image.rotateClockwise();
	return image;
}
function createFullPageRegion(image, type) {
	return {
		type,
		label: type,
		score: 0,
		bbox: [
			0,
			0,
			image.width,
			image.height
		]
	};
}
function assignBlockOrder(regions) {
	return regions.map((region, index) => ({
		...region,
		blockOrder: index
	}));
}
function sortLayoutRegionsByReadingOrder(regions, width) {
	const numBoxes = regions.length;
	if (numBoxes === 0) return [];
	if (numBoxes === 1) return [{
		...regions[0],
		layout: "single"
	}];
	const boxes = [...regions].sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]).map((region) => ({ ...region }));
	const sortedRegions = [];
	let leftColumn = [];
	let rightColumn = [];
	let index = 0;
	while (index < numBoxes) {
		const region = boxes[index];
		if (index === numBoxes - 1) {
			if (region.bbox[1] > boxes[index - 1].bbox[3] && region.bbox[0] < width / 2 && region.bbox[2] > width / 2) sortedRegions.push(...leftColumn, ...rightColumn, {
				...region,
				layout: "single"
			});
			else if (region.bbox[2] > width / 2) {
				rightColumn.push({
					...region,
					layout: "double"
				});
				sortedRegions.push(...leftColumn, ...rightColumn);
			} else if (region.bbox[0] < width / 2) {
				leftColumn.push({
					...region,
					layout: "double"
				});
				sortedRegions.push(...leftColumn, ...rightColumn);
			}
			leftColumn = [];
			rightColumn = [];
			break;
		}
		if (region.bbox[0] < width / 4 && region.bbox[2] < 3 * width / 4) {
			leftColumn.push({
				...region,
				layout: "double"
			});
			index += 1;
		} else if (region.bbox[0] > width / 4 && region.bbox[2] > width / 2) {
			rightColumn.push({
				...region,
				layout: "double"
			});
			index += 1;
		} else {
			sortedRegions.push(...leftColumn, ...rightColumn, {
				...region,
				layout: "single"
			});
			leftColumn = [];
			rightColumn = [];
			index += 1;
		}
	}
	if (leftColumn.length) sortedRegions.push(...leftColumn);
	if (rightColumn.length) sortedRegions.push(...rightColumn);
	return sortedRegions;
}
function objectBoxToRegion(box, image) {
	const bbox = clipXyxy(box.coordinate, image);
	if (!bbox) return null;
	return {
		type: normalizeRegionType(box.label),
		label: box.label,
		score: box.score,
		bbox
	};
}
function normalizeRegionType(label) {
	const lower = label.toLowerCase().replace(/[\s-]+/g, "_");
	if (lower === "equation") return "formula";
	return lower;
}
function clipXyxy(coordinate, image) {
	const x1 = Math.max(0, Math.min(image.width, Math.floor(coordinate[0])));
	const y1 = Math.max(0, Math.min(image.height, Math.floor(coordinate[1])));
	const x2 = Math.max(0, Math.min(image.width, Math.ceil(coordinate[2])));
	const y2 = Math.max(0, Math.min(image.height, Math.ceil(coordinate[3])));
	if (x2 <= x1 || y2 <= y1) return null;
	return [
		x1,
		y1,
		x2,
		y2
	];
}
function cropRegion(image, bbox) {
	const [x1, y1, x2, y2] = bbox;
	return image.crop({
		x: x1,
		y: y1,
		width: x2 - x1,
		height: y2 - y1
	});
}
function createRegionBase(region, crop, includeRegionImage) {
	return {
		type: region.type,
		label: region.label,
		score: region.score,
		bbox: region.bbox,
		layout: region.layout,
		blockOrder: region.blockOrder,
		image: includeRegionImage ? imageToInput(crop) : void 0
	};
}
function imageToInput(image) {
	return {
		width: image.width,
		height: image.height,
		data: image.data
	};
}
function createStructureMarkdown(regions, ignoreLabels) {
	const ignored = new Set((ignoreLabels ?? []).map((label) => label.toLowerCase()));
	const chunks = [];
	for (const region of regions) {
		const type = region.type.toLowerCase();
		const label = region.label.toLowerCase();
		if (ignored.has(type) || ignored.has(label) || type === "header" || type === "footer") continue;
		const chunk = createRegionMarkdown(region, type);
		if (chunk) chunks.push(chunk);
	}
	return chunks.join("\n\n").replace(/\n{3,}/g, "\n\n");
}
function createRegionMarkdown(region, type) {
	if (type === "title") {
		const text = joinRecognitionText(region.ocr);
		return text ? `# ${text}` : void 0;
	}
	if (type === "table") return region.table?.matched?.fullHtml ?? region.table?.structure?.fullHtml ?? region.table?.matched?.html ?? region.table?.structure?.html;
	if (type === "formula" || type === "equation") return region.formula?.formula ? `$$${region.formula.formula}$$` : void 0;
	if (type === "seal") return joinRecognitionText(region.seal?.recognition);
	if (type === "text") return region.ocr?.length ? escapeMarkdownSpecialChars(mergeTextRegionLikeOfficial(region, region.ocr)) : void 0;
	return joinRecognitionText(region.ocr);
}
function joinRecognitionText(results) {
	return results?.map((result) => result.text).filter(Boolean).join(" ").trim() || void 0;
}
function escapeMarkdownSpecialChars(content) {
	let output = content;
	for (const char of [
		"*",
		"`",
		"~",
		"$"
	]) output = output.replaceAll(char, `\\${char}`);
	return output;
}
function mergeTextRegionLikeOfficial(region, lines) {
	return shouldMergeTextByHeadSpace(region, lines) ? mergeTextByHeadSpace(lines) : mergeTextByTailSpace(region, lines);
}
function shouldMergeTextByHeadSpace(region, lines) {
	const firstLine = lines[0];
	if (!firstLine) return false;
	const firstLineBox = boxToLocalPoints(firstLine.box);
	const firstLineX1 = firstLineBox[0].x;
	const firstLineHeight = Math.abs(firstLineBox[2].y - firstLineBox[0].y);
	return firstLineX1 - 0 > firstLineHeight && region.bbox[2] > region.bbox[0];
}
function mergeTextByHeadSpace(lines) {
	let text = "";
	let previousX;
	let firstLine = true;
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const lineBox = boxToLocalPoints(line.box);
		const x1 = lineBox[0].x;
		const height = Math.abs(lineBox[2].y - lineBox[0].y);
		if (index === 0) {
			text += line.text;
			previousX = x1;
			continue;
		}
		if (firstLine) if (previousX !== void 0 && Math.abs(previousX - x1) < height) {
			text += `\n\n${line.text}`;
			firstLine = true;
		} else {
			text += line.text;
			firstLine = false;
		}
		else if (previousX !== void 0 && Math.abs(previousX - x1) < height) {
			text += line.text;
			firstLine = false;
		} else {
			text += `\n\n${line.text}`;
			firstLine = true;
		}
		previousX = x1;
	}
	return text;
}
function mergeTextByTailSpace(region, lines) {
	let text = "";
	let firstLine = true;
	const width = region.bbox[2] - region.bbox[0];
	for (const line of lines) {
		const lineBox = boxToLocalPoints(line.box);
		const isFull = lineBox[2].x - lineBox[0].x >= width - Math.abs(lineBox[2].y - lineBox[0].y);
		if (firstLine) text += `\n\n${line.text}`;
		else text += line.text;
		firstLine = !isFull;
	}
	return text;
}
function boxToLocalPoints(box) {
	const points = box.polygon ?? box.points;
	if (points?.length >= 4) return [
		points[0],
		points[1],
		points[2],
		points[3]
	];
	return [
		{
			x: box.x,
			y: box.y
		},
		{
			x: box.x + box.width,
			y: box.y
		},
		{
			x: box.x + box.width,
			y: box.y + box.height
		},
		{
			x: box.x,
			y: box.y + box.height
		}
	];
}
function sanitizeRecognitionResults(results, stripStyleTokens) {
	if (!stripStyleTokens) return results;
	return results.map((result) => ({
		...result,
		text: stripTableStyleTokens(result.text)
	}));
}
function stripTableStyleTokens(text) {
	let output = text;
	for (const token of STYLE_TOKENS) output = output.replaceAll(token, "");
	return output;
}
function filterRecognitionByRegion(results, bbox) {
	return results.filter((result) => rectanglesIntersect(bbox, boxToXyxy(result.box)));
}
function rectanglesIntersect(a, b) {
	return !(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1]);
}
function boxToXyxy(box) {
	const points = box.polygon ?? box.points;
	if (points?.length) return pointsToXyxy(points);
	return [
		box.x,
		box.y,
		box.x + box.width,
		box.y + box.height
	];
}
function pointsToXyxy(points) {
	return [
		Math.min(...points.map((point) => point.x)),
		Math.min(...points.map((point) => point.y)),
		Math.max(...points.map((point) => point.x)),
		Math.max(...points.map((point) => point.y))
	];
}
function localizeRecognitionResult(result, regionBbox) {
	const [x1, y1] = regionBbox;
	return {
		...result,
		box: localizeBox(result.box, x1, y1)
	};
}
function localizeBox(box, x, y) {
	return {
		...box,
		x: box.x - x,
		y: box.y - y,
		points: box.points?.map((point) => localizePoint(point, x, y)),
		polygon: box.polygon?.map((point) => localizePoint(point, x, y))
	};
}
function localizePoint(point, x, y) {
	return {
		x: point.x - x,
		y: point.y - y
	};
}
//#endregion
//#region src/pipelines/table-recognition-v2-recovery.ts
function recoverTableHtmlFromCells(cellBoxes, ocrResults = []) {
	const boxes = cellBoxes.map((cell) => normalizeCellBox(cell.coordinate)).filter((box) => Boolean(box));
	if (!boxes.length) {
		const html = "<tbody></tbody>";
		return {
			html,
			fullHtml: createTableStructureHtmlDocument(html),
			cells: []
		};
	}
	const xLines = clusterGridLines(boxes.flatMap((box) => [box[0], box[2]]));
	const yLines = clusterGridLines(boxes.flatMap((box) => [box[1], box[3]]));
	const cells = boxes.map((box) => createCellBox(box, xLines, yLines, ocrResults)).sort((a, b) => a.rowStart - b.rowStart || a.columnStart - b.columnStart);
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
			text: cell.text
		}))
	};
}
function normalizeCellBox(coordinate) {
	const x1 = Math.min(coordinate[0], coordinate[2]);
	const y1 = Math.min(coordinate[1], coordinate[3]);
	const x2 = Math.max(coordinate[0], coordinate[2]);
	const y2 = Math.max(coordinate[1], coordinate[3]);
	if (x2 <= x1 || y2 <= y1) return null;
	return [
		x1,
		y1,
		x2,
		y2
	];
}
function clusterGridLines(values) {
	const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
	if (!sorted.length) return [];
	const tolerance = estimateLineTolerance(sorted);
	const clusters = [];
	for (const value of sorted) {
		const last = clusters[clusters.length - 1];
		if (!last || Math.abs(average(last) - value) > tolerance) clusters.push([value]);
		else last.push(value);
	}
	return clusters.map(average);
}
function estimateLineTolerance(sorted) {
	const gaps = [];
	for (let index = 1; index < sorted.length; index++) {
		const gap = sorted[index] - sorted[index - 1];
		if (gap > 1) gaps.push(gap);
	}
	if (!gaps.length) return 4;
	gaps.sort((a, b) => a - b);
	return Math.max(4, gaps[Math.floor(gaps.length / 2)] * .25);
}
function average(values) {
	return values.reduce((total, value) => total + value, 0) / values.length;
}
function createCellBox(box, xLines, yLines, ocrResults) {
	const columnStart = findNearestLineIndex(xLines, box[0]);
	const columnEnd = Math.max(columnStart + 1, findNearestLineIndex(xLines, box[2]));
	const rowStart = findNearestLineIndex(yLines, box[1]);
	return {
		box,
		rowStart,
		rowEnd: Math.max(rowStart + 1, findNearestLineIndex(yLines, box[3])),
		columnStart,
		columnEnd,
		text: matchOcrTextToCell(box, ocrResults)
	};
}
function findNearestLineIndex(lines, value) {
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
function matchOcrTextToCell(cell, ocrResults) {
	return ocrResults.filter((result) => isOcrCenterInsideCell(result, cell)).sort((a, b) => boxTop(a.box) - boxTop(b.box) || boxLeft(a.box) - boxLeft(b.box)).map((result) => result.text).join(" ").trim();
}
function isOcrCenterInsideCell(result, cell) {
	const [x1, y1, x2, y2] = normalizeOcrBox(result.box);
	const cx = (x1 + x2) / 2;
	const cy = (y1 + y2) / 2;
	return cx >= cell[0] && cx <= cell[2] && cy >= cell[1] && cy <= cell[3];
}
function boxTop(box) {
	return normalizeOcrBox(box)[1];
}
function boxLeft(box) {
	return normalizeOcrBox(box)[0];
}
function normalizeOcrBox(box) {
	if (Array.isArray(box)) {
		if (box.length === 4) return [
			Math.min(box[0], box[2]),
			Math.min(box[1], box[3]),
			Math.max(box[0], box[2]),
			Math.max(box[1], box[3])
		];
		if (box.length === 8) {
			const xs = [
				box[0],
				box[2],
				box[4],
				box[6]
			];
			const ys = [
				box[1],
				box[3],
				box[5],
				box[7]
			];
			return [
				Math.min(...xs),
				Math.min(...ys),
				Math.max(...xs),
				Math.max(...ys)
			];
		}
	}
	const points = box.polygon ?? box.points;
	if (points?.length) return [
		Math.min(...points.map((point) => point.x)),
		Math.min(...points.map((point) => point.y)),
		Math.max(...points.map((point) => point.x)),
		Math.max(...points.map((point) => point.y))
	];
	return [
		box.x,
		box.y,
		box.x + box.width,
		box.y + box.height
	];
}
function renderCellsToHtml(cells, rowCount) {
	const rows = [];
	for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
		const rowCells = cells.filter((cell) => cell.rowStart === rowIndex);
		if (!rowCells.length) continue;
		rows.push(`<tr>${rowCells.map(renderCellToHtml).join("")}</tr>`);
	}
	return `<tbody>${rows.join("")}</tbody>`;
}
function renderCellToHtml(cell) {
	const rowspan = cell.rowEnd - cell.rowStart;
	const colspan = cell.columnEnd - cell.columnStart;
	return `<td${[rowspan > 1 ? ` rowspan="${rowspan}"` : "", colspan > 1 ? ` colspan="${colspan}"` : ""].join("")}>${escapeHtml(cell.text)}</td>`;
}
function escapeHtml(text) {
	return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}
//#endregion
//#region src/pipelines/table-recognition-v2.ts
const DEFAULT_TABLE_RECOGNITION_V2_OPTIONS = {
	tableClassification: { enabled: true },
	ocr: { enabled: true },
	useE2eWiredTableRecModel: false,
	useE2eWirelessTableRecModel: false,
	useWiredTableCellsTransToHtml: false,
	useWirelessTableCellsTransToHtml: false,
	useOcrResultsWithTableCells: true
};
var TableRecognitionV2Service = class TableRecognitionV2Service {
	constructor(services = {}, options = {}) {
		_defineProperty(this, "services", void 0);
		_defineProperty(this, "options", void 0);
		this.services = { ...services };
		this.options = mergeTableRecognitionV2Options(DEFAULT_TABLE_RECOGNITION_V2_OPTIONS, options);
	}
	static async createInstance(options) {
		if (!options.ort) throw new Error("TableRecognitionV2Service.createInstance requires the 'ort' option to be set.");
		const services = {};
		if (options.tableClassification?.modelBuffer) services.tableClassification = await createImageClassificationService(options.ort, options.tableClassification, "PP-LCNet_x1_0_table_cls");
		if (options.wiredTableStructure?.modelBuffer) services.wiredTableStructure = await createTableStructureService(options.ort, options.wiredTableStructure, "SLANeXt_wired");
		if (options.wirelessTableStructure?.modelBuffer) services.wirelessTableStructure = await createTableStructureService(options.ort, options.wirelessTableStructure, "SLANeXt_wireless");
		if (options.wiredTableCellsDetection?.modelBuffer) services.wiredTableCellsDetection = await createObjectDetectionService(options.ort, options.wiredTableCellsDetection, "RT-DETR-L_wired_table_cell_det");
		if (options.wirelessTableCellsDetection?.modelBuffer) services.wirelessTableCellsDetection = await createObjectDetectionService(options.ort, options.wirelessTableCellsDetection, "RT-DETR-L_wireless_table_cell_det");
		if (options.ocr?.detection?.modelBuffer || options.ocr?.recognition?.modelBuffer) services.ocr = await PaddleOcrService.createInstance({
			...options.ocr,
			ort: options.ort
		});
		if (Object.keys(services).length === 0) throw new Error("TableRecognitionV2Service.createInstance requires at least one modelBuffer for table classification, table structure, table cell detection, or OCR.");
		return new TableRecognitionV2Service(services, options.options);
	}
	async run(input, options = {}) {
		const runtimeOptions = mergeTableRecognitionV2Options(this.options, options);
		const classification = await this.runTableClassification(input, runtimeOptions);
		const tableType = runtimeOptions.tableType ?? inferTableType(classification);
		const structure = await this.runTableStructure(input, tableType, runtimeOptions);
		const cellBoxes = await this.runTableCellsDetection(input, tableType, runtimeOptions);
		const ocr = await this.runOcr(input, runtimeOptions);
		const cellHtml = cellBoxes.length ? recoverTableHtmlFromCells(cellBoxes, runtimeOptions.useOcrResultsWithTableCells === false ? [] : ocr ?? []) : void 0;
		const matched = structure && ocr?.length && structure.bbox.length ? matchTableStructureToOcr(structure, ocr) : void 0;
		const predHtml = resolvePredHtml({
			tableType,
			structure,
			matched,
			cellHtml,
			options: runtimeOptions
		});
		if (!predHtml) throw new Error(`TableRecognitionV2Service could not produce predHtml for ${tableType} table. Configure table structure recognition or table cell detection.`);
		return {
			tableType,
			classification,
			structure,
			cellBoxes,
			cells: cellHtml?.cells ?? [],
			ocr,
			matched,
			predHtml,
			cellBoxList: cellBoxes.map((box) => [...box.coordinate]),
			tableOcrPred: ocr ? {
				text: ocr.map((item) => item.text),
				confidence: ocr.map((item) => item.confidence)
			} : void 0
		};
	}
	async runTableClassification(input, options) {
		if (options.tableType || options.tableClassification?.enabled === false) return;
		if (!this.services.tableClassification) return;
		const { enabled: _enabled, ...classificationOptions } = options.tableClassification ?? {};
		return (await this.services.tableClassification.run(input, classificationOptions))[0];
	}
	async runTableStructure(input, tableType, options) {
		const service = tableType === "wired" ? this.services.wiredTableStructure : this.services.wirelessTableStructure;
		if (!service) return;
		return service.run(input, tableType === "wired" ? options.wiredTableStructure : options.wirelessTableStructure);
	}
	async runTableCellsDetection(input, tableType, options) {
		const service = tableType === "wired" ? this.services.wiredTableCellsDetection : this.services.wirelessTableCellsDetection;
		if (!service) return [];
		return service.run(input, tableType === "wired" ? options.wiredTableCellsDetection : options.wirelessTableCellsDetection);
	}
	async runOcr(input, options) {
		if (options.ocr?.enabled === false || !this.services.ocr) return;
		const { enabled: _enabled, ...ocrOptions } = options.ocr ?? {};
		return this.services.ocr.recognize(input, ocrOptions);
	}
};
async function createImageClassificationService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new ImageClassificationService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getImageClassificationPresetOptions(preset),
		...runtimeOptions
	});
}
async function createTableStructureService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new TableStructureRecognitionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getTableStructureRecognitionPresetOptions(preset),
		...runtimeOptions
	});
}
async function createObjectDetectionService(ort, options, defaultPreset) {
	const { modelBuffer, preset = defaultPreset, ...runtimeOptions } = options;
	if (!modelBuffer) throw new Error(`${preset} modelBuffer is required.`);
	return new ObjectDetectionService(ort, await ort.InferenceSession.create(modelBuffer), {
		...getObjectDetectionPresetOptions(preset),
		...runtimeOptions
	});
}
function mergeTableRecognitionV2Options(defaults, options) {
	return {
		...defaults,
		...options,
		tableClassification: {
			...defaults.tableClassification,
			...options.tableClassification
		},
		ocr: {
			...defaults.ocr,
			...options.ocr
		}
	};
}
function inferTableType(classification) {
	return (classification?.label.toLowerCase())?.includes("wireless") ? "wireless" : "wired";
}
function resolvePredHtml(args) {
	const useCells = args.tableType === "wired" ? args.options.useWiredTableCellsTransToHtml : args.options.useWirelessTableCellsTransToHtml;
	const useE2e = args.tableType === "wired" ? args.options.useE2eWiredTableRecModel : args.options.useE2eWirelessTableRecModel;
	if (useCells && args.cellHtml) return args.cellHtml.fullHtml;
	if (useE2e && args.matched) return args.matched.fullHtml;
	if (useE2e && args.structure) return args.structure.fullHtml;
	if (args.matched) return args.matched.fullHtml;
	if (args.structure?.bbox.length || !args.cellHtml) return args.structure?.fullHtml;
	return args.cellHtml.fullHtml;
}
//#endregion
export { DEFAULT_DETECTION_OPTIONS, DEFAULT_IMAGE_CLASSIFICATION_OPTIONS, DEFAULT_PADDLE_OPTIONS, DEFAULT_PROCESS_RECOGNITION_OPTIONS, DEFAULT_RECOGNITION_OPTIONS, DEFAULT_RECOGNITION_ORDERING_OPTIONS, DEFAULT_TEXTLINE_ORIENTATION_OPTIONS, DetectionService, FORMULA_RECOGNITION_PRESETS, FormulaRecognitionService, IMAGE_CLASSIFICATION_PRESETS, Image, ImageClassificationService, MODEL_PRESETS, OBJECT_DETECTION_PRESETS, ObjectDetectionService, PaddleOcrService, PaddleStructureService, RecognitionService, TABLE_STRUCTURE_RECOGNITION_PRESETS, TEXT_DETECTION_PRESETS, TEXT_IMAGE_UNWARPING_PRESETS, TEXT_RECOGNITION_PRESETS, TableRecognitionV2Service, TableStructureRecognitionService, TextImageUnwarpingService, calculateFormulaCropBox, calculateTableStructureResizeParams, createFormulaRecognitionInputFeeds, createFormulaTokenizerVocabulary, createTableStructureHtmlDocument, createTableStructureInputFeeds, createTextImageUnwarpingInputFeeds, getFormulaRecognitionPreset, getFormulaRecognitionPresetOptions, getImageClassificationPreset, getImageClassificationPresetOptions, getModelPreset, getModelPresetOptions, getObjectDetectionPreset, getObjectDetectionPresetOptions, getTableStructureRecognitionPreset, getTableStructureRecognitionPresetOptions, getTextDetectionPreset, getTextDetectionPresetOptions, getTextImageUnwarpingPreset, getTextImageUnwarpingPresetOptions, getTextRecognitionPreset, getTextRecognitionPresetOptions, inferModelPreset, matchTableStructureToOcr, normalizeInputToRgb, postprocessFormulaRecognition, postprocessObjectDetection, postprocessTableStructure, postprocessTextImageUnwarping, preprocessFormulaRecognition, preprocessTableStructure, preprocessTextImageUnwarping, recoverTableHtmlFromCells };

//# sourceMappingURL=index.mjs.map