declare const TextClassificationPipeline_base: new (options: TextPipelineConstructorArgs) => TextClassificationPipelineType;
/**
 * @typedef {import('./_base.js').TextPipelineConstructorArgs} TextPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */
/**
 * @typedef {Object} TextClassificationSingle
 * @property {string} label The label predicted.
 * @property {number} score The corresponding probability.
 * @typedef {TextClassificationSingle[]} TextClassificationOutput
 *
 * @typedef {Object} TextClassificationPipelineOptions Parameters specific to text classification pipelines.
 * @property {number|null} [top_k=1] The number of top predictions to return. If set to `null`, all predictions are returned.
 */
/**
 * @template O
 * @typedef {O extends { top_k: infer K } ? (1 extends K ? false : true) : false} TextClassificationIsTopK
 */
/**
 * @template Q, O
 * @typedef {Q extends string[] ? (TextClassificationIsTopK<O> extends true ? TextClassificationOutput[] : TextClassificationOutput) : TextClassificationOutput} TextClassificationPipelineResult
 */
/**
 * @typedef {<Q extends string | string[], const O extends TextClassificationPipelineOptions = {}>(texts: Q, options?: O) => Promise<TextClassificationPipelineResult<Q, O>>} TextClassificationPipelineCallback
 */
/**
 * @typedef {TextPipelineConstructorArgs & TextClassificationPipelineCallback & Disposable} TextClassificationPipelineType
 */
/**
 * Text classification pipeline using `AutoModelForSequenceClassification`.
 *
 * **Example:** Sentiment analysis with `Xenova/distilbert-base-uncased-finetuned-sst-2-english`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
 * const output = await classifier('I love transformers!');
 * // [{ label: 'POSITIVE', score: 0.999788761138916 }]
 * ```
 *
 * **Example:** Multilingual sentiment analysis with `Xenova/bert-base-multilingual-uncased-sentiment` (and return the top 5 classes).
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');
 * const output = await classifier('Le meilleur film de tous les temps.', { top_k: 5 });
 * // [
 * //   { label: '5 stars', score: 0.9610759615898132 },
 * //   { label: '4 stars', score: 0.03323351591825485 },
 * //   { label: '3 stars', score: 0.0036155181005597115 },
 * //   { label: '1 star', score: 0.0011325967498123646 },
 * //   { label: '2 stars', score: 0.0009423971059732139 }
 * // ]
 * ```
 *
 * **Example:** Toxic comment classification with `Xenova/toxic-bert` (and return all classes).
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('text-classification', 'Xenova/toxic-bert');
 * const output = await classifier('I hate you!', { top_k: null });
 * // [
 * //   { label: 'toxic', score: 0.9593140482902527 },
 * //   { label: 'insult', score: 0.16187334060668945 },
 * //   { label: 'obscene', score: 0.03452680632472038 },
 * //   { label: 'identity_hate', score: 0.0223250575363636 },
 * //   { label: 'threat', score: 0.019197041168808937 },
 * //   { label: 'severe_toxic', score: 0.005651099607348442 }
 * // ]
 * ```
 */
export class TextClassificationPipeline extends TextClassificationPipeline_base {
    _call(texts: any, { top_k }?: {
        top_k?: number;
    }): Promise<{
        label: any;
        score: any;
    } | ({
        label: any;
        score: any;
    } | {
        label: any;
        score: any;
    }[])[]>;
}
export type TextPipelineConstructorArgs = import("./_base.js").TextPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type TextClassificationSingle = {
    /**
     * The label predicted.
     */
    label: string;
    /**
     * The corresponding probability.
     */
    score: number;
};
export type TextClassificationOutput = TextClassificationSingle[];
/**
 * Parameters specific to text classification pipelines.
 */
export type TextClassificationPipelineOptions = {
    /**
     * The number of top predictions to return. If set to `null`, all predictions are returned.
     */
    top_k?: number | null;
};
export type TextClassificationIsTopK<O> = O extends {
    top_k: infer K;
} ? (1 extends K ? false : true) : false;
export type TextClassificationPipelineResult<Q, O> = Q extends string[] ? (TextClassificationIsTopK<O> extends true ? TextClassificationOutput[] : TextClassificationOutput) : TextClassificationOutput;
export type TextClassificationPipelineCallback = <Q extends string | string[], const O extends TextClassificationPipelineOptions = {}>(texts: Q, options?: O) => Promise<TextClassificationPipelineResult<Q, O>>;
export type TextClassificationPipelineType = TextPipelineConstructorArgs & TextClassificationPipelineCallback & Disposable;
export {};
//# sourceMappingURL=text-classification.d.ts.map