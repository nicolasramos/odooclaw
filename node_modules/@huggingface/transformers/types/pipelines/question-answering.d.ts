declare const QuestionAnsweringPipeline_base: new (options: TextPipelineConstructorArgs) => QuestionAnsweringPipelineType;
/**
 * @typedef {import('./_base.js').TextPipelineConstructorArgs} TextPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */
/**
 * @typedef {Object} QuestionAnsweringOutput
 * @property {number} score The probability associated with the answer.
 * @property {number} [start] The character start index of the answer (in the tokenized version of the input).
 * @property {number} [end] The character end index of the answer (in the tokenized version of the input).
 * @property {string} answer The answer to the question.
 *
 * @typedef {Object} QuestionAnsweringPipelineOptions Parameters specific to question answering pipelines.
 * @property {number} [top_k=1] The number of top answer predictions to return.
 *
 * @typedef {TextPipelineConstructorArgs & QuestionAnsweringPipelineCallback & Disposable} QuestionAnsweringPipelineType
 */
/**
 * @template O
 * @typedef {O extends { top_k: infer K } ? (1 extends K ? false : true) : false} QuestionAnsweringIsTopK
 */
/**
 * @template Q, O
 * @typedef {Q extends string[] ? (QuestionAnsweringIsTopK<O> extends true ? QuestionAnsweringOutput[][] : QuestionAnsweringOutput[]) : (QuestionAnsweringIsTopK<O> extends true ? QuestionAnsweringOutput[] : QuestionAnsweringOutput)} QuestionAnsweringPipelineResult
 */
/**
 * @typedef {<Q extends string | string[], const O extends { top_k?: number } = {}>(question: Q, context: Q, options?: O) => Promise<QuestionAnsweringPipelineResult<Q, O>>} QuestionAnsweringPipelineCallback
 */
/**
 * Question answering pipeline using `AutoModelForQuestionAnswering`.
 *
 * **Example:** Run question answering with `Xenova/distilbert-base-uncased-distilled-squad`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const answerer = await pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad');
 * const question = 'Who was Jim Henson?';
 * const context = 'Jim Henson was a nice puppet.';
 * const output = await answerer(question, context);
 * // {
 * //   answer: "a nice puppet",
 * //   score: 0.5768911502526741
 * // }
 * ```
 */
export class QuestionAnsweringPipeline extends QuestionAnsweringPipeline_base {
    _call(question: any, context: any, { top_k }?: {
        top_k?: number;
    }): Promise<{
        answer: string;
        score: any;
    } | ({
        answer: string;
        score: any;
    } | {
        answer: string;
        score: any;
    }[])[]>;
}
export type TextPipelineConstructorArgs = import("./_base.js").TextPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type QuestionAnsweringOutput = {
    /**
     * The probability associated with the answer.
     */
    score: number;
    /**
     * The character start index of the answer (in the tokenized version of the input).
     */
    start?: number;
    /**
     * The character end index of the answer (in the tokenized version of the input).
     */
    end?: number;
    /**
     * The answer to the question.
     */
    answer: string;
};
/**
 * Parameters specific to question answering pipelines.
 */
export type QuestionAnsweringPipelineOptions = {
    /**
     * The number of top answer predictions to return.
     */
    top_k?: number;
};
export type QuestionAnsweringPipelineType = TextPipelineConstructorArgs & QuestionAnsweringPipelineCallback & Disposable;
export type QuestionAnsweringIsTopK<O> = O extends {
    top_k: infer K;
} ? (1 extends K ? false : true) : false;
export type QuestionAnsweringPipelineResult<Q, O> = Q extends string[] ? (QuestionAnsweringIsTopK<O> extends true ? QuestionAnsweringOutput[][] : QuestionAnsweringOutput[]) : (QuestionAnsweringIsTopK<O> extends true ? QuestionAnsweringOutput[] : QuestionAnsweringOutput);
export type QuestionAnsweringPipelineCallback = <Q extends string | string[], const O extends {
    top_k?: number;
} = {}>(question: Q, context: Q, options?: O) => Promise<QuestionAnsweringPipelineResult<Q, O>>;
export {};
//# sourceMappingURL=question-answering.d.ts.map