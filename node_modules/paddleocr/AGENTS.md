# paddleocr.js agent guide

这个仓库是一个轻量 TypeScript PaddleOCR / PaddleX ONNX runtime。目标是在不引入大型运行时依赖的前提下，尽量贴合官方 PaddleOCR / PaddleX 的预处理、后处理、模型 preset、模块能力、组合流水线和 examples 展示。

## 参考文档

1. [README.md](./README.md) / [README_zh.md](./README_zh.md)
    - 用户入口、API 口径、模型加载边界、支持能力和官方实现差异说明。
2. [examples/README.md](./examples/README.md) / [examples/README_zh.md](./examples/README_zh.md)
    - examples 的设计口径、输入图片、结果图、模块示例和流水线示例。
3. [paddleocr-js-onnx/README.md](./paddleocr-js-onnx/README.md) / [paddleocr-js-onnx/README_zh.md](./paddleocr-js-onnx/README_zh.md)
    - Hugging Face 模型仓说明、官方 ONNX 链接、转换资产下载位置和 examples 目录约定。

## 当前项目结构

- `src/core/`
    - 轻量图像、输入像素、ONNX metadata、轮廓和 Clipper-style offset 工具。
- `src/types/`
    - 运行时、模块和流水线的公共类型定义。
- `src/modules/`
    - 单模块 service、preset、preprocess、postprocess。
    - 当前包括 `text-detection`、`text-recognition`、`image-classification`、`object-detection`、`text-image-unwarping`、`table-structure`、`formula-recognition`。
- `src/pipelines/`
    - 高层组合流水线。
    - 当前包括 `PaddleOcrService`、`TableRecognitionV2Service`、`PaddleStructureService`。
- `examples/`
    - 面向用户接入的模块与流水线示例。`input/` 放共享样例图，`result/` 放发布展示效果图。
- `paddleocr-js-onnx/`
    - Hugging Face 模型仓的说明文件和上传 ignore 规则。源码仓只跟踪 README、`.gitignore`、`.gitattributes`，不提交 ONNX 二进制。

## 当前能力范围

- OCR 主链路：PP-OCRv5 mobile、PP-OCRv6 tiny/small 的 det + textline orientation + rec。
- 文本检测：DBPostProcess、quad/poly 输出、seal detection preset、轻量 polygon unclip。
- 文本识别：CTC decode、字典校验、batch max width ratio、固定输入宽度、阅读顺序排序和低置信过滤。
- 分类模块：文档方向、文本行方向、表格分类。
- 目标检测模块：PP-DocBlockLayout、PP-DocLayout、RT-DETR wired/wireless table cell 的导出框解析、NMS、merge/unclip。
- 文本图像矫正：UVDoc preprocess、raw service 和 DocTr 风格输出解码。
- 表格结构：SLANet / SLANeXt preset、结构 token 解码、cell bbox restore、HTML-like 输出和 OCR-to-cell 文本填入。
- 公式识别：PP-FormulaNet S/L、plus-S/M/L preset，UniMERNet 风格 preprocess，Nougat tokenizer id/logit decode。
- 流水线：OCR、Table Recognition V2、类 PP-Structure 文档解析、reading order 和 markdown/table/formula 区域输出。

## 重要设计边界

- 调用方负责传入图片像素。runtime 不解码 PNG/JPEG/PDF 页面，也不应新增图像 codec、大型 OpenCV、pyclipper 等运行时依赖。
- 模型文件由调用方加载为 `ArrayBuffer` 后传入。runtime 不读取固定模型目录，也不自动下载模型。
- OCR 字典、分类 label、公式 tokenizer 等文本资产由调用方加载并显式传入。
- 开发期脚本和验证依赖可以放在 examples 或 `tmp/`，但不能变成 runtime dependency。
- 新 preset 优先从官方 `inference.yml`、`inference.json`、ONNX metadata 或已验证模型导出信息推导，不凭相似模型猜默认值。
- 后处理遇到未知 tensor layout、缺失字典、输出 shape 不匹配时优先 fail-fast，不用模糊 fallback 掩盖设计问题。
- 官方依赖 OpenCV / pyclipper 的步骤只要求轻量高层等价。不能把 TypeScript 近似实现说成 bit-exact parity。
- 真实影响输出的逻辑优先同步：resize、normalize、channel order、DBPostProcess、CTC decode、排序、裁剪、unclip、NMS、table/formula/layout 后处理。

## Examples 口径

- examples 要像用户项目接入本库：加载 ONNX、加载字典/label/tokenizer、选择 preset 或 service、传入调用方像素、处理返回对象。
- examples 可以使用 `fast-png` 读取样例图片；这只是 examples 依赖，不代表 runtime 会解码图片。
- examples 通过 `PADDLEOCR_JS_ONNX_DIR` 查找外部模型目录，这是 examples 的运行约定，不是 runtime 约束。
- 新增或调整模块时，优先补对应 `examples/module/*/run.ts`；新增组合能力时补 `examples/pipeline/*/run.ts`。
- `examples/result/*.png` 是用户展示图，不是测试 golden snapshot。更新结果图时用 `bun examples/generate-results.ts`，必要时用 `--only` 或 `EXAMPLE_ONLY` 局部生成。

## 模型资产规则

- 源码仓和 npm 包不提交 ONNX 大文件。
- 官方已发布 ONNX 的模型，README 中链接到 PaddlePaddle 官方 Hugging Face 仓库，避免重复上传。
- 官方没有可用 ONNX 的转换资产放在独立 Hugging Face 仓 `paddleocr-js-onnx`。
- 父仓库只跟踪 `paddleocr-js-onnx/README*`、`.gitignore`、`.gitattributes`；不要把模型二进制加进父仓库。
- 本地验证模型可以放在被忽略的 `paddleocr-js-onnx/` 或 `assets/local/`，但不要作为 runtime dependency。

## 验证命令

- 常规文档或示例小改：至少运行 `npm run lint`。
- 影响 runtime、preset、preprocess、postprocess 或流水线：运行 `npm run lint`、`npm run build`、`npm test`。
- 影响 examples 结果展示：运行对应示例或 `bun examples/generate-results.ts --only <task>`，必要时重新生成 `examples/result/*.png`。
- 当前测试入口是 `npm test`，使用 Bun test；不要继续使用已移除的旧 `test:node` 脚本。
