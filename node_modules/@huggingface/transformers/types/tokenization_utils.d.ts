/**
 * @typedef {import('./utils/hub.js').PretrainedOptions} PretrainedTokenizerOptions
 */
/**
 * Loads a tokenizer from the specified path.
 * @param {string} pretrained_model_name_or_path The path to the tokenizer directory.
 * @param {PretrainedTokenizerOptions} options Additional options for loading the tokenizer.
 * @returns {Promise<any[]>} A promise that resolves with information about the loaded tokenizer.
 */
export function loadTokenizer(pretrained_model_name_or_path: string, options: PretrainedTokenizerOptions): Promise<any[]>;
/**
 * Helper function to convert a tensor to a list before decoding.
 * @param {Tensor} tensor The tensor to convert.
 * @returns {number[]} The tensor as a list.
 */
export function prepareTensorForDecode(tensor: Tensor): number[];
/**
 * Helper function to build translation inputs for an `NllbTokenizer` or `M2M100Tokenizer`.
 * @param {PreTrainedTokenizer} self The tokenizer instance.
 * @param {string|string[]} raw_inputs The text to tokenize.
 * @param {Object} tokenizer_options Options to be sent to the tokenizer
 * @param {Object} generate_kwargs Generation options.
 * @returns {Object} Object to be passed to the model.
 */
export function _build_translation_inputs(self: PreTrainedTokenizer, raw_inputs: string | string[], tokenizer_options: any, generate_kwargs: any): any;
declare const PreTrainedTokenizer_base: new (tokenizerJSON: any, tokenizerConfig: any) => PreTrainedTokenizerCallback;
/**
 * @template {string|string[]} TText
 * @typedef {TText extends string ? number[] : number[][]} BatchEncodingArrayItem
 */
/**
 * @template {string|string[]} TText
 * @template {boolean} [TReturnTensor=true]
 * @typedef {TReturnTensor extends true ? Tensor : BatchEncodingArrayItem<TText>} BatchEncodingItem
 */
/**
 * The object returned from `tokenizer(text)`. The fields are a `Tensor` by
 * default, or an `Array` when `return_tensor: false` is passed.
 *
 * @template TItem
 * @typedef {Object} BatchEncoding
 * @property {TItem} input_ids Token ids to be fed to the model.
 * @property {TItem} attention_mask Mask indicating which tokens should be attended to (1) versus padded (0).
 * @property {TItem} [token_type_ids] Segment ids, present only for tokenizers that distinguish sequence A vs B (e.g. BERT).
 */
/**
 * Options passed to `tokenizer(text, options)`.
 *
 * @template {string|string[]} TText
 * @template {boolean} [TReturnTensor=true]
 * @typedef {Object} TokenizerCallOptions
 * @property {TText extends string ? string|null : string[]|null} [text_pair=null] Optional second sequence to be encoded. Must match the shape of `text` — string when `text` is a string, array when `text` is an array.
 * @property {boolean|'max_length'} [padding=false] Whether to pad the input sequences.
 * @property {boolean} [add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
 * @property {boolean|null} [truncation=null] Whether to truncate the input sequences.
 * @property {number|null} [max_length=null] Maximum length of the returned list and optionally padding length.
 * @property {TReturnTensor} [return_tensor=true] Whether to return the results as Tensors or arrays.
 * @property {boolean|null} [return_token_type_ids=null] Whether to return the token type ids.
 */
/**
 * @typedef {<TText extends string | string[], TReturnTensor extends boolean = true>(text: TText, options?: TokenizerCallOptions<TText, TReturnTensor>) => BatchEncoding<BatchEncodingItem<TText, TReturnTensor>>} PreTrainedTokenizerCallback
 */
