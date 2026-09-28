declare const ImageToImagePipeline_base: new (options: ImagePipelineConstructorArgs) => ImageToImagePipelineType;
/**
 * @typedef {import('./_base.js').ImagePipelineConstructorArgs} ImagePipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').ImageInput} ImageInput
 */
/**
 * @typedef {ImagePipelineConstructorArgs & ImageToImagePipelineCallback & Disposable} ImageToImagePipelineType
 */
/**
 * @template T
 * @typedef {T extends ImageInput[] ? RawImage[] : RawImage} ImageToImagePipelineResult
 */
/**
 * @typedef {<T extends ImageInput | ImageInput[]>(images: T) => Promise<ImageToImagePipelineResult<T>>} ImageToImagePipelineCallback
 */
/**
 * Image-to-image pipeline using any `AutoModelForImageToImage`. This pipeline generates an image based on a previous image input.
 *
 * **Example:** Super-resolution with `Xenova/swin2SR-classical-sr-x2-64`
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const upscaler = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/butterfly.jpg';
 * const output = await upscaler(url);
 * // RawImage {
 * //   data: Uint8Array(786432) [ 41, 31, 24,  43, ... ],
 * //   width: 512,
 * //   height: 512,
 * //   channels: 3
 * // }
 * ```
 */
export class ImageToImagePipeline extends ImageToImagePipeline_base {
    _call(images: any): Promise<RawImage | RawImage[]>;
}
export type ImagePipelineConstructorArgs = import("./_base.js").ImagePipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ImageInput = import("./_base.js").ImageInput;
export type ImageToImagePipelineType = ImagePipelineConstructorArgs & ImageToImagePipelineCallback & Disposable;
export type ImageToImagePipelineResult<T> = T extends ImageInput[] ? RawImage[] : RawImage;
export type ImageToImagePipelineCallback = <T extends ImageInput | ImageInput[]>(images: T) => Promise<ImageToImagePipelineResult<T>>;
import { RawImage } from '../utils/image.js';
export {};
//# sourceMappingURL=image-to-image.d.ts.map