# FreeQwenApi fork demo quickstart

This fork is optimized for a practical video/demo workflow:

- current Qwen Chat model list sync (`qwen3.7-max`, `qwen3.7-plus`, `qwen3.6-plus`);
- OpenAI-compatible local endpoint for SDKs, Hermes Agent, Open WebUI, and LiteLLM;
- quick smoke test command for recording without guessing whether the proxy is alive.

## 1. Auth once

```bash
npm install
npm run auth
```

Do not show `session/`, cookies, or token files on screen.

## 2. Sync current Qwen Chat models

```bash
npm run models:sync
```

This reads public prerendered model metadata from `https://chat.qwen.ai/`, merges it with `src/AvailableModels.txt`, and writes a report to:

```text
docs/QWEN_CHAT_MODELS.md
```

## 3. Start the endpoint

```bash
SKIP_ACCOUNT_MENU=true npm start
```

Endpoint:

```text
http://localhost:3264/api
```

## 4. Run a smoke test

In another terminal:

```bash
npm run smoke
```

Default smoke model:

```text
qwen3.7-max
```

Override it:

```bash
QWEN_PROXY_SMOKE_MODEL=qwen3.7-plus npm run smoke
```

## 5. OpenAI SDK / curl test

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "messages": [
      {"role": "user", "content": "Ответь одним предложением: что такое локальный endpoint?"}
    ],
    "stream": false
  }'
```

## 6. Hermes Agent provider example

```yaml
custom_providers:
  - name: qwen-free
    base_url: http://localhost:3264/api
    model: qwen3.7-max
    api_key: dummy-key
```

Run:

```bash
hermes chat --provider custom:qwen-free --model qwen3.7-max
```

## 7. Claude Code via LiteLLM bridge

Claude Code expects Anthropic Messages API, while this proxy exposes OpenAI Chat Completions. Use LiteLLM as a bridge:

```yaml
model_list:
  - model_name: qwen3.7-max
    litellm_params:
      model: openai/qwen3.7-max
      api_base: http://localhost:3264/api
      api_key: dummy-key

general_settings:
  master_key: sk-qwen-local
```

Start LiteLLM:

```bash
litellm --config qwen_litellm.yaml --host 127.0.0.1 --port 4000
```

Run Claude Code:

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:4000"
export ANTHROPIC_AUTH_TOKEN="sk-qwen-local"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
claude --model qwen3.7-max
```

## Video positioning

Use this wording:

> This is not a local model running on your GPU. It is a local OpenAI-compatible proxy to Qwen Chat, useful for experiments with AI agents and local tooling.

Avoid promising production stability: Qwen Chat limits, token expiry, account status, and API compatibility can change.
