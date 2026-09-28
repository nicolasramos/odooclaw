declare const FillMaskPipeline_base: new (options: TextPipelineConstructorArgs) => FillMaskPipelineType;
/**
 * @typedef {import('./_base.js').TextPipelineConstructorArgs} TextPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */
/**
 * @typedef {Object} FillMaskSingle
 * @property {string} sequence The corresponding input with the mask token prediction.
 * @property {number} score The corresponding probability.
 * @property {number} token The predicted token id (to replace the masked one).
 * @property {string} token_str The predicted token (to replace the masked one).
 * @typedef {FillMaskSingle[]} FillMaskOutput
 *
 * @typedef {Object} FillMaskPipelineOptions Parameters specific to fill mask pipelines.
 * @property {number} [top_k=5] When passed, overrides the number of predictions to return.
 *
 * @typedef {TextPipelineConstructorArgs & FillMaskPipelineCallback & Disposable} FillMaskPipelineType
 */
/**
 * @template T
 * @typedef {T extends string[] ? FillMaskOutput[] : FillMaskOutput} FillMaskPipelineResult
 */
/**
 * @typedef {<T extends string | string[]>(texts: T, options?: FillMaskPipelineOptions) => Promise<FillMaskPipelineResult<T>>} FillMaskPipelineCallback
 */
/**
 * Masked language modeling prediction pipeline using compatible masked language models.
 *
 * **Example:** Perform masked language modeling (a.k.a. "fill-mask") with `onnx-community/ettin-encoder-32m-ONNX`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const unmasker = await pipeline('fill-mask', 'onnx-community/ettin-encoder-32m-ONNX');
 * const output = await unmasker('The capital of France is [MASK].');
 * // [
 * //   { score: 0.5151872038841248, token: 7785, token_str: ' Paris', sequence: 'The capital of France is Paris.' },
 * //   { score: 0.033725105226039886, token: 42268, token_str: ' Lyon', sequence: 'The capital of France is Lyon.' },
 * //   { score: 0.031234024092555046, token: 23397, token_str: ' Nancy', sequence: 'The capital of France is Nancy.' },
 * //   { score: 0.02075139433145523, token: 30167, token_str: ' Brussels', sequence: 'The capital of France is Brussels.' },
 * //   { score: 0.018962178379297256, token: 31955, token_str: ' Geneva', sequence: 'The capital of France is Geneva.' }
 * // ]
 * ```
 *
 * **Example:** Perform masked language modeling (a.k.a. "fill-mask") with `Xenova/bert-base-cased`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const unmasker = await pipeline('fill-mask', 'Xenova/bert-base-cased');
 * const output = await unmasker('The goal of life is [MASK].');
 * // [
 * //   { score: 0.11368396878242493, sequence: "The goal of life is survival.", token: 8115, token_str: "survival" },
 * //   { score: 0.053510840982198715, sequence: "The goal of life is love.", token: 1567, token_str: "love" },
 * //   { score: 0.05041185021400452, sequence: "The goal of life is happiness.", token: 9266, token_str: "happiness" },
 * //   { score: 0.033218126744031906, sequence: "The goal of life is freedom.", token: 4438, token_str: "freedom" },
 * //   { score: 0.03301157429814339, sequence: "The goal of life is success.", token: 2244, token_str: "success" },
 * // ]
 * ```
 *
 * **Example:** Perform masked language modeling (a.k.a. "fill-mask") with `Xenova/bert-base-cased` (and return the top result).
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const unmasker = await pipeline('fill-mask', 'Xenova/bert-base-cased');
 * const output = await unmasker('The Milky Way is a [MASK] galaxy.', { top_k: 1 });
 * // [{ score: 0.5982972383499146, sequence: "The Milky Way is a spiral galaxy.", token: 14061, token_str: "spiral" }]
 * ```
 */
export class FillMaskPipeline extends FillMaskPipeline_base {
    _call(texts: any, { top_k }?: {
        top_k?: number;
    }): Promise<{
        score: any;
        token: number;
        token_str: string;
        sequence: string;
    }[] | {
        score: any;
        token: number;
        token_str: string;
        sequence: string;
    }[][]>;
}
export type TextPipelineConstructorArgs = import("./_base.js").TextPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type FillMaskSingle = {
    /**
     * The corresponding input with the mask token prediction.
     */
    sequence: string;
    /**
     * The corresponding probability.
     */
    score: number;
    /**
     * The predicted token id (to replace the masked one).
     */
    token: number;
    /**
     * The predicted token (to replace the masked one).
     */
    token_str: string;
};
export type FillMaskOutput = FillMaskSingle[];
/**
 * Parameters specific to fill mask pipelines.
 */
export type FillMaskPipelineOptions = {
    /**
     * When passed, overrides the number of predictions to return.
     */
    top_k?: number;
};
export type FillMaskPipelineType = TextPipelineConstructorArgs & FillMaskPipelineCallback & Disposable;
export type FillMaskPipelineResult<T> = T extends string[] ? FillMaskOutput[] : FillMaskOutput;
export type FillMaskPipelineCallback = <T extends string | string[]>(texts: T, options?: FillMaskPipelineOptions) => Promise<FillMaskPipelineResult<T>>;
export {};
//# sourceMappingURL=fill-mask.d.ts.map