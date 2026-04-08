# Troubleshooting

## "model ... not found in model_list" or OpenRouter "free is not a valid model ID"

**Symptom:** You see either:

- `Error creating provider: model "openrouter/free" not found in model_list`
- OpenRouter returns 400: `"free is not a valid model ID"`

**Cause:** The `model` field in your `model_list` entry is what gets sent to the API. For OpenRouter you must use the **full** model ID, not a shorthand.

- **Wrong:** `"model": "free"` → OpenRouter receives `free` and rejects it.
- **Right:** `"model": "openrouter/free"` → OpenRouter receives `openrouter/free` (auto free-tier routing).

**Fix:** In `~/.odooclaw/config.json` (or your config path):

1. **agents.defaults.model** must match a `model_name` in `model_list` (e.g. `"openrouter-free"`).
2. That entry’s **model** must be a valid OpenRouter model ID, for example:
   - `"openrouter/free"` – auto free-tier
   - `"google/gemini-2.0-flash-exp:free"`
   - `"meta-llama/llama-3.1-8b-instruct:free"`

Example snippet:

```json
{
  "agents": {
    "defaults": {
      "model": "openrouter-free"
    }
  },
  "model_list": [
    {
      "model_name": "openrouter-free",
      "model": "openrouter/free",
      "api_key": "sk-or-v1-YOUR_OPENROUTER_KEY",
      "api_base": "https://openrouter.ai/api/v1"
    }
  ]
}
```

Get your key at [OpenRouter Keys](https://openrouter.ai/keys).

## Gemma emits literal tool-call text (e.g. `<|toolcall>call:...`)

**Symptom:** With Gemma-family models, answers include raw tool-call text instead of standard `tool_calls` JSON, for example:

- `<|toolcall>call:mcpwhisper-sttwhisper-transcribe{"audio_path":"..."}`
- `<|toolcall>call:mcpodoo-mcp...{...}`

**Cause:** Some models emit pseudo function-call syntax that differs from OpenAI-style `{"tool_calls":[...]}` wrappers.

**Current behavior:** OdooClaw now normalizes these variants by:

1. extracting Gemma-style `call:<tool>{args}` tool calls,
2. repairing malformed JSON when braces are truncated,
3. parsing nested payload arguments (for example `payload:{domain:[...],model:"project.task"}`),
4. stripping pseudo tool-call text from user-visible content,
5. resolving normalized tool names through fallback fuzzy lookup.

**If it still fails:**

- keep tool names stable in prompts (`mcp_<server>_<tool>`),
- avoid extra prose around tool-call snippets,
- verify the target tool appears in runtime tool list,
- upgrade to the latest branch with Gemma compatibility patches.
