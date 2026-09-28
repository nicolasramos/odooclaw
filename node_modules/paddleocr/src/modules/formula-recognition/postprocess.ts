import type { FormulaRecognitionRuntimeOptions, OrtTensor } from "../../interface.ts";

export interface FormulaRecognitionResult {
    formula: string;
    tokenIds: number[];
    tokens: string[];
}

type FormulaRecognitionPostprocessOptions = Pick<
    FormulaRecognitionRuntimeOptions,
    "tokenizerVocabulary" | "specialTokenIds" | "maxSequenceLength"
>;

type FormulaSpecialTokenIds = NonNullable<FormulaRecognitionRuntimeOptions["specialTokenIds"]>;

const DEFAULT_SPECIAL_TOKEN_IDS: FormulaSpecialTokenIds = {
    bos: 0,
    pad: 1,
    eos: 2,
    unk: 3,
};

const BYTE_DECODER = createByteLevelDecoder();

export function postprocessFormulaRecognition(
    outputs: Record<string, OrtTensor>,
    options: FormulaRecognitionPostprocessOptions
): FormulaRecognitionResult {
    const vocabulary = validateFormulaTokenizerVocabulary(options.tokenizerVocabulary);
    const outputTensor = selectFormulaRecognitionOutputTensor(outputs, vocabulary.length);
    const tokenIds = extractFormulaTokenIds(outputTensor, vocabulary.length);
    const clippedTokenIds =
        options.maxSequenceLength && tokenIds.length > options.maxSequenceLength
            ? tokenIds.slice(0, options.maxSequenceLength)
            : tokenIds;
    const decoded = decodeFormulaTokenIds(clippedTokenIds, vocabulary, options.specialTokenIds);

    return {
        formula: decoded.formula,
        tokenIds: decoded.tokenIds,
        tokens: decoded.tokens,
    };
}

export function createFormulaTokenizerVocabulary(tokenizerJson: unknown): string[] {
    if (!isObject(tokenizerJson)) {
        throw new Error("Formula tokenizer JSON must be an object.");
    }

    const model = tokenizerJson.model;
    if (!isObject(model) || !isObject(model.vocab)) {
        throw new Error("Formula tokenizer JSON must contain model.vocab.");
    }

    const vocabulary: string[] = [];
    for (const [token, id] of Object.entries(model.vocab)) {
        if (!Number.isInteger(id) || (id as number) < 0) {
            throw new Error(`Invalid formula tokenizer id for token '${token}': ${String(id)}.`);
        }
        vocabulary[id as number] = token;
    }

    return validateFormulaTokenizerVocabulary(vocabulary).slice();
}

function selectFormulaRecognitionOutputTensor(
    outputs: Record<string, OrtTensor>,
    vocabularyLength: number
): OrtTensor {
    const entries = Object.entries(outputs);
    const supported = entries.filter(([, tensor]) =>
        isSupportedFormulaOutputTensor(tensor, vocabularyLength)
    );
    if (supported.length === 0) {
        throw new Error(
            `Formula recognition output tensor with token ids or logits not found. Available outputs: ${Object.keys(outputs).join(", ")}`
        );
    }

    const preferred = supported.find(([name]) =>
        /^(word_pred|sequences?|tokens?|logits?|output0?)$/i.test(name)
    );
    return (preferred ?? supported[0])[1];
}

function isSupportedFormulaOutputTensor(tensor: OrtTensor, vocabularyLength: number): boolean {
    return isFormulaTokenIdTensor(tensor) || isFormulaLogitsTensor(tensor, vocabularyLength);
}

function isFormulaTokenIdTensor(tensor: OrtTensor): boolean {
    if (tensor.dims.length !== 1 && !(tensor.dims.length === 2 && tensor.dims[0] === 1)) {
        return false;
    }
    return isIntegerLikeTensorData(tensor.data);
}

function isFormulaLogitsTensor(tensor: OrtTensor, vocabularyLength: number): boolean {
    if (!(tensor.data instanceof Float32Array)) {
        return false;
    }
    if (tensor.dims.length === 2) {
        return tensor.dims[1] === vocabularyLength;
    }
    return tensor.dims.length === 3 && tensor.dims[0] === 1 && tensor.dims[2] === vocabularyLength;
}

