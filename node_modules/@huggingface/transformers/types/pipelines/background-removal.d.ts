declare const BackgroundRemovalPipeline_base: new (options: ImagePipelineConstructorArgs) => BackgroundRemovalPipelineType;
/**
 * @typedef {import('./_base.js').ImagePipelineConstructorArgs} ImagePipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').ImageInput} ImageInput
 */
/**
 * @typedef {Object} BackgroundRemovalPipelineOptions Parameters specific to background removal pipelines.
 *
 * @typedef {ImagePipelineConstructorArgs & BackgroundRemovalPipelineCallback & Disposable} BackgroundRemovalPipelineType
 */
/**
 * @template T
 * @typedef {T extends ImageInput[] ? RawImage[] : RawImage} BackgroundRemovalPipelineResult
 */
/**
 * @typedef {<T extends ImageInput | ImageInput[]>(images: T, options?: BackgroundRemovalPipelineOptions) => Promise<BackgroundRemovalPipelineResult<T>>} BackgroundRemovalPipelineCallback
 */
/**
 * Background removal pipeline using compatible image segmentation models.
 * This pipeline removes the backgrounds of images.
 *
 * **Example:** Perform background removal with `Xenova/modnet`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const segmenter = await pipeline('background-removal', 'Xenova/modnet');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/portrait-of-woman_small.jpg';
 * const output = await segmenter(url);
 * // RawImage { data: Uint8ClampedArray(648000) [ ... ], width: 360, height: 450, channels: 4 }
 * ```
 */
export class BackgroundRemovalPipeline extends BackgroundRemovalPipeline_base {
    _call(images: any, options?: {}): Promise<RawImage | RawImage[]>;
}
export type ImagePipelineConstructorArgs = import("./_base.js").ImagePipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ImageInput = import("./_base.js").ImageInput;
/**
 * Parameters specific to background removal pipelines.
 */
export type BackgroundRemovalPipelineOptions = any;
export type BackgroundRemovalPipelineType = ImagePipelineConstructorArgs & BackgroundRemovalPipelineCallback & Disposable;
export type BackgroundRemovalPipelineResult<T> = T extends ImageInput[] ? RawImage[] : RawImage;
export type BackgroundRemovalPipelineCallback = <T extends ImageInput | ImageInput[]>(images: T, options?: BackgroundRemovalPipelineOptions) => Promise<BackgroundRemovalPipelineResult<T>>;
import { RawImage } from '../utils/image.js';
export {};
//# sourceMappingURL=background-removal.d.ts.map