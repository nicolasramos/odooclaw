<p align="center">
    <br/>
    <picture> 
        <source media="(prefers-color-scheme: dark)" srcset="https://huggingface.co/datasets/nico-martin/tokenizers.js/raw/main/tokenizersjs-dark.svg" width="500" style="max-width: 100%;">
        <source media="(prefers-color-scheme: light)" srcset="https://huggingface.co/datasets/nico-martin/tokenizers.js/raw/main/tokenizersjs-light.svg" width="500" style="max-width: 100%;">
        <img alt="transformers.js javascript library logo" src="https://huggingface.co/datasets/nico-martin/tokenizers.js/raw/main/tokenizersjs-light.svg" width="500" style="max-width: 100%;">
    </picture>
    <br/>
</p>

<p align="center">
    <a href="https://github.com/huggingface/tokenizers.js/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/huggingface/transformers.js?color=blue"></a>
</p>

<h3 align="center">
  <p>A lightweight tokenizer for the Web</p>
</h3>

Run today's most used tokenizers directly in your browser or Node.js application. No heavy dependencies, no server required. Just fast, client-side tokenization compatible with thousands of models on the Hugging Face Hub. These tokenizers are also used in [🤗 Transformers.js](https://github.com/huggingface/transformers.js)

## Features

- Lightweight (~ 8.3kB gzip)
- Zero dependencies
- Works in browsers and Node.js

## Installation

```bash
npm install @huggingface/tokenizers
```

Alternatively, you can use it via a CDN as follows:

```html
<script type="module">
  import { Tokenizer } from "https://cdn.jsdelivr.net/npm/@huggingface/tokenizers";
</script>
```

## Usage

```javascript
import { Tokenizer } from "@huggingface/tokenizers";

// Load files from the Hugging Face Hub
const modelId = "HuggingFaceTB/SmolLM3-3B";
const tokenizerJson = await fetch(`https://huggingface.co/${modelId}/resolve/main/tokenizer.json`).then((res) => res.json());
const tokenizerConfig = await fetch(`https://huggingface.co/${modelId}/resolve/main/tokenizer_config.json`).then((res) => res.json());

// Create tokenizer
const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig);

// Tokenize text
const tokens = tokenizer.tokenize("Hello World"); // ['Hello', 'ĠWorld']
const encoded = tokenizer.encode("Hello World"); // { ids: [9906, 4435], tokens: ['Hello', 'ĠWorld'], attention_mask: [1, 1] }
const decoded = tokenizer.decode(encoded.ids); // 'Hello World'
```

## Requirements

This library expects two files from Hugging Face models:

- `tokenizer.json` - Contains the tokenizer configuration
- `tokenizer_config.json` - Contains additional metadata

## Regex compatibility

Tokenizer configs are authored for the Rust `tokenizers` crate, which compiles patterns with Oniguruma — a regex engine whose syntax and Unicode semantics differ from JavaScript `RegExp`. Tokenizers.js translates these patterns structurally in JavaScript `u` mode, matching Oniguruma behavior for: line anchors (`^`/`$` recognize only `\n`, unlike JavaScript's `m` flag), absolute anchors (`\A`, `\z`, `\Z`), `.` (which excludes only `\n`), word/digit/space shorthands (including Oniguruma's exact word-character set and its Latin-1 ctype quirks), `\h`/`\H` hex digits, `\b`/`\B` boundaries, inline case-insensitive groups (including ranges like `(?i:[a-f])` and applying ASCII case folding after character-class set operations), stacked quantifiers (`X{3}+`), common POSIX bracket expressions (`alpha`, `alnum`, `digit`, `lower`, `upper`, `space`, `blank`, `punct`, `cntrl`, `word`, and `xdigit`), balanced character-class intersections (`&&`) with ordinary, nested, negated, or POSIX operands and chaining, `\x{...}` code points, `\p{Word}`, identity escapes, and literal braces/brackets.

A few constructs can't be fully reproduced — notably `\G`, full Unicode case folding (e.g. `ß` ~ `ss`), unlisted POSIX classes, negated POSIX `lower`/`upper` classes inside inline case-insensitive groups, POSIX collating and equivalence bracket expressions (`[.x.]` and `[=x=]`), and the `MergedWithPrevious`/`MergedWithNext`/`Contiguous` split behaviors. Atomic groups and possessive quantifiers are accepted as ordinary groups and quantifiers, so backtracking-sensitive patterns can diverge.

Malformed intersections (including unbalanced or empty operands) and ranges with set-valued endpoints — Unicode properties, POSIX or shorthand classes, nested classes, or complements — throw `SyntaxError`. The translator also rejects outer-negated intersections containing a nested negated class over one of those sets (for example, `[^[^\p{L}]&&[a]]`), whose Oniguruma semantics cannot be represented safely in JavaScript `u` mode. Direct complements such as `\P{L}`, `[[:^alpha:]]`, and `\W`, and scalar/range forms such as `[^a-z&&[^m-p]]`, remain supported. Character-class nesting is limited to 256 levels; escape a literal `&&` as `\&\&`.

## Components

Tokenizers.js supports [Hugging Face tokenizer components](https://huggingface.co/docs/tokenizers/components):

### Normalizers

- NFD
- NFKC
- NFC
- NFKD
- Lowercase
- Strip
- StripAccents
- Replace
- BERT Normalizer
- Precompiled
- Sequence

### Pre-tokenizers

- BERT
- ByteLevel
- Whitespace
- WhitespaceSplit
- Metaspace
- CharDelimiterSplit
- Split
- Punctuation
- Digits

### Models

- BPE (Byte-Pair Encoding)
- WordPiece
- Unigram
- Legacy

### Post-processors

- ByteLevel
- TemplateProcessing
- RobertaProcessing
- BertProcessing
- Sequence

### Decoders

- ByteLevel
- WordPiece
- Metaspace
- BPE
- CTC
- Replace
- Fuse
- Strip
- ByteFallback
- Sequence