function extractFormulaTokenIds(tensor: OrtTensor, vocabularyLength: number): number[] {
    if (isFormulaTokenIdTensor(tensor)) {
        return Array.from(tensor.data as ArrayLike<number | bigint>, (value) =>
            numberFromTokenId(value)
        );
    }

    if (!isFormulaLogitsTensor(tensor, vocabularyLength)) {
        throw new Error(`Unsupported formula recognition output shape [${tensor.dims.join(",")}].`);
    }

    const data = tensor.data as Float32Array;
    const sequenceLength = tensor.dims.length === 2 ? tensor.dims[0] : tensor.dims[1];
    const tokenIds: number[] = [];
    for (let tokenIndex = 0; tokenIndex < sequenceLength; tokenIndex += 1) {
        const offset = tokenIndex * vocabularyLength;
        tokenIds.push(argmax(data, offset, vocabularyLength));
    }
    return tokenIds;
}

function decodeFormulaTokenIds(
    tokenIds: number[],
    vocabulary: readonly string[],
    specialTokenIds = DEFAULT_SPECIAL_TOKEN_IDS
): FormulaRecognitionResult {
    const skipTokenIds = new Set([
        specialTokenIds.bos,
        specialTokenIds.pad,
        specialTokenIds.unk,
        ...(specialTokenIds.additional ?? []),
    ]);
    const keptTokenIds: number[] = [];
    const tokens: string[] = [];

    for (const tokenId of tokenIds) {
        if (tokenId === specialTokenIds.eos) {
            break;
        }
        if (skipTokenIds.has(tokenId)) {
            continue;
        }
        const token = vocabulary[tokenId];
        if (token === undefined) {
            throw new Error(`Formula token id ${tokenId} is outside tokenizer vocabulary.`);
        }
        keptTokenIds.push(tokenId);
        tokens.push(token);
    }

    return {
        formula: decodeByteLevelTokens(tokens),
        tokenIds: keptTokenIds,
        tokens,
    };
}

function decodeByteLevelTokens(tokens: readonly string[]): string {
    const bytes: number[] = [];
    for (const char of tokens.join("")) {
        const byte = BYTE_DECODER.get(char);
        if (byte === undefined) {
            for (const codePoint of new TextEncoder().encode(char)) {
                bytes.push(codePoint);
            }
        } else {
            bytes.push(byte);
        }
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
}

function createByteLevelDecoder(): Map<string, number> {
    const bytes: number[] = [];
    for (let value = 33; value <= 126; value += 1) {
        bytes.push(value);
    }
    for (let value = 161; value <= 172; value += 1) {
        bytes.push(value);
    }
    for (let value = 174; value <= 255; value += 1) {
        bytes.push(value);
    }

    const chars = bytes.slice();
    let nextCodePoint = 0;
    for (let value = 0; value <= 255; value += 1) {
        if (!bytes.includes(value)) {
            bytes.push(value);
            chars.push(256 + nextCodePoint);
            nextCodePoint += 1;
        }
    }

    return new Map(
        chars.map((codePoint, index) => [String.fromCodePoint(codePoint), bytes[index]])
    );
}

function argmax(data: Float32Array, offset: number, length: number): number {
    let bestIndex = 0;
    let bestScore = data[offset];
    for (let index = 1; index < length; index += 1) {
        const score = data[offset + index];
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    }
    return bestIndex;
}

function numberFromTokenId(value: number | bigint): number {
    const tokenId = typeof value === "bigint" ? Number(value) : value;
    if (!Number.isInteger(tokenId) || tokenId < 0) {
        throw new Error(`Invalid formula token id: ${String(value)}.`);
    }
    return tokenId;
}

function validateFormulaTokenizerVocabulary(vocabulary: unknown): readonly string[] {
    if (!Array.isArray(vocabulary) || vocabulary.length === 0) {
        throw new Error("Formula recognition tokenizerVocabulary is required.");
    }
    for (const [index, token] of vocabulary.entries()) {
        if (typeof token !== "string") {
            throw new Error(`Invalid formula tokenizer token at id ${index}.`);
        }
    }
    return vocabulary;
}

function isIntegerLikeTensorData(data: OrtTensor["data"]): boolean {
    return (
        data instanceof Int8Array ||
        data instanceof Uint8Array ||
        data instanceof Int16Array ||
        data instanceof Uint16Array ||
        data instanceof Int32Array ||
        data instanceof Uint32Array ||
        data instanceof BigInt64Array ||
        data instanceof BigUint64Array
    );
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
