declare const TextGenerationPipeline_base: new (options: TextPipelineConstructorArgs) => TextGenerationPipelineType;
/**
 * @typedef {Object} TextGenerationSingleString
 * @property {string} generated_text The generated text.
 * @typedef {TextGenerationSingleString[]} TextGenerationStringOutput
 *
 * @typedef {Object} TextGenerationSingleChat
 * @property {Chat} generated_text The generated chat.
 * @typedef {TextGenerationSingleChat[]} TextGenerationChatOutput
 *
 * @typedef {TextGenerationSingleString | TextGenerationSingleChat} TextGenerationSingle
 * @typedef {TextGenerationSingle[]} TextGenerationOutput
 *
 * @typedef {Object} TextGenerationSpecificParams Parameters specific to text-generation pipelines.
 * @property {boolean} [add_special_tokens] Whether to add special tokens when tokenizing the sequences.
 * @property {boolean} [return_full_text=true] If set to `false` only added text is returned, otherwise the full text is returned.
 * @property {Object[]|null} [tools=null] A list of tools to expose to chat templates that support tool use.
 * @property {Record<string, string>[]|null} [documents=null] A list of documents to expose to chat templates that support RAG.
 * @property {string|null} [chat_template=null] A specific chat template (or template name) to apply.
 * @property {Object} [tokenizer_encode_kwargs] Additional keyword arguments to pass along to the encoding step of the tokenizer.
 * If the text input is a chat, it is passed to `apply_chat_template`. Otherwise, it is passed to the tokenizer's call function.
 * @typedef {import('../generation/parameters.js').GenerationFunctionParameters & TextGenerationSpecificParams} TextGenerationConfig
 *
 * @typedef {TextPipelineConstructorArgs & TextGenerationPipelineCallback & Disposable} TextGenerationPipelineType
 */
/**
 * @template T
 * @typedef {T extends string ? TextGenerationStringOutput : T extends Chat ? TextGenerationChatOutput : T extends string[] ? TextGenerationStringOutput[] : T extends Chat[] ? TextGenerationChatOutput[] : never} TextGenerationResult
 */
/**
 * @typedef {<T extends string | Chat | string[] | Chat[]>(texts: T, options?: Partial<TextGenerationConfig>) => Promise<TextGenerationResult<T>>} TextGenerationPipelineCallback
 */
/**
 * Language generation pipeline using compatible causal language models.
 * This pipeline predicts the words that will follow a specified text prompt.
 * For all generation parameters, see `GenerationConfig`.
 *
 * **Example:** Text generation with `onnx-community/SmolLM2-135M-ONNX` (default settings).
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const generator = await pipeline('text-generation', 'onnx-community/SmolLM2-135M-ONNX');
 * const text = 'Once upon a time,';
 * const output = await generator(text, { max_new_tokens: 8 });
 * // [{ generated_text: 'Once upon a time, there was a little girl named Lily.' }]
 * ```
 *
 * **Example:** Chat completion with `onnx-community/Qwen3-0.6B-ONNX`.
 * ```javascript
 * import { pipeline, TextStreamer } from '@huggingface/transformers';
 *
 * // Create a text generation pipeline
 * const generator = await pipeline(
 *   'text-generation',
 *   'onnx-community/Qwen3-0.6B-ONNX',
 *   { dtype: 'q4f16' },
 * );
 *
 * // Define the list of messages
 * const messages = [
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'Write me a poem about Machine Learning.' },
 * ];
 *
 * // Generate a response
 * const output = await generator(messages, {
 *   max_new_tokens: 512,
 *   do_sample: false,
 *   streamer: new TextStreamer(generator.tokenizer, { skip_prompt: true, skip_special_tokens: true }),
 * });
 * console.log(output[0].generated_text.at(-1)?.content);
 * ```
 */
export class TextGenerationPipeline extends TextGenerationPipeline_base {
    _default_generation_config: {
        max_new_tokens: number;
    };
    /**
     * @param {string | string[] | import('../tokenization_utils.js').Message[] | import('../tokenization_utils.js').Message[][]} texts
     * @param {Partial<TextGenerationConfig>} generate_kwargs
     */
    _call(texts: string | string[] | import("../tokenization_utils.js").Message[] | import("../tokenization_utils.js").Message[][], generate_kwargs?: Partial<TextGenerationConfig>): Promise<TextGenerationOutput | TextGenerationOutput[]>;
}
export type TextPipelineConstructorArgs = import("./_base.js").TextPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type Chat = import("../tokenization_utils.js").Message[];
export type TextGenerationSingleString = {
    /**
     * The generated text.
     */
    generated_text: string;
};
export type TextGenerationStringOutput = TextGenerationSingleString[];
export type TextGenerationSingleChat = {
    /**
     * The generated chat.
     */
    generated_text: Chat;
};
export type TextGenerationChatOutput = TextGenerationSingleChat[];
export type TextGenerationSingle = TextGenerationSingleString | TextGenerationSingleChat;
export type TextGenerationOutput = TextGenerationSingle[];
/**
 * Parameters specific to text-generation pipelines.
 */
export type TextGenerationSpecificParams = {
    /**
     * Whether to add special tokens when tokenizing the sequences.
     */
    add_special_tokens?: boolean;
    /**
     * If set to `false` only added text is returned, otherwise the full text is returned.
     */
    return_full_text?: boolean;
    /**
     * A list of tools to expose to chat templates that support tool use.
     */
    tools?: any[] | null;
    /**
     * A list of documents to expose to chat templates that support RAG.
     */
    documents?: Record<string, string>[] | null;
    /**
     * A specific chat template (or template name) to apply.
     */
    chat_template?: string | null;
    /**
     * Additional keyword arguments to pass along to the encoding step of the tokenizer.
     * If the text input is a chat, it is passed to `apply_chat_template`. Otherwise, it is passed to the tokenizer's call function.
     */
    tokenizer_encode_kwargs?: any;
};
export type TextGenerationConfig = import("../generation/parameters.js").GenerationFunctionParameters & TextGenerationSpecificParams;
export type TextGenerationPipelineType = TextPipelineConstructorArgs & TextGenerationPipelineCallback & Disposable;
export type TextGenerationResult<T> = T extends string ? TextGenerationStringOutput : T extends Chat ? TextGenerationChatOutput : T extends string[] ? TextGenerationStringOutput[] : T extends Chat[] ? TextGenerationChatOutput[] : never;
export type TextGenerationPipelineCallback = <T extends string | Chat | string[] | Chat[]>(texts: T, options?: Partial<TextGenerationConfig>) => Promise<TextGenerationResult<T>>;
export {};
//# sourceMappingURL=text-generation.d.ts.map