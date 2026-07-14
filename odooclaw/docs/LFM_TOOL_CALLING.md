# LFM2.5 Native Tool Calling Contract

OdooClaw supports both tool-call output contracts:

1. **OpenAI/OdooClaw JSON wrapper** — kept for existing CLI providers and fine-tunes:

   ```json
   {"tool_calls":[{"id":"call_1","type":"function","function":{"name":"tool_name","arguments":"{\"key\":\"value\"}"}}]}
   ```

2. **LFM2.5 native format** — preferred for LFM2.5 fine-tuning and inference:

   ```text
   <|tool_call_start|>[tool_name(key="value", count=1, flag=True)]<|tool_call_end|>
   ```

Liquid's documented LFM2.5 behavior is Pythonic function calls wrapped in
`<|tool_call_start|>` and `<|tool_call_end|>`. OdooClaw now parses that native
format directly, so the LFM training pipeline should not force the model into the
legacy JSON wrapper.

## Training target for LFM2.5

Use the native token contract in assistant messages whenever the answer requires a
tool call:

```text
<|tool_call_start|>[get_candidate_status(candidate_id="12345")]<|tool_call_end|>
```

Multiple calls belong in the same Python-style list:

```text
<|tool_call_start|>[read_file(path="/tmp/in", limit=20), write_file(path="/tmp/out", content="hello", overwrite=True)]<|tool_call_end|>
```

Supported argument values:

- strings: `path="/tmp/in"`
- numbers: `limit=20`
- booleans: `overwrite=True` / `overwrite=False`
- null-like values: `value=None`
- JSON/Python-style arrays or objects when the model emits structured values

OdooClaw normalizes parsed calls into the internal `ToolCall` shape with:

- synthetic IDs: `lfm_call_1`, `lfm_call_2`, ...
- type: `function`
- normalized function name
- decoded argument map
- `Function.Arguments` re-encoded as JSON for downstream compatibility

## Compatibility policy

The final contract is **dual format support**:

- Existing JSON wrapper output remains valid.
- LFM2.5 native token output is valid and preferred for LFM2.5 training.
- Gemma/MiniCPM compatibility parsers remain unchanged.

This avoids retraining LFM2.5 away from its native chat template while preserving
backward compatibility for existing OdooClaw models and CLI providers.
