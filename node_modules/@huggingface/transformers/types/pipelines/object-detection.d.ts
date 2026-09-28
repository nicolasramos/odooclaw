declare const ObjectDetectionPipeline_base: new (options: ImagePipelineConstructorArgs) => ObjectDetectionPipelineType;
/**
 * @typedef {import('./_base.js').ImagePipelineConstructorArgs} ImagePipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').ImageInput} ImageInput
 * @typedef {import('./_base.js').BoundingBox} BoundingBox
 */
/**
 * @typedef {Object} ObjectDetectionPipelineSingle
 * @property {string} label The class label identified by the model.
 * @property {number} score The score attributed by the model for that label.
 * @property {BoundingBox} box The bounding box of detected object in image's original size, or as a percentage if `percentage` is set to true.
 * @typedef {ObjectDetectionPipelineSingle[]} ObjectDetectionOutput
 *
 * @typedef {Object} ObjectDetectionPipelineOptions Parameters specific to object detection pipelines.
 * @property {number} [threshold=0.9] The threshold used to filter boxes by score.
 * @property {boolean} [percentage=false] Whether to return box coordinates as percentages (true) or pixels (false).
 *
 * @typedef {ImagePipelineConstructorArgs & ObjectDetectionPipelineCallback & Disposable} ObjectDetectionPipelineType
 */
/**
 * @template T
 * @typedef {T extends ImageInput[] ? ObjectDetectionOutput[] : ObjectDetectionOutput} ObjectDetectionPipelineResult
 */
/**
 * @typedef {<T extends ImageInput | ImageInput[]>(images: T, options?: ObjectDetectionPipelineOptions) => Promise<ObjectDetectionPipelineResult<T>>} ObjectDetectionPipelineCallback
 */
/**
 * Object detection pipeline using any `AutoModelForObjectDetection`.
 * This pipeline predicts bounding boxes of objects and their classes.
 *
 * **Example:** Run object-detection with `Xenova/detr-resnet-50`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
 * const img = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg';
 * const output = await detector(img, { threshold: 0.9 });
 * // [{
 * //   score: 0.9976370930671692,
 * //   label: "remote",
 * //   box: { xmin: 31, ymin: 68, xmax: 190, ymax: 118 }
 * // },
 * // ...
 * // {
 * //   score: 0.9984092116355896,
 * //   label: "cat",
 * //   box: { xmin: 331, ymin: 19, xmax: 649, ymax: 371 }
 * // }]
 * ```
 */
export class ObjectDetectionPipeline extends ObjectDetectionPipeline_base {
    _call(images: any, { threshold, percentage }?: {
        threshold?: number;
        percentage?: boolean;
    }): Promise<ObjectDetectionOutput | ObjectDetectionOutput[]>;
}
export type ImagePipelineConstructorArgs = import("./_base.js").ImagePipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ImageInput = import("./_base.js").ImageInput;
export type BoundingBox = import("./_base.js").BoundingBox;
export type ObjectDetectionPipelineSingle = {
    /**
     * The class label identified by the model.
     */
    label: string;
    /**
     * The score attributed by the model for that label.
     */
    score: number;
    /**
     * The bounding box of detected object in image's original size, or as a percentage if `percentage` is set to true.
     */
    box: BoundingBox;
};
export type ObjectDetectionOutput = ObjectDetectionPipelineSingle[];
/**
 * Parameters specific to object detection pipelines.
 */
export type ObjectDetectionPipelineOptions = {
    /**
     * The threshold used to filter boxes by score.
     */
    threshold?: number;
    /**
     * Whether to return box coordinates as percentages (true) or pixels (false).
     */
    percentage?: boolean;
};
export type ObjectDetectionPipelineType = ImagePipelineConstructorArgs & ObjectDetectionPipelineCallback & Disposable;
export type ObjectDetectionPipelineResult<T> = T extends ImageInput[] ? ObjectDetectionOutput[] : ObjectDetectionOutput;
export type ObjectDetectionPipelineCallback = <T extends ImageInput | ImageInput[]>(images: T, options?: ObjectDetectionPipelineOptions) => Promise<ObjectDetectionPipelineResult<T>>;
export {};
//# sourceMappingURL=object-detection.d.ts.map