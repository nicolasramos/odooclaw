declare const ZeroShotImageClassificationPipeline_base: new (options: TextImagePipelineConstructorArgs) => ZeroShotImageClassificationPipelineType;
/**
 * @typedef {import('./_base.js').TextImagePipelineConstructorArgs} TextImagePipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').ImagePipelineInputs} ImagePipelineInputs
 * @typedef {import('./_base.js').ImageInput} ImageInput
 */
/**
 * @typedef {Object} ZeroShotImageClassificationOutputSingle
 * @property {string} label The label identified by the model. It is one of the suggested `candidate_label`.
 * @property {number} score The score attributed by the model for that label (between 0 and 1).
 *
 * @typedef {ZeroShotImageClassificationOutputSingle[]} ZeroShotImageClassificationOutput
 *
 * @typedef {Object} ZeroShotImageClassificationPipelineOptions Parameters specific to zero-shot image classification pipelines.
 * @property {string} [hypothesis_template="This is a photo of {}"] The sentence used in conjunction with `candidate_labels`
 * to attempt the image classification by replacing the placeholder with the candidate_labels.
 * Then likelihood is estimated by using `logits_per_image`.
 *
 * @typedef {TextImagePipelineConstructorArgs & ZeroShotImageClassificationPipelineCallback & Disposable} ZeroShotImageClassificationPipelineType
 */
/**
 * @template T
 * @typedef {T extends ImageInput[] ? ZeroShotImageClassificationOutput[] : ZeroShotImageClassificationOutput} ZeroShotImageClassificationPipelineResult
 */
/**
 * @typedef {<T extends ImageInput | ImageInput[]>(images: T, candidate_labels: string[], options?: ZeroShotImageClassificationPipelineOptions) => Promise<ZeroShotImageClassificationPipelineResult<T>>} ZeroShotImageClassificationPipelineCallback
 */
/**
 * Zero-shot image classification pipeline. This pipeline predicts the class of
 * an image when you provide an image and a set of `candidate_labels`.
 *
 * **Example:** Zero-shot image classification with `Xenova/clip-vit-base-patch32`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
 * const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';
 * const output = await classifier(url, ['tiger', 'horse', 'dog']);
 * // [
 * //   { score: 0.9993917942047119, label: 'tiger' },
 * //   { score: 0.0003519294841680676, label: 'horse' },
 * //   { score: 0.0002562698791734874, label: 'dog' }
 * // ]
 * ```
 */
export class ZeroShotImageClassificationPipeline extends ZeroShotImageClassificationPipeline_base {
    _call(images: any, candidate_labels: any, { hypothesis_template }?: {
        hypothesis_template?: string;
    }): Promise<{
        score: any;
        label: any;
    }[] | {
        score: any;
        label: any;
    }[][]>;
}
export type TextImagePipelineConstructorArgs = import("./_base.js").TextImagePipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ImagePipelineInputs = import("./_base.js").ImagePipelineInputs;
export type ImageInput = import("./_base.js").ImageInput;
export type ZeroShotImageClassificationOutputSingle = {
    /**
     * The label identified by the model. It is one of the suggested `candidate_label`.
     */
    label: string;
    /**
     * The score attributed by the model for that label (between 0 and 1).
     */
    score: number;
};
export type ZeroShotImageClassificationOutput = ZeroShotImageClassificationOutputSingle[];
/**
 * Parameters specific to zero-shot image classification pipelines.
 */
export type ZeroShotImageClassificationPipelineOptions = {
    /**
     * The sentence used in conjunction with `candidate_labels`
     * to attempt the image classification by replacing the placeholder with the candidate_labels.
     * Then likelihood is estimated by using `logits_per_image`.
     */
    hypothesis_template?: string;
};
export type ZeroShotImageClassificationPipelineType = TextImagePipelineConstructorArgs & ZeroShotImageClassificationPipelineCallback & Disposable;
export type ZeroShotImageClassificationPipelineResult<T> = T extends ImageInput[] ? ZeroShotImageClassificationOutput[] : ZeroShotImageClassificationOutput;
export type ZeroShotImageClassificationPipelineCallback = <T extends ImageInput | ImageInput[]>(images: T, candidate_labels: string[], options?: ZeroShotImageClassificationPipelineOptions) => Promise<ZeroShotImageClassificationPipelineResult<T>>;
export {};
//# sourceMappingURL=zero-shot-image-classification.d.ts.map