/**
 * @template {boolean} [TTokenize=true]
 * @template {boolean} [TReturnTensor=true]
 * @template {boolean} [TReturnDict=true]
 * @typedef {Object} ApplyChatTemplateOptions
 * @property {string|null} [chat_template=null] A Jinja template to use for this conversion. If omitted, the model's chat template is used.
 * @property {Object[]|null} [tools=null] JSON Schema tool definitions exposed to templates that support function calling.
 * See the [chat templating guide](https://huggingface.co/docs/transformers/main/en/chat_templating#automated-function-conversion-for-tool-use).
 * @property {Record<string, string>[]|null} [documents=null] Documents exposed to templates that support retrieval-augmented generation.
 * See the [RAG section](https://huggingface.co/docs/transformers/main/en/chat_templating#arguments-for-RAG) of the chat templating guide.
 * @property {boolean} [add_generation_prompt=false] Whether to end the prompt with the token(s) that indicate the start of an assistant message.
 * The template must support this argument for it to have any effect.
 * @property {TTokenize} [tokenize=true] Whether to tokenize the output. If false, the output will be a string.
 * @property {boolean} [padding=false] Whether to pad sequences to the maximum length. Has no effect if tokenize is false.
 * @property {boolean} [truncation=false] Whether to truncate sequences to the maximum length. Has no effect if tokenize is false.
 * @property {number|null} [max_length=null] Maximum length (in tokens) to use for padding or truncation. If omitted, the tokenizer's `max_length` is used.
 * Has no effect if tokenize is false.
 * @property {TReturnTensor} [return_tensor=true] Whether to return the output as a Tensor or an Array. Has no effect if tokenize is false.
 * @property {TReturnDict} [return_dict=true] Whether to return a dictionary with named outputs. Has no effect if tokenize is false.
 * @property {Object} [tokenizer_kwargs={}] Additional options to pass to the tokenizer.
 */
/**
 * @template {boolean} [TTokenize=true]
 * @template {boolean} [TReturnTensor=true]
 * @template {boolean} [TReturnDict=true]
 * @typedef {TTokenize extends false ? string : TReturnDict extends false ? BatchEncodingItem<string, TReturnTensor> : BatchEncoding<BatchEncodingItem<string, TReturnTensor>>} ApplyChatTemplateReturn
 */
/**
 * `PreTrainedTokenizer` is the base class for all tokenizers in Transformers.js.
 */
