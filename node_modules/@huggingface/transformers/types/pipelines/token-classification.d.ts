declare const TokenClassificationPipeline_base: new (options: TextPipelineConstructorArgs) => TokenClassificationPipelineType;
/**
 * @typedef {import('./_base.js').TextPipelineConstructorArgs} TextPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */
/**
 * Strategy for fusing tokens based on the model prediction.
 * - `"none"`: Return raw per-token predictions.
 * - `"simple"`: Group entities using BIO / BIOES tags (see pipeline docs for details).
 * @typedef {"none" | "simple"} AggregationStrategy
 */
/**
 * @typedef {Object} TokenClassificationPipelineOptions
 * @property {string[]} [ignore_labels] A list of labels to ignore.
 * @property {AggregationStrategy} [aggregation_strategy="none"] Token-fusion strategy.
 * When set to anything other than `"none"`, results use `entity_group` instead of `entity`.
 */
/**
 * Single element of a token-classification result, parameterised by the options type `O` so that
 * `entity` vs. `entity_group` is known statically based on `aggregation_strategy`.
 *
 * - Grouped (present when `O["aggregation_strategy"]` is `"simple"`):
 *     `{ word, score, entity_group }`
 * - Raw (the default — when `aggregation_strategy` is missing, `"none"`, or `undefined`):
 *     `{ word, score, entity, index }`
 * - Both variants also carry optional `start` / `end` character offsets.
 *
 * When `O` is the untyped `TokenClassificationPipelineOptions`, the element is the union of both shapes,
 * narrowable via `if ("entity_group" in item)` / `if (item.entity !== undefined)`.
 *
 * @template {TokenClassificationPipelineOptions | undefined} [O=TokenClassificationPipelineOptions]
 * @typedef {_PickElement<O>[]} TokenClassificationOutput
 */
/**
 * @template {TokenClassificationPipelineOptions | undefined} O
 * @typedef {O extends undefined
 *   ? _Raw
 *   : "aggregation_strategy" extends keyof O
 *     ? (O extends { aggregation_strategy?: infer A }
 *       ? ([A] extends ["simple"] ? _Grouped
 *         : [A] extends ["none" | undefined] ? _Raw
 *         : _Raw | _Grouped)
 *       : _Raw)
 *     : _Raw} _PickElement
 */
/**
 * @typedef {{ word: string, score: number, entity: string, index: number, entity_group?: undefined, start?: number, end?: number }} _Raw
 * @typedef {{ word: string, score: number, entity_group: string, entity?: undefined, index?: undefined, start?: number, end?: number }} _Grouped
 */
/**
 * @typedef {TextPipelineConstructorArgs & TokenClassificationPipelineCallback & Disposable} TokenClassificationPipelineType
 *
 * @typedef {<Q extends string | string[], const O extends TokenClassificationPipelineOptions = {}>(texts: Q, options?: O) => Promise<Q extends string[] ? TokenClassificationOutput<O>[] : TokenClassificationOutput<O>>} TokenClassificationPipelineCallback
 */
/**
 * Named entity recognition pipeline using `AutoModelForTokenClassification`.
 *
 * **Example:** Perform named entity recognition with `Xenova/bert-base-NER`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('token-classification', 'Xenova/bert-base-NER');
 * const output = await classifier('My name is Sarah and I live in London');
 * // [
 * //   { entity: 'B-PER', score: 0.9980202913284302, index: 4, word: 'Sarah' },
 * //   { entity: 'B-LOC', score: 0.9994474053382874, index: 9, word: 'London' }
 * // ]
 * ```
 *
 * **Example:** Perform named entity recognition with `Xenova/bert-base-NER` (and return all entity labels).
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('token-classification', 'Xenova/bert-base-NER');
 * const output = await classifier('Sarah lives in the United States of America', { ignore_labels: [] });
 * // [
 * //   { entity: 'B-PER', score: 0.9966587424278259, index: 1, word: 'Sarah' },
 * //   { entity: 'O', score: 0.9987385869026184, index: 2, word: 'lives' },
 * //   { entity: 'O', score: 0.9990072846412659, index: 3, word: 'in' },
 * //   { entity: 'O', score: 0.9988298416137695, index: 4, word: 'the' },
 * //   { entity: 'B-LOC', score: 0.9995510578155518, index: 5, word: 'United' },
 * //   { entity: 'I-LOC', score: 0.9990395307540894, index: 6, word: 'States' },
 * //   { entity: 'I-LOC', score: 0.9986724853515625, index: 7, word: 'of' },
 * //   { entity: 'I-LOC', score: 0.9975294470787048, index: 8, word: 'America' }
 * // ]
 * ```
 *
 * **Example:** Group adjacent BIO/BIOES tokens into entity spans using `aggregation_strategy: "simple"`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('token-classification', 'Xenova/bert-base-NER');
 * const output = await classifier('My name is Sarah and I live in London', { aggregation_strategy: 'simple' });
 * // [
 * //   { entity_group: 'PER', score: 0.9985477924346924, word: 'Sarah' },
 * //   { entity_group: 'LOC', score: 0.999621570110321, word: 'London' }
 * // ]
 * ```
 */
