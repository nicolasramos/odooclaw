declare const ImageClassificationPipeline_base: new (options: ImagePipelineConstructorArgs) => ImageClassificationPipelineType;
/**
 * @typedef {import('./_base.js').ImagePipelineConstructorArgs} ImagePipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').ImageInput} ImageInput
 */
/**
 * @typedef {Object} ImageClassificationSingle
 * @property {string} label The label identified by the model.
 * @property {number} score The score attributed by the model for that label.
 * @typedef {ImageClassificationSingle[]} ImageClassificationOutput
 *
 * @typedef {Object} ImageClassificationPipelineOptions Parameters specific to image classification pipelines.
 * @property {number|null} [top_k=5] The number of top labels to return. Set to `null` to return all labels.
 *
 * @typedef {ImagePipelineConstructorArgs & ImageClassificationPipelineCallback & Disposable} ImageClassificationPipelineType
 */
/**
 * @template T
 * @typedef {T extends ImageInput[] ? ImageClassificationOutput[] : ImageClassificationOutput} ImageClassificationPipelineResult
 */
/**
 * @typedef {<T extends ImageInput | ImageInput[]>(images: T, options?: ImageClassificationPipelineOptions) => Promise<ImageClassificationPipelineResult<T>>} ImageClassificationPipelineCallback
 */
/**
 * Image classification pipeline using any `AutoModelForImageClassification`.
 * This pipeline predicts the class of an image.
 *
 * **Example:** Classify an image.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * const output = await classifier(url);
 * // [
 * //   { label: 'tiger, Panthera tigris', score: 0.632695734500885 },
 * //   ... (top 5 labels by default)
 * // ]
 * ```
 *
 * **Example:** Classify an image and return the top `n` classes.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * const output = await classifier(url, { top_k: 3 });
 * // [
 * //   { label: 'tiger, Panthera tigris', score: 0.632695734500885 },
 * //   { label: 'tiger cat', score: 0.3634825646877289 },
 * //   { label: 'lion, king of beasts, Panthera leo', score: 0.00045060308184474707 },
 * // ]
 * ```
 *
 * **Example:** Classify an image and return all classes.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('image-classification', 'Xenova/vit-base-patch16-224');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * const output = await classifier(url, { top_k: null });
 * // [
 * //   { label: 'tiger, Panthera tigris', score: 0.632695734500885 },
 * //   { label: 'tiger cat', score: 0.3634825646877289 },
 * //   { label: 'lion, king of beasts, Panthera leo', score: 0.00045060308184474707 },
 * //   { label: 'jaguar, panther, Panthera onca, Felis onca', score: 0.00035465499968267977 },
 * //   ...
 * // ]
 * ```
 */
export class ImageClassificationPipeline extends ImageClassificationPipeline_base {
    _call(images: any, { top_k }?: {
        top_k?: number;
    }): Promise<ImageClassificationOutput | ImageClassificationOutput[]>;
}
export type ImagePipelineConstructorArgs = import("./_base.js").ImagePipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ImageInput = import("./_base.js").ImageInput;
export type ImageClassificationSingle = {
    /**
     * The label identified by the model.
     */
    label: string;
    /**
     * The score attributed by the model for that label.
     */
    score: number;
};
export type ImageClassificationOutput = ImageClassificationSingle[];
/**
 * Parameters specific to image classification pipelines.
 */
export type ImageClassificationPipelineOptions = {
    /**
     * The number of top labels to return. Set to `null` to return all labels.
     */
    top_k?: number | null;
};
export type ImageClassificationPipelineType = ImagePipelineConstructorArgs & ImageClassificationPipelineCallback & Disposable;
export type ImageClassificationPipelineResult<T> = T extends ImageInput[] ? ImageClassificationOutput[] : ImageClassificationOutput;
export type ImageClassificationPipelineCallback = <T extends ImageInput | ImageInput[]>(images: T, options?: ImageClassificationPipelineOptions) => Promise<ImageClassificationPipelineResult<T>>;
export {};
//# sourceMappingURL=image-classification.d.ts.map