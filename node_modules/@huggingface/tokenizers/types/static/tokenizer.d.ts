export interface TokenizerConfig {
    tokenizer_class?: string;
    model_type?: string;
    name_or_path?: string;
    bos_token?: string;
    eos_token?: string;
    unk_token?: string;
    sep_token?: string;
    pad_token?: string;
    cls_token?: string;
    mask_token?: string;
    target_lang?: string;
    additional_special_tokens?: Array<string>;
    add_bos_token?: boolean;
    add_eos_token?: boolean;
    add_prefix_space?: boolean;
    clean_up_tokenization_spaces?: boolean;
    split_special_tokens?: boolean;
    spaces_between_special_tokens?: boolean;
    strip_accents?: boolean | null;
    remove_space?: boolean | null;
    do_lower_case?: boolean;
    do_basic_tokenize?: boolean;
    never_split?: string[];
    do_lowercase_and_remove_accent?: boolean;
    chat_template?: string | string[] | Record<string, string>;
    processor_class?: string;
    legacy?: boolean;
    use_fast?: boolean;
    tokenize_chinese_chars?: boolean;
    wordpieces_prefix?: string;
    [key: string]: unknown;
}
export interface TokenConfig {
    content: string;
    single_word?: boolean;
    lstrip?: boolean;
    rstrip?: boolean;
    normalized?: boolean;
    special?: boolean;
}
export interface TokenizerJSON {
    version?: string;
    added_tokens?: AddedToken[];
    normalizer?: TokenizerConfigNormalizer;
    pre_tokenizer?: TokenizerConfigPreTokenizer;
    post_processor?: TokenizerConfigPostProcessor;
    decoder?: TokenizerConfigDecoder;
    model: TokenizerModelConfig;
}
export interface AddedToken {
    id: number;
    content: string;
    single_word?: boolean;
    lstrip?: boolean;
    rstrip?: boolean;
    normalized?: boolean;
    special?: boolean;
}
export interface TokenizerConfigNormalizerBert {
    type: "BertNormalizer";
    clean_text?: boolean;
    handle_chinese_chars?: boolean;
    strip_accents?: boolean;
    lowercase?: boolean;
}
export interface TokenizerConfigNormalizerPrecompiled {
    type: "Precompiled";
    precompiled_charsmap: string;
}
export interface TokenizerConfigNormalizerSequence {
    type: "Sequence";
    normalizers: TokenizerConfigNormalizer[];
}
export interface TokenizerConfigNormalizerReplace {
    type: "Replace";
    pattern: ReplacePattern;
    content: string;
}
export interface TokenizerConfigNormalizerNfd {
    type: "NFD";
}
export interface TokenizerConfigNormalizerNfkd {
    type: "NFKD";
}
export interface TokenizerConfigNormalizerNfc {
    type: "NFC";
}
export interface TokenizerConfigNormalizerNfkc {
    type: "NFKC";
}
export interface TokenizerConfigNormalizerLowercase {
    type: "Lowercase";
}
export interface TokenizerConfigNormalizerStrip {
    type: "Strip";
    strip_left?: boolean;
    strip_right?: boolean;
}
export interface TokenizerConfigNormalizerStripAccents {
    type: "StripAccents";
}
export interface TokenizerConfigNormalizerPrepend {
    type: "Prepend";
    prepend: string;
}
export type TokenizerConfigNormalizer = TokenizerConfigNormalizerNfd | TokenizerConfigNormalizerNfkd | TokenizerConfigNormalizerNfc | TokenizerConfigNormalizerNfkc | TokenizerConfigNormalizerLowercase | TokenizerConfigNormalizerStrip | TokenizerConfigNormalizerStripAccents | TokenizerConfigNormalizerReplace | TokenizerConfigNormalizerBert | TokenizerConfigNormalizerSequence | TokenizerConfigNormalizerPrepend | TokenizerConfigNormalizerPrecompiled;
export interface ReplacePattern {
    String?: string;
    Regex?: string;
}
export type PrependScheme = "always" | "never" | "first";
export interface PreTokenizeTextOptions {
    section_index?: number;
}
export interface TokenizerConfigPreTokenizerByteLevel {
    type: "ByteLevel";
    add_prefix_space?: boolean;
    trim_offsets?: boolean;
    use_regex?: boolean;
}
export interface TokenizerConfigPreTokenizerWhitespace {
    type: "Whitespace";
}
export interface TokenizerConfigPreTokenizerWhitespaceSplit {
    type: "WhitespaceSplit";
}
export interface TokenizerConfigPreTokenizerBert {
    type: "BertPreTokenizer";
}
export interface TokenizerConfigPreTokenizerMetaspace {
    type: "Metaspace";
    replacement?: string;
    str_rep?: string;
    prepend_scheme?: PrependScheme;
}
export interface TokenizerConfigPreTokenizerCharDelimiterSplit {
    type: "CharDelimiterSplit";
    delimiter: string;
}
export interface TokenizerConfigPreTokenizerSplit {
    type: "Split";
    pattern: ReplacePattern;
    behavior: "Removed" | "Isolated" | "MergedWithPrevious" | "MergedWithNext" | "Contiguous";
    invert?: boolean;
}
export interface TokenizerConfigPreTokenizerReplace {
    type: "Replace";
    pattern: ReplacePattern;
    content?: string;
}
export interface TokenizerConfigPreTokenizerPunctuation {
    type: "Punctuation";
    behavior?: "Removed" | "Isolated" | "MergedWithPrevious" | "MergedWithNext" | "Contiguous";
}
export interface TokenizerConfigPreTokenizerSequence {
    type: "Sequence";
    pretokenizers: TokenizerConfigPreTokenizer[];
}
export interface TokenizerConfigPreTokenizerDigits {
    type: "Digits";
    individual_digits?: boolean;
}
export interface TokenizerConfigPreTokenizerUnicodeScripts {
    type: "UnicodeScripts";
}
export interface TokenizerConfigPreTokenizerFixedLength {
    type: "FixedLength";
    length: number;
}
export type TokenizerConfigPreTokenizer = TokenizerConfigPreTokenizerByteLevel | TokenizerConfigPreTokenizerWhitespace | TokenizerConfigPreTokenizerWhitespaceSplit | TokenizerConfigPreTokenizerBert | TokenizerConfigPreTokenizerMetaspace | TokenizerConfigPreTokenizerCharDelimiterSplit | TokenizerConfigPreTokenizerSplit | TokenizerConfigPreTokenizerPunctuation | TokenizerConfigPreTokenizerSequence | TokenizerConfigPreTokenizerDigits | TokenizerConfigPreTokenizerUnicodeScripts | TokenizerConfigPreTokenizerReplace | TokenizerConfigPreTokenizerFixedLength;
export interface SpecialToken {
    id: string;
    ids: number[];
    tokens: string[];
    type_id?: number;
}
interface Sequence {
    id: string;
    type_id?: number;
}
type TemplateItem = {
    SpecialToken: SpecialToken;
} | {
    Sequence: Sequence;
};
export interface TokenizerConfigPostProcessorTemplateProcessing {
    type: "TemplateProcessing";
    single: Array<TemplateItem>;
    pair: Array<TemplateItem>;
    special_tokens?: Record<string, SpecialToken>;
}
export interface TokenizerConfigPostProcessorByteLevel {
    type: "ByteLevel";
    add_prefix_space?: boolean;
    trim_offsets?: boolean;
    use_regex?: boolean;
}
export interface TokenizerConfigPostProcessorRoberta {
    type: "RobertaProcessing";
    sep: [string, number];
    cls: [string, number];
    trim_offsets?: boolean;
    add_prefix_space?: boolean;
}
export interface TokenizerConfigPostProcessorBert {
    type: "BertProcessing";
    sep: [string, number];
    cls: [string, number];
}
export interface TokenizerConfigPostProcessorSequence {
    type: "Sequence";
    processors: TokenizerConfigPostProcessor[];
}
export type TokenizerConfigPostProcessor = TokenizerConfigPostProcessorTemplateProcessing | TokenizerConfigPostProcessorByteLevel | TokenizerConfigPostProcessorRoberta | TokenizerConfigPostProcessorBert | TokenizerConfigPostProcessorSequence;
export interface SpecialToken {
    id: string;
    ids: number[];
    tokens: string[];
}
export interface TokenizerConfigDecoderByteLevel {
    type: "ByteLevel";
    add_prefix_space?: boolean;
    trim_offsets?: boolean;
    use_regex?: boolean;
}
export interface TokenizerConfigDecoderWordPiece {
    type: "WordPiece";
    prefix?: string;
    cleanup?: boolean;
}
export interface TokenizerConfigDecoderMetaspace {
    type: "Metaspace";
    replacement?: string;
    prepend_scheme?: "always" | "never" | "first";
}
export interface TokenizerConfigDecoderBPE {
    type: "BPEDecoder";
    suffix?: string;
}
export interface TokenizerConfigDecoderCTC {
    type: "CTC";
    pad_token?: string;
    word_delimiter_token?: string;
    cleanup?: boolean;
}
export interface TokenizerConfigDecoderSequence {
    type: "Sequence";
    decoders: TokenizerConfigDecoder[];
}
export interface TokenizerConfigDecoderReplace {
    type: "Replace";
    pattern: ReplacePattern;
    content: string;
}
export interface TokenizerConfigDecoderFuse {
    type: "Fuse";
}
export interface TokenizerConfigDecoderByteFallback {
    type: "ByteFallback";
}
export interface TokenizerConfigDecoderStrip {
    type: "Strip";
    content: string;
    start: number;
    stop: number;
}
export type TokenizerConfigDecoder = TokenizerConfigDecoderByteLevel | TokenizerConfigDecoderWordPiece | TokenizerConfigDecoderMetaspace | TokenizerConfigDecoderBPE | TokenizerConfigDecoderCTC | TokenizerConfigDecoderSequence | TokenizerConfigDecoderReplace | TokenizerConfigDecoderFuse | TokenizerConfigDecoderStrip | TokenizerConfigDecoderByteFallback;
export type TokenizerModelConfig = TokenizerConfigBPEModel | TokenizerConfigWordPieceModel | TokenizerConfigUnigramModel | TokenizerModelConfigLegacy;
export interface TokenizerConfigBPEModel {
    type: "BPE";
    dropout?: number | null;
    unk_token?: string | null;
    continuing_subword_suffix?: string | null;
    end_of_word_suffix?: string | null;
    fuse_unk?: boolean;
    byte_fallback?: boolean;
    vocab: Record<string, number>;
    merges: string[] | [string, string][];
    ignore_merges: boolean;
}
export interface TokenizerConfigWordPieceModel {
    type: "WordPiece";
    unk_token?: string;
    continuing_subword_prefix?: string;
    max_input_chars_per_word?: number;
    vocab: Record<string, number>;
}
export interface TokenizerConfigUnigramModel {
    type: "Unigram";
    unk_id?: number | null;
    vocab: Array<[string, number]>;
}
export interface TokenizerModelConfigLegacy {
    type: "Legacy";
    vocab: Record<string, Record<string, number>> | Record<string, number>;
}
export {};