export class TokenClassificationPipeline extends TokenClassificationPipeline_base {
    _call(texts: any, { ignore_labels, aggregation_strategy }?: {
        ignore_labels?: string[];
        aggregation_strategy?: string;
    }): Promise<_Grouped[] | {
        entity: any;
        score: any;
        index: number;
        word: string;
    }[] | (_Grouped[] | {
        entity: any;
        score: any;
        index: number;
        word: string;
    }[])[]>;
}
export type TextPipelineConstructorArgs = import("./_base.js").TextPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
/**
 * Strategy for fusing tokens based on the model prediction.
 * - `"none"`: Return raw per-token predictions.
 * - `"simple"`: Group entities using BIO / BIOES tags (see pipeline docs for details).
 */
export type AggregationStrategy = "none" | "simple";
export type TokenClassificationPipelineOptions = {
    /**
     * A list of labels to ignore.
     */
    ignore_labels?: string[];
    /**
     * Token-fusion strategy.
     * When set to anything other than `"none"`, results use `entity_group` instead of `entity`.
     */
    aggregation_strategy?: AggregationStrategy;
};
/**
 * Single element of a token-classification result, parameterised by the options type `O` so that
 * `entity` vs. `entity_group` is known statically based on `aggregation_strategy`.
 *
 * - Grouped (present when `O["aggregation_strategy"]` is `"simple"`):
 *     `{ word, score, entity_group }`
 * - Raw (the default — when `aggregation_strategy` is missing, `"none"`, or `undefined`):
 *     `{ word, score, entity, index }`
 * - Both variants also carry optional `start` / `end` character offsets.
 *
 * When `O` is the untyped `TokenClassificationPipelineOptions`, the element is the union of both shapes,
 * narrowable via `if ("entity_group" in item)` / `if (item.entity !== undefined)`.
 */
export type TokenClassificationOutput<O extends TokenClassificationPipelineOptions | undefined = TokenClassificationPipelineOptions> = _PickElement<O>[];
export type _PickElement<O extends TokenClassificationPipelineOptions | undefined> = O extends undefined ? _Raw : "aggregation_strategy" extends keyof O ? (O extends {
    aggregation_strategy?: infer A;
} ? ([A] extends ["simple"] ? _Grouped : [A] extends ["none" | undefined] ? _Raw : _Raw | _Grouped) : _Raw) : _Raw;
export type _Raw = {
    word: string;
    score: number;
    entity: string;
    index: number;
    entity_group?: undefined;
    start?: number;
    end?: number;
};
export type _Grouped = {
    word: string;
    score: number;
    entity_group: string;
    entity?: undefined;
    index?: undefined;
    start?: number;
    end?: number;
};
export type TokenClassificationPipelineType = TextPipelineConstructorArgs & TokenClassificationPipelineCallback & Disposable;
export type TokenClassificationPipelineCallback = <Q extends string | string[], const O extends TokenClassificationPipelineOptions = {}>(texts: Q, options?: O) => Promise<Q extends string[] ? TokenClassificationOutput<O>[] : TokenClassificationOutput<O>>;
export {};
//# sourceMappingURL=token-classification.d.ts.map