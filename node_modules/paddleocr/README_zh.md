# paddleocr.js

[English Documentation](./README.md)

一个轻量 TypeScript PaddleOCR / PaddleX ONNX 推理运行时。

这个库负责推理链路本身：预处理、ONNX Runtime 调用、后处理、模型 preset
以及高级 pipeline。它不内置 PNG/JPEG 解码、不内置 OpenCV、不内置 pyclipper，
也不随 npm 包发布模型二进制。你的应用负责加载图片像素和模型文件，然后把它们传给
这个 runtime。

## 支持能力

| 能力 | 用户 API |
| --- | --- |
| OCR det + 文本行方向 + rec | `PaddleOcrService` |
| 表格识别 Table Recognition V2 | `TableRecognitionV2Service` |
| 类 PP-Structure 文档解析 | `PaddleStructureService` |
| 文本检测 / 文本识别模块 | `DetectionService`, `RecognitionService` |
| 文档方向 / 文本行方向 / 表格分类 | `ImageClassificationService` |
| 版面 / 区域 / 表格单元格检测 | `ObjectDetectionService` |
| 表格结构识别 | `TableStructureRecognitionService` |
| 公式识别 | `FormulaRecognitionService` |
| 文本图像矫正 | `TextImageUnwarpingService` |

当前 preset 覆盖 PP-OCRv5、PP-OCRv6、文档方向分类、文本行方向分类、表格分类、
UVDoc、PP-DocBlockLayout、PP-DocLayout、SLANet、SLANeXt 有线/无线表格、
RT-DETR 表格单元格检测以及 PP-FormulaNet 系列。

## 安装

安装 runtime，并按运行环境选择 ONNX Runtime 后端：

```sh
npm install paddleocr onnxruntime-node
# 浏览器项目使用
npm install paddleocr onnxruntime-web
```

`onnxruntime-node` / `onnxruntime-web` 由你的应用提供，所以同一套 runtime 可以跑在
Node.js、Bun 和浏览器中。

## 模型文件

源码仓库和 npm 包都不包含模型二进制。

官方已经发布 ONNX 的模型，优先去 PaddlePaddle 的 Hugging Face 仓库下载；官方没有可用
ONNX 的模型，可以从
[`x3zvawq/paddleocr-js-onnx`](https://huggingface.co/x3zvawq/paddleocr-js-onnx)
下载本项目转换和验证过的版本。

runtime 不读取固定模型目录。你的应用只需要把 ONNX 模型读成 `ArrayBuffer`，把 OCR 字典、
label 或公式 tokenizer 读成对应的数据结构，再传给 service 或模块 API。

## 最小 OCR 示例

下面的例子假设你的应用已经把图片解码成 `{ width, height, data }`，其中 `data`
可以是灰度、RGB 或 RGBA 像素。

```ts
import { readFile } from "node:fs/promises";
import * as ort from "onnxruntime-node";
import { PaddleOcrService } from "paddleocr";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
}

const [detModel, recModel, textlineModel, dictText] = await Promise.all([
    readFile("paddleocr-js-onnx/ppocr_v6_small/PP-OCRv6_small_det_infer.onnx"),
    readFile("paddleocr-js-onnx/ppocr_v6_small/PP-OCRv6_small_rec_infer.onnx"),
    readFile(
        "paddleocr-js-onnx/pp_lcnet_x0_25_textline_ori/PP-LCNet_x0_25_textline_ori_infer.onnx"
    ),
    readFile("paddleocr-js-onnx/ppocr_v6_small/ppocrv6_dict.txt", "utf-8"),
]);

const ocr = await PaddleOcrService.createInstance({
    ort,
    modelPreset: "PP-OCRv6_small",
    detection: {
        modelBuffer: toArrayBuffer(detModel),
    },
    recognition: {
        modelBuffer: toArrayBuffer(recModel),
        charactersDictionary: dictText.trimEnd().split(/\r?\n/),
    },
    textlineOrientation: {
        modelBuffer: toArrayBuffer(textlineModel),
        threshold: 0.9,
    },
});

const results = await ocr.recognize(inputPixels, {
    onProgress(event) {
        console.log(event.type, event.stage, event.progress);
    },
});

const text = ocr.processRecognition(results).text;
console.log(text);
```

## 图片输入

所有 runtime API 都接收调用方传入的像素：

```ts
interface ImageInput {
    width: number;
    height: number;
    data: Uint8Array;
}
```

`data` 可以是灰度、RGB 或 RGBA。runtime 会统一转为 RGB，并忽略 alpha 通道。
PNG、JPEG、PDF 页面等解码逻辑请放在你的应用侧，用你项目里合适的库处理。

## 示例

可运行的模块和流水线示例见 [`examples/README_zh.md`](./examples/README_zh.md)。
里面的 result 图都来自真实 ONNX 推理，方便你判断每个模块会返回什么。

| 流水线 | 效果图 |
| --- | --- |
| OCR | ![OCR 示例](./examples/result/pipeline-ocr.png) |
| Table Recognition V2 | ![Table Recognition V2 示例](./examples/result/pipeline-table-recognition-v2.png) |
| 类 PP-Structure 文档解析 | ![PP-Structure 示例](./examples/result/pipeline-pp-structure.png) |

## 进度事件

OCR 服务可以在检测和识别过程中回调进度：

```ts
await ocr.recognize(inputPixels, {
    onProgress(event) {
        if (event.type === "det") {
            console.log(event.stage, event.detectedCount);
        }
        if (event.type === "rec" && event.stage === "item") {
            console.log(event.result?.text);
        }
    },
});
```

事件约定：

- `det`：`preprocess`、`infer`、`postprocess`
- `rec`：`start`、每个文本框一次 `item`、最后 `complete`
- `rec/item`：包含当前 `result` 和 `box`
- `det/postprocess`：包含 `detectedCount`

## Preset 与覆盖参数

高级 OCR preset 名称：

`PP-OCRv5`、`PP-OCRv5_mobile`、`PP-OCRv5_server`、`PP-OCRv6`、
`PP-OCRv6_tiny`、`PP-OCRv6_small`、`PP-OCRv6_medium`。

preset 会配置通道顺序、resize、normalize、DB 后处理和 CTC 输出处理。你仍然可以在单次调用中覆盖
detection、recognition、ordering 和 textline orientation 参数。

```ts
const strictResults = await ocr.recognize(inputPixels, {
    detection: {
        textPixelThreshold: 0.3,
        boxScoreThreshold: 0.6,
        unclipRatio: 1.5,
        limitType: "max",
        maxSideLimit: 4000,
    },
    ordering: {
        sortByReadingOrder: true,
        sameLineThresholdRatio: 0.15,
    },
});
```

## 与官方实现的边界

runtime 在高层尽量贴合官方 PaddleOCR / PaddleX 的预处理和后处理，包括 OCR resize
策略、DB 后处理、CTC decode、文本行方向修正、layout/object NMS、表格结构解码、
公式 token 解码和 UVDoc 输出解码。

部分步骤是轻量等价实现，不追求和 OpenCV / pyclipper bit-exact。例如 OCR 旋转裁剪使用
TypeScript 透视采样，表格 span recovery 也是轻量 TypeScript 高层等价实现。这样可以保持
runtime 小而且跨平台。

## 浏览器说明

浏览器项目通常用 `fetch()` 加载 ONNX 文件，把 `ArrayBuffer` 传给 `createInstance()`。
Vite 示例见 [paddleocr-vite-example](https://github.com/X3ZvaWQ/paddleocr-vite-example)。

## 许可证

MIT
