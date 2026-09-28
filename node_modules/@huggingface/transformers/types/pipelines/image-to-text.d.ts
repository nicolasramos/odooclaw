declare const ImageToTextPipeline_base: new (options: TextImagePipelineConstructorArgs) => ImageToTextPipelineType;
/**
 * @typedef {import('./_base.js').TextImagePipelineConstructorArgs} TextImagePipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').ImageInput} ImageInput
 */
/**
 * @typedef {Object} ImageToTextSingle
 * @property {string} generated_text The generated text.
 * @typedef {ImageToTextSingle[]} ImageToTextOutput
 *
 * @typedef {TextImagePipelineConstructorArgs & ImageToTextPipelineCallback & Disposable} ImageToTextPipelineType
 */
/**
 * @template T
 * @typedef {T extends ImageInput[] ? ImageToTextOutput[] : ImageToTextOutput} ImageToTextPipelineResult
 */
/**
 * @typedef {<T extends ImageInput | ImageInput[]>(texts: T, options?: Partial<import('../generation/parameters.js').GenerationFunctionParameters>) => Promise<ImageToTextPipelineResult<T>>} ImageToTextPipelineCallback
 */
/**
 * Image-to-text pipeline using an `AutoModelForVision2Seq`. This pipeline predicts a caption for a given image.
 *
 * **Example:** Generate a caption for an image with `Xenova/vit-gpt2-image-captioning`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const captioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
 * const output = await captioner(url);
 * // [{ generated_text: 'a cat laying on a couch with another cat' }]
 * ```
 *
 * **Example:** Optical Character Recognition (OCR) with `Xenova/trocr-small-handwritten`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const captioner = await pipeline('image-to-text', 'Xenova/trocr-small-handwritten');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/handwriting.jpg';
 * const output = await captioner(url);
 * // [{ generated_text: 'Mr. Brown commented icily.' }]
 * ```
 */
export class ImageToTextPipeline extends ImageToTextPipeline_base {
    _call(images: any, generate_kwargs?: {}): Promise<{
        generated_text: string;
    }[] | {
        generated_text: string;
    }[][]>;
}
export type TextImagePipelineConstructorArgs = import("./_base.js").TextImagePipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ImageInput = import("./_base.js").ImageInput;
export type ImageToTextSingle = {
    /**
     * The generated text.
     */
    generated_text: string;
};
export type ImageToTextOutput = ImageToTextSingle[];
export type ImageToTextPipelineType = TextImagePipelineConstructorArgs & ImageToTextPipelineCallback & Disposable;
export type ImageToTextPipelineResult<T> = T extends ImageInput[] ? ImageToTextOutput[] : ImageToTextOutput;
export type ImageToTextPipelineCallback = <T extends ImageInput | ImageInput[]>(texts: T, options?: Partial<import("../generation/parameters.js").GenerationFunctionParameters>) => Promise<ImageToTextPipelineResult<T>>;
export {};
//# sourceMappingURL=image-to-text.d.ts.map