export class PreTrainedTokenizer extends PreTrainedTokenizer_base {
    /**
     * Loads a pretrained tokenizer from the given `pretrained_model_name_or_path`.
     *
     * @param {string} pretrained_model_name_or_path The path to the pretrained tokenizer.
     * @param {PretrainedTokenizerOptions} options Additional options for loading the tokenizer.
     *
     * @throws {Error} Throws an error if the tokenizer.json or tokenizer_config.json files are not found in the `pretrained_model_name_or_path`.
     * @returns {Promise<PreTrainedTokenizer>} A new instance of the `PreTrainedTokenizer` class.
     */
    static from_pretrained(pretrained_model_name_or_path: string, { progress_callback, config, cache_dir, local_files_only, revision }?: PretrainedTokenizerOptions): Promise<PreTrainedTokenizer>;
    return_token_type_ids: boolean;
    padding_side: string;
    _tokenizerJSON: any;
    _tokenizerConfig: any;
    _tokenizer: Tokenizer;
    config: any;
    mask_token: string;
    mask_token_id: number;
    pad_token: string;
    pad_token_id: number;
    sep_token: string;
    sep_token_id: number;
    unk_token: string;
    unk_token_id: number;
    bos_token: string;
    bos_token_id: number;
    eos_token: string;
    eos_token_id: number;
    chat_template: any;
    _compiled_template_cache: Map<any, any>;
    all_special_ids: number[];
    all_special_tokens: string[];
    get_vocab(): Map<string, number>;
    get model_max_length(): any;
    get add_eos_token(): any;
    get add_bos_token(): any;
    /**
     * Converts a token string (or a sequence of tokens) into a single integer id (or a sequence of ids), using the vocabulary.
     *
     * @template {string|string[]} T
     * @param {T} tokens One or several token(s) to convert to token id(s).
     * @returns {T extends string ? number : number[]} The token id or list of token ids.
     */
    convert_tokens_to_ids<T extends string | string[]>(tokens: T): T extends string ? number : number[];
    /**
     * Encode/tokenize the given text(s).
     * @template {string|string[]} TText
     * @template {boolean} [TReturnTensor=true]
     * @param {TText} text The text to tokenize.
     * @param {TokenizerCallOptions<TText, TReturnTensor>} [options] Additional tokenization options.
     * @returns {BatchEncoding<BatchEncodingItem<TText, TReturnTensor>>} Object to be passed to the model.
     */
    _call<TText extends string | string[], TReturnTensor extends boolean = true>(text: TText, options?: TokenizerCallOptions<TText, TReturnTensor>): BatchEncoding<BatchEncodingItem<TText, TReturnTensor>>;
    /**
     * Encodes a single text using the preprocessor pipeline of the tokenizer.
     *
     * @param {string|null} text The text to encode.
     * @returns {string[]|null} The encoded tokens.
     */
    _encode_text(text: string | null): string[] | null;
    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text The text to encode.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.text_pair=null] The optional second text to encode.
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @param {boolean|null} [options.return_token_type_ids=null] Whether to return token_type_ids.
     * @returns {{input_ids: number[], attention_mask: number[], token_type_ids?: number[]}} An object containing the encoded text.
     * @private
     */
    private _encode_plus;
    /**
     * Converts a string into a sequence of tokens.
     * @param {string} text The sequence to be encoded.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.pair] A second sequence to be encoded with the first.
     * @param {boolean} [options.add_special_tokens=false] Whether or not to add the special tokens associated with the corresponding model.
     * @returns {string[]} The list of tokens.
     */
    tokenize(text: string, { pair, add_special_tokens }?: {
        pair?: string | null;
        add_special_tokens?: boolean;
    }): string[];
    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text The text to encode.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.text_pair=null] The optional second text to encode.
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @param {boolean|null} [options.return_token_type_ids=null] Whether to return token_type_ids.
     * @returns {number[]} An array of token IDs representing the encoded text(s).
     */
    encode(text: string, { text_pair, add_special_tokens, return_token_type_ids }?: {
        text_pair?: string | null;
        add_special_tokens?: boolean;
        return_token_type_ids?: boolean | null;
    }): number[];
    /**
     * Decode a batch of tokenized sequences.
     * @param {number[][]|Tensor} batch List/Tensor of tokenized input sequences.
     * @param {Object} decode_args (Optional) Object with decoding arguments.
     * @returns {string[]} List of decoded sequences.
     */
    batch_decode(batch: number[][] | Tensor, decode_args?: any): string[];
    /**
     * Decodes a sequence of token IDs back to a string.
     *
     * @param {number[]|bigint[]|Tensor} token_ids List/Tensor of token IDs to decode.
     * @param {Object} [decode_args={}]
     * @param {boolean} [decode_args.skip_special_tokens=false] If true, special tokens are removed from the output string.
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] If true, spaces before punctuation and abbreviated forms are removed.
     *
     * @returns {string} The decoded string.
     * @throws {Error} If `token_ids` is not a non-empty array of integers.
     */
    decode(token_ids: number[] | bigint[] | Tensor, decode_args?: {
        skip_special_tokens?: boolean;
        clean_up_tokenization_spaces?: boolean;
    }): string;
    /**
     * Decode a single list of token ids to a string.
     * @param {number[]|bigint[]} token_ids List of token ids to decode
     * @param {Object} decode_args Optional arguments for decoding
     * @param {boolean} [decode_args.skip_special_tokens=false] Whether to skip special tokens during decoding
     * @param {boolean|null} [decode_args.clean_up_tokenization_spaces=null] Whether to clean up tokenization spaces during decoding.
     * If null, the value is set to `this.decoder.cleanup` if it exists, falling back to `this.clean_up_tokenization_spaces` if it exists, falling back to `true`.
     * @returns {string} The decoded string
     */
    decode_single(token_ids: number[] | bigint[], { skip_special_tokens, clean_up_tokenization_spaces }: {
        skip_special_tokens?: boolean;
        clean_up_tokenization_spaces?: boolean | null;
    }): string;
    /**
     * Retrieve the chat template string used for tokenizing chat messages. This template is used
     * internally by the `apply_chat_template` method and can also be used externally to retrieve the model's chat
     * template for better generation tracking.
     *
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.chat_template=null]
     * A Jinja template or the name of a template to use for this conversion.
     * It is usually not necessary to pass anything to this argument,
     * as the model's template will be used by default.
     * @param {Object[]} [options.tools=null]
     * A list of tools (callable functions) that will be accessible to the model. If the template does not
     * support function calling, this argument will have no effect. Each tool should be passed as a JSON Schema,
     * giving the name, description and argument types for the tool. See our
     * [chat templating guide](https://huggingface.co/docs/transformers/main/en/chat_templating#automated-function-conversion-for-tool-use)
     * for more information.
     * @returns {string} The chat template string.
     */
    get_chat_template({ chat_template, tools }?: {
        chat_template?: string | null;
        tools?: any[];
    }): string;
    /**
     * Converts a list of message objects with `"role"` and `"content"` keys to a list of token
     * ids. This method is intended for use with chat models, and will read the tokenizer's chat_template attribute to
     * determine the format and control tokens to use when converting.
     *
     * See the [chat templating guide](https://huggingface.co/docs/transformers/chat_templating) for more information.
     *
     * **Example:** Applying a chat template to a conversation.
     *
     * ```javascript
     * import { AutoTokenizer } from "@huggingface/transformers";
     *
     * const tokenizer = await AutoTokenizer.from_pretrained("Xenova/mistral-tokenizer-v1");
     *
     * const chat = [
     *   { "role": "user", "content": "Hello, how are you?" },
     *   { "role": "assistant", "content": "I'm doing great. How can I help you today?" },
     *   { "role": "user", "content": "I'd like to show off how chat templating works!" },
     * ]
     *
     * const text = tokenizer.apply_chat_template(chat, { tokenize: false });
     * // "<s>[INST] Hello, how are you? [/INST]I'm doing great. How can I help you today?</s> [INST] I'd like to show off how chat templating works! [/INST]"
     *
     * const input_ids = tokenizer.apply_chat_template(chat, { tokenize: true, return_tensor: false });
     * // [1, 733, 16289, 28793, 22557, 28725, 910, 460, 368, 28804, 733, 28748, 16289, 28793, 28737, 28742, 28719, 2548, 1598, 28723, 1602, 541, 315, 1316, 368, 3154, 28804, 2, 28705, 733, 16289, 28793, 315, 28742, 28715, 737, 298, 1347, 805, 910, 10706, 5752, 1077, 3791, 28808, 733, 28748, 16289, 28793]
     * ```
     *
     * @param {Message[]} conversation A list of message objects with `"role"` and `"content"` keys,
     * representing the chat history so far.
     * @template {boolean} [TTokenize=true]
     * @template {boolean} [TReturnTensor=true]
     * @template {boolean} [TReturnDict=true]
     * @param {ApplyChatTemplateOptions<TTokenize, TReturnTensor, TReturnDict>} [options] Options controlling
     * template rendering and tokenization.
     * @returns {ApplyChatTemplateReturn<TTokenize, TReturnTensor, TReturnDict>} The tokenized output.
     */
    apply_chat_template<TTokenize extends boolean = true, TReturnTensor extends boolean = true, TReturnDict extends boolean = true>(conversation: Message[], options?: ApplyChatTemplateOptions<TTokenize, TReturnTensor, TReturnDict>): ApplyChatTemplateReturn<TTokenize, TReturnTensor, TReturnDict>;
}
export type PretrainedTokenizerOptions = import("./utils/hub.js").PretrainedOptions;
export type TextContent = {
    type: "text";
    text: string;
    [key: string]: any;
};
export type ImageContent = {
    type: "image";
    image?: string | import("./utils/image.js").RawImage;
    [key: string]: any;
};
/**
 * A single content block inside a chat message. Extend the union to add
 * custom types (e.g. `AudioContent`) when targeting a specific model.
 */
export type MessageContent = TextContent | ImageContent | {
    type: string & {};
    [key: string]: any;
};
export type Message = {
    /**
     * The role of the message.
     */
    role: "user" | "assistant" | "system" | (string & {});
    /**
     * The content of the message. Can be a simple string or an array of content objects.
     */
    content: string | MessageContent[];
};
export type BatchEncodingArrayItem<TText extends string | string[]> = TText extends string ? number[] : number[][];
export type BatchEncodingItem<TText extends string | string[], TReturnTensor extends boolean = true> = TReturnTensor extends true ? Tensor : BatchEncodingArrayItem<TText>;
/**
 * The object returned from `tokenizer(text)`. The fields are a `Tensor` by
 * default, or an `Array` when `return_tensor: false` is passed.
 */
export type BatchEncoding<TItem> = {
    /**
     * Token ids to be fed to the model.
     */
    input_ids: TItem;
    /**
     * Mask indicating which tokens should be attended to (1) versus padded (0).
     */
    attention_mask: TItem;
    /**
     * Segment ids, present only for tokenizers that distinguish sequence A vs B (e.g. BERT).
     */
    token_type_ids?: TItem;
};
/**
 * Options passed to `tokenizer(text, options)`.
 */
export type TokenizerCallOptions<TText extends string | string[], TReturnTensor extends boolean = true> = {
    /**
     * Optional second sequence to be encoded. Must match the shape of `text` — string when `text` is a string, array when `text` is an array.
     */
    text_pair?: TText extends string ? string | null : string[] | null;
    /**
     * Whether to pad the input sequences.
     */
    padding?: boolean | "max_length";
    /**
     * Whether or not to add the special tokens associated with the corresponding model.
     */
    add_special_tokens?: boolean;
    /**
     * Whether to truncate the input sequences.
     */
    truncation?: boolean | null;
    /**
     * Maximum length of the returned list and optionally padding length.
     */
    max_length?: number | null;
    /**
     * Whether to return the results as Tensors or arrays.
     */
    return_tensor?: TReturnTensor;
    /**
     * Whether to return the token type ids.
     */
    return_token_type_ids?: boolean | null;
};
export type PreTrainedTokenizerCallback = <TText extends string | string[], TReturnTensor extends boolean = true>(text: TText, options?: TokenizerCallOptions<TText, TReturnTensor>) => BatchEncoding<BatchEncodingItem<TText, TReturnTensor>>;
export type ApplyChatTemplateOptions<TTokenize extends boolean = true, TReturnTensor extends boolean = true, TReturnDict extends boolean = true> = {
    /**
     * A Jinja template to use for this conversion. If omitted, the model's chat template is used.
     */
    chat_template?: string | null;
    /**
     * JSON Schema tool definitions exposed to templates that support function calling.
     * See the [chat templating guide](https://huggingface.co/docs/transformers/main/en/chat_templating#automated-function-conversion-for-tool-use).
     */
    tools?: any[] | null;
    /**
     * Documents exposed to templates that support retrieval-augmented generation.
     * See the [RAG section](https://huggingface.co/docs/transformers/main/en/chat_templating#arguments-for-RAG) of the chat templating guide.
     */
    documents?: Record<string, string>[] | null;
    /**
     * Whether to end the prompt with the token(s) that indicate the start of an assistant message.
     * The template must support this argument for it to have any effect.
     */
    add_generation_prompt?: boolean;
    /**
     * Whether to tokenize the output. If false, the output will be a string.
     */
    tokenize?: TTokenize;
    /**
     * Whether to pad sequences to the maximum length. Has no effect if tokenize is false.
     */
    padding?: boolean;
    /**
     * Whether to truncate sequences to the maximum length. Has no effect if tokenize is false.
     */
    truncation?: boolean;
    /**
     * Maximum length (in tokens) to use for padding or truncation. If omitted, the tokenizer's `max_length` is used.
     * Has no effect if tokenize is false.
     */
    max_length?: number | null;
    /**
     * Whether to return the output as a Tensor or an Array. Has no effect if tokenize is false.
     */
    return_tensor?: TReturnTensor;
    /**
     * Whether to return a dictionary with named outputs. Has no effect if tokenize is false.
     */
    return_dict?: TReturnDict;
    /**
     * Additional options to pass to the tokenizer.
     */
    tokenizer_kwargs?: any;
};
export type ApplyChatTemplateReturn<TTokenize extends boolean = true, TReturnTensor extends boolean = true, TReturnDict extends boolean = true> = TTokenize extends false ? string : TReturnDict extends false ? BatchEncodingItem<string, TReturnTensor> : BatchEncoding<BatchEncodingItem<string, TReturnTensor>>;
import { Tensor } from './utils/tensor.js';
import { Tokenizer } from '@huggingface/tokenizers';
export {};
//# sourceMappingURL=tokenization_utils.d.ts.map