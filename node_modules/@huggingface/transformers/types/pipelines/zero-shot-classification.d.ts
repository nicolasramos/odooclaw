declare const ZeroShotClassificationPipeline_base: new (options: TextPipelineConstructorArgs) => ZeroShotClassificationPipelineType;
/**
 * @typedef {import('./_base.js').TextPipelineConstructorArgs} TextPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */
/**
 * @typedef {Object} ZeroShotClassificationOutput
 * @property {string} sequence The sequence for which this is the output.
 * @property {string[]} labels The labels sorted by order of likelihood.
 * @property {number[]} scores The probabilities for each of the labels.
 *
 * @typedef {Object} ZeroShotClassificationPipelineOptions Parameters specific to zero-shot classification pipelines.
 * @property {string} [hypothesis_template="This example is {}."] The template used to turn each
 * candidate label into an NLI-style hypothesis. The candidate label will replace the {} placeholder.
 * @property {boolean} [multi_label=false] Whether multiple candidate labels can be true.
 * If `false`, the scores are normalized such that the sum of the label likelihoods for each sequence
 * is 1. If `true`, the labels are considered independent and probabilities are normalized for each
 * candidate by doing a softmax of the entailment score vs. the contradiction score.
 *
 * @typedef {TextPipelineConstructorArgs & ZeroShotClassificationPipelineCallback & Disposable} ZeroShotClassificationPipelineType
 */
/**
 * @template T
 * @typedef {T extends string[] ? ZeroShotClassificationOutput[] : ZeroShotClassificationOutput} ZeroShotClassificationPipelineResult
 */
/**
 * @typedef {<T extends string | string[]>(texts: T, candidate_labels: string | string[], options?: ZeroShotClassificationPipelineOptions) => Promise<ZeroShotClassificationPipelineResult<T>>} ZeroShotClassificationPipelineCallback
 */
/**
 * NLI-based zero-shot classification pipeline using `AutoModelForSequenceClassification`
 * trained on NLI (natural language inference) tasks. This is similar to `text-classification`
 * pipelines, but these models do not require a hard-coded set of classes. Candidate classes can
 * be provided at runtime, making zero-shot classification slower but much more flexible.
 *
 * **Example:** Zero-shot classification with `Xenova/mobilebert-uncased-mnli`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli');
 * const text = 'Last week I upgraded my iOS version and ever since then my phone has been overheating whenever I use your app.';
 * const labels = [ 'mobile', 'billing', 'website', 'account access' ];
 * const output = await classifier(text, labels);
 * // {
 * //   sequence: 'Last week I upgraded my iOS version and ever since then my phone has been overheating whenever I use your app.',
 * //   labels: [ 'mobile', 'website', 'billing', 'account access' ],
 * //   scores: [ 0.5562091040482018, 0.1843621307860853, 0.13942646639336376, 0.12000229877234923 ]
 * // }
 * ```
 *
 * **Example:** Zero-shot classification with `Xenova/nli-deberta-v3-xsmall` (multi-label).
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall');
 * const text = 'I have a problem with my iphone that needs to be resolved asap!';
 * const labels = [ 'urgent', 'not urgent', 'phone', 'tablet', 'computer' ];
 * const output = await classifier(text, labels, { multi_label: true });
 * // {
 * //   sequence: 'I have a problem with my iphone that needs to be resolved asap!',
 * //   labels: [ 'urgent', 'phone', 'computer', 'tablet', 'not urgent' ],
 * //   scores: [ 0.9958870956360275, 0.9923963400697035, 0.002333537946160235, 0.0015134138567598765, 0.0010699384208377163 ]
 * // }
 * ```
 */
export class ZeroShotClassificationPipeline extends ZeroShotClassificationPipeline_base {
    label2id: {
        [k: string]: any;
    };
    entailment_id: any;
    contradiction_id: any;
    _call(texts: any, candidate_labels: any, { hypothesis_template, multi_label }?: {
        hypothesis_template?: string;
        multi_label?: boolean;
    }): Promise<ZeroShotClassificationOutput | ZeroShotClassificationOutput[]>;
}
export type TextPipelineConstructorArgs = import("./_base.js").TextPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type ZeroShotClassificationOutput = {
    /**
     * The sequence for which this is the output.
     */
    sequence: string;
    /**
     * The labels sorted by order of likelihood.
     */
    labels: string[];
    /**
     * The probabilities for each of the labels.
     */
    scores: number[];
};
/**
 * Parameters specific to zero-shot classification pipelines.
 */
export type ZeroShotClassificationPipelineOptions = {
    /**
     * The template used to turn each
     * candidate label into an NLI-style hypothesis. The candidate label will replace the {} placeholder.
     */
    hypothesis_template?: string;
    /**
     * Whether multiple candidate labels can be true.
     * If `false`, the scores are normalized such that the sum of the label likelihoods for each sequence
     * is 1. If `true`, the labels are considered independent and probabilities are normalized for each
     * candidate by doing a softmax of the entailment score vs. the contradiction score.
     */
    multi_label?: boolean;
};
export type ZeroShotClassificationPipelineType = TextPipelineConstructorArgs & ZeroShotClassificationPipelineCallback & Disposable;
export type ZeroShotClassificationPipelineResult<T> = T extends string[] ? ZeroShotClassificationOutput[] : ZeroShotClassificationOutput;
export type ZeroShotClassificationPipelineCallback = <T extends string | string[]>(texts: T, candidate_labels: string | string[], options?: ZeroShotClassificationPipelineOptions) => Promise<ZeroShotClassificationPipelineResult<T>>;
export {};
//# sourceMappingURL=zero-shot-classification.d.ts.map