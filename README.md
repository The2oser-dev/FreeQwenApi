# FreeQwenApi
**🌍 Language / Язык / 语言 / Idioma:** [English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)



> **A local OpenAI-compatible proxy to Qwen Chat**.  
> Text, Qwen 3.7 models, files, Open WebUI, Hermes/LiteLLM, and now also image and video generation via Qwen Chat.

![API](https://img.shields.io/badge/API-OpenAI--compatible-green)
![Qwen](https://img.shields.io/badge/Qwen-Chat-purple)

## What it is

FreeQwenApi turns a Qwen Chat web account into a local API endpoint:

```text
http://localhost:3264/api
```

This is **not a local model on your GPU** and **not the official Alibaba/Qwen API**. It is a practical browser-based proxy: you authorize in Qwen Chat, the project saves the session and gives you a local OpenAI-compatible API for your tools.

## Fork features

- **Chat Completions API**: `POST /api/chat/completions`, compatible with the OpenAI SDK, Open WebUI, LiteLLM and agents.
- **All Qwen Chat models**: the proxy accepts **any model ID** (including new ones from Qwen Chat that are not yet in `src/AvailableModels.txt`) and passes it to Qwen as-is: `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max`, `qwen3-235b-a22b`, etc.
- **Image generation via Qwen Chat**: `POST /api/images/generations` without `DASHSCOPE_API_KEY`.
- **Video generation via Qwen Chat**: `POST /api/videos/generations` + task polling via `GET /api/tasks/status/:taskId`.
- **Multi-accounts**: adding, re-login, removal, `OK` / `WAIT` / `INVALID` statuses, automatic round-robin rotation on limits.
- **File upload**: upload endpoint for Qwen files and attachments.
- **Open WebUI**: can be connected as an OpenAI-compatible backend.
- **Hermes Agent / OpenCode / Claude Code / Codex / OpenClaw / LiteLLM**: ready-made instructions for local AI agents and tool-use smoke tests.
- **Health/smoke tooling**: `/api/health`, `/api/status`, `/api/models`, `npm run smoke`, `npm run models:sync`.

## Quick start

```bash
git clone https://github.com/The2oser-dev/FreeQwenApi
cd FreeQwenApi
npm install
npm run auth
npm run models:sync
SKIP_ACCOUNT_MENU=true npm start
```

In another terminal:

```bash
npm run smoke
```

If everything works, the API is available here:

```text
http://localhost:3264/api
```

## Configuration via `.env`

The project automatically reads `.env` from the repository root. Start from the example:

```bash
cp .env.example .env
```

The most useful settings for agent clients:

- `QWEN_TOOL_PROMPT_MODE=minimal` — compactly embeds OpenAI `tools` / `functions` into the prompt. This is the best mode for Hermes, OpenCode, Claude Code, Codex and OpenClaw.
- `QWEN_MAX_SYSTEM_CHARS=180000` — a safe limit for heavy agent clients with large system prompt/tool schemas. For ordinary chat you can lower it, but for OpenClaw/Claude Code/Codex it's better to keep it high.
- `QWEN_USE_NODE_FETCH=0` — keeps requests inside the browser `page.evaluate(fetch)`, which usually passes Qwen anti-bot better. For debugging you can set `1`: anti-bot errors return faster and there are fewer Puppeteer hangs, but Node-side requests get captchas more often.
- `NON_INTERACTIVE=1` and `SKIP_ACCOUNT_MENU=1` — start without the account menu for local agents/daemons.

The full list of settings with comments is in `.env.example`.

## Qwen Chat authorization

Add an account:

```bash
npm run auth
```

Or jump straight to a specific action:

```bash
npm run auth -- --add
npm run auth -- --list
npm run auth -- --relogin
npm run auth --
```

When adding an account, Chromium will open. Log into Qwen Chat, then return to the terminal — the token will be saved in `session/`.

**Do not commit or publish secrets:**

- `session/`
- `session/tokens.json`
- `session/accounts/**/token.txt`
- `.env`
- `Authorization.txt`
- cookies / browser profile / real tokens

By default the proxy listens only on `127.0.0.1`. For intentional access from the
network, set `HOST=0.0.0.0`, add separate client keys to
`src/Authorization.txt` and list the exact browser-origins via
`CORS_ORIGINS=https://ui.example.com,http://192.168.1.20:3000`.

## Main endpoints

### Health

```bash
curl http://localhost:3264/api/health
```

The response contains the number of models and accounts:

```json
{
  "ok": true,
  "service": "FreeQwenApi",
  "baseUrl": "/api",
  "models": 28
}
```

### Model list

```bash
curl http://localhost:3264/api/models
```

Update the model list from Qwen Chat metadata:

```bash
npm run models:sync
```

Detailed report: [docs/QWEN_CHAT_MODELS.md](docs/QWEN_CHAT_MODELS.md)

### Chat Completions

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "messages": [
      {"role": "user", "content": "Ответь коротко: что такое FreeQwenApi?"}
    ],
    "stream": false
  }'
```

OpenAI SDK:

```js
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3264/api',
  apiKey: 'dummy-key'
});

const response = await openai.chat.completions.create({
  model: 'qwen3.7-max',
  messages: [{ role: 'user', content: 'Привет!' }]
});

console.log(response.choices[0].message.content);
```

### Thinking / reasoning and any model

The proxy accepts **any model ID** — even ones that are not yet in `src/AvailableModels.txt`. An unknown ID is passed to Qwen Chat as-is; Qwen itself decides whether the model is available. Aliases like `qwen-max` → `qwen3-max` keep working.

Thinking/reasoning is enabled the same way as the toggle in the Qwen web chat. All the main conventions are supported:

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "enable_thinking": true,
    "messages": [{"role": "user", "content": "Разбери задачу по шагам."}],
    "stream": true
  }'
```

| Field | Type | Effect |
|------|-----|--------|
| `enable_thinking` | `boolean` | `true` — enable, `false` — disable (Qwen convention) |
| `reasoning_effort` | `"low"` / `"medium"` / `"high"` | any value other than `none` / `off` / `disabled` enables thinking |
| `thinking` | `boolean` or `{ "type": "enabled" }` | another way to enable/disable |

Priority: `enable_thinking` → `reasoning_effort` → `thinking` (the first explicitly set one wins).

**The reasoning trace (`reasoning_content`)**

In a streaming response (`stream: true`), the reasoning arrives in separate SSE chunks as `delta.reasoning_content` (just like `delta.content` for normal text):

```text
data: {"choices":[{"delta":{"reasoning_content":"1. Сначала разберём...","content":""}}]}
data: {"choices":[{"delta":{"content":"Итоговый ответ...","reasoning_content":""}}]}
data: [DONE]
```

In a non-streaming response, the reasoning is in `choices[0].message.reasoning_content`.

OpenAI SDK (stream):

```js
const stream = await openai.chat.completions.create({
  model: "qwen3.7-max",
  enable_thinking: true,
  messages: [{ role: "user", content: "Разбери задачу по шагам." }],
  stream: true
});
for await (const chunk of stream) {
  const d = chunk.choices[0]?.delta;
  if (d?.reasoning_content) console.log("[рассуждение]", d.reasoning_content);
  if (d?.content) console.log(d.content);
}
```

## Image generation via Qwen Chat

By default `/api/images/generations` uses **Qwen Chat**, not DashScope. That means a separate `DASHSCOPE_API_KEY` is not needed — you just need an active Qwen Chat account.

```bash
curl http://localhost:3264/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Кинематографичный робот в неоновом Токио, стиль sci-fi poster",
    "model": "qwen3-vl-plus",
    "size": "16:9"
  }'
```

Example response:

```json
{
  "created": 1770000000,
  "provider": "qwen-chat",
  "model": "qwen3-vl-plus",
  "data": [
    { "url": "https://cdn.qwenlm.ai/.../image.png", "revised_prompt": "..." }
  ]
}
```

Supported `size` formats for Qwen Chat:

- `16:9`
- `9:16`
- `1:1`
- `4:3`
- you can also pass OpenAI-style `1024x1024`, `1792x1024`, `1024x1792` — they will be converted to an aspect ratio.

The old DashScope mode is also kept:

```json
{
  "provider": "dashscope",
  "model": "qwen-image-plus",
  "prompt": "..."
}
```

Details: [IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md) and [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md)

## Video generation via Qwen Chat

Create a video and wait for the result on the server:

```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Камера медленно приближается к футуристическому городу ночью, cinematic, 5 seconds",
    "model": "qwen3-vl-plus",
    "size": "16:9",
    "wait": true
  }'
```

If you don't want to keep the HTTP connection open:

```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Робот идёт под дождём в неоновом городе",
    "size": "16:9",
    "wait": false
  }'
```

The response will return a `task_id`. Check the status:

```bash
curl http://localhost:3264/api/tasks/status/TASK_ID
```

Or wait for completion right in the status endpoint:

```bash
curl "http://localhost:3264/api/tasks/status/TASK_ID?wait=true"
```

## Open WebUI

For a local Open WebUI:

```text
Base URL: http://localhost:3264/api
API Key: dummy-key
Model: qwen3.7-max
```

If Open WebUI is in Docker:

```text
Base URL: http://host.docker.internal:3264/api
API Key: dummy-key
```

Full instructions: [docs/OPENWEBUI_SETUP.md](docs/OPENWEBUI_SETUP.md)


## Agents and tool use: Hermes, OpenCode, Claude Code, Codex, OpenClaw

FreeQwenApi supports not just ordinary chat, but also agent/tool-use scenarios. From the outside it looks like OpenAI/Anthropic-compatible tool calling; internally, tool schemas are emulated through the system prompt for Qwen Chat.

Before launching agent clients, it's best to start the server like this:

```bash
NON_INTERACTIVE=1 \
SKIP_ACCOUNT_MENU=1 \
HOST=127.0.0.1 \
PORT=3264 \
LOG_LEVEL=info \
QWEN_MAX_SYSTEM_CHARS=180000 \
QWEN_TOOL_PROMPT_MODE=minimal \
node index.js
```

Checking an OpenAI-compatible tool call directly:

```bash
curl http://127.0.0.1:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "stream": false,
    "messages": [{"role":"user","content":"Вызови инструмент write_file для smoke.js"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "write_file",
        "description": "Write a file",
        "parameters": {
          "type": "object",
          "properties": {
            "path": {"type":"string"},
            "content": {"type":"string"}
          },
          "required": ["path", "content"]
        }
      }
    }],
    "tool_choice": "auto"
  }'
```

Expected result — `message.tool_calls` in non-streaming mode, or `delta.tool_calls` + `finish_reason: "tool_calls"` in streaming mode.

### Hermes Agent

Hermes can be connected as an OpenAI-compatible custom provider.

```yaml
custom_providers:
  - name: qwen-free
    base_url: http://127.0.0.1:3264/api
    model: qwen3.7-max
    api_key: dummy-key
```

Ready-made example: [examples/hermes/config-snippet.yaml](examples/hermes/config-snippet.yaml)

What is supported for Hermes:

- `/api/chat/completions` and `/api/v1/chat/completions` accept `tools` / legacy `functions`;
- tool calls are returned as OpenAI `message.tool_calls` or streaming `delta.tool_calls`;
- continuations with `role: "tool"` don't break the dialogue: the proxy folds the OpenAI transcript into a Qwen-readable prompt;
- for long Hermes system prompts use `QWEN_MAX_SYSTEM_CHARS=180000`.

### OpenCode

For a one-off smoke test, you don't have to change the permanent OpenCode config — you can pass the provider via `OPENCODE_CONFIG_CONTENT`:

```bash
export OPENCODE_CONFIG_CONTENT='{
  "$schema":"https://opencode.ai/config.json",
  "provider": {
    "freeqwen": {
      "npm":"@ai-sdk/openai-compatible",
      "name":"FreeQwenApi",
      "options": {
        "baseURL":"http://127.0.0.1:3264/api",
        "apiKey":"dummy-key"
      },
      "models": {
        "qwen3.7-max": {"name":"qwen3.7-max"}
      }
    }
  }
}'

opencode run 'Create smoke.js, run it, and report output' \
  --model freeqwen/qwen3.7-max \
  --agent build \
  --print-logs
```

In a successful smoke test, OpenCode should actually call `write`/`bash`, not just reply with text.

### Claude Code

Claude Code requires the Anthropic Messages API, so FreeQwenApi serves a shim:

```text
POST /api/messages
POST /api/v1/messages
```

Run via a local endpoint:

```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:3264/api \
ANTHROPIC_API_KEY=dummy-key \
ANTHROPIC_AUTH_TOKEN=dummy-key \
ANTHROPIC_MODEL=qwen3.7-max \
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1 \
claude --bare -p 'Create smoke.js, run npm run smoke, return the terminal output' \
  --model qwen3.7-max \
  --allowedTools 'Write,Bash' \
  --max-turns 8 \
  --output-format json
```

Under the hood, the shim converts Anthropic `tools`, `tool_use` and `tool_result` into an OpenAI-style history and back.


### Codex CLI

The current Codex CLI no longer supports `wire_api = "chat"`; use the Responses API mode:

```toml
model = "qwen3.7-max"
model_provider = "freeqwen"
approval_policy = "never"
sandbox_mode = "workspace-write"

[model_providers.freeqwen]
name = "FreeQwenApi"
base_url = "http://127.0.0.1:3264/api"
wire_api = "responses"
experimental_bearer_token = "dummy-key"
```

Smoke:

```bash
CODEX_HOME=/path/to/codex-home \
codex exec 'Create smoke.js, create package.json with script smoke, run npm run smoke, return output' \
  --skip-git-repo-check
```

### OpenClaw

OpenClaw is best run with a large context — its system prompt and tool list are noticeably larger than normal.

Minimal idea of a provider config:

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "freeqwen": {
        "baseUrl": "http://127.0.0.1:3264/api",
        "apiKey": "dummy-key",
        "auth": "api-key",
        "api": "openai-completions",
        "contextWindow": 200000,
        "contextTokens": 180000,
        "maxTokens": 32000,
        "models": [
          {
            "id": "qwen3.7-max",
            "name": "qwen3.7-max",
            "api": "openai-completions",
            "contextTokens": 180000,
            "compat": {
              "supportsTools": true,
              "supportsStrictMode": false,
              "requiresStringContent": true,
              "strictMessageKeys": false,
              "maxTokensField": "max_tokens"
            }
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "freeqwen/qwen3.7-max"
    }
  }
}
```

Smoke:

```bash
openclaw --profile freeqwen-smoke agent \
  --local \
  --json \
  --model freeqwen/qwen3.7-max \
  --message 'Create smoke.js, run npm run smoke, return marker if successful' \
  --timeout 240
```

### LiteLLM bridge

If you need a bridge through LiteLLM:

```yaml
model_list:
  - model_name: qwen3.7-max
    litellm_params:
      model: openai/qwen3.7-max
      api_base: http://127.0.0.1:3264/api
      api_key: dummy-key
```

Ready-made example: [examples/litellm/qwen_litellm.yaml](examples/litellm/qwen_litellm.yaml)

### Important caveats for agents

- This is a Qwen Chat web proxy, not an official tool-calling API. Tool calls are emulated by a prompt adapter.
- Sometimes the Qwen web backend returns `chatId не существует`; usually a request retry or a new chat helps.
- With frequent/long requests, an anti-bot/captcha challenge is possible.
- For OpenClaw/Codex/Claude Code keep `QWEN_MAX_SYSTEM_CHARS=180000`, otherwise tool instructions may be truncated.
- If the agent writes text instead of calling a tool, check that the client really passed `tools`, and that the server runs with `QWEN_TOOL_PROMPT_MODE=minimal`.

## Docker

First add the account locally, because there is no GUI for login inside the container:

```bash
npm run auth
```

Then:

```bash
docker compose up --build -d
```

In `docker-compose.yml` it's important to mount `session/`:

```yaml
services:
  qwen-proxy:
    build: .
    environment:
      - SKIP_ACCOUNT_MENU=true
      - PORT=3264
    ports:
      - "3264:3264"
    volumes:
      - ./session:/app/session
      - ./logs:/app/logs
      - ./uploads:/app/uploads
```


## Recommended models

- **Ordinary chat / agents**: `qwen3.7-max`
- **Faster and lighter**: `qwen3.7-plus`
- **Coding**: `qwen3-coder-plus`
- **Images/video via Qwen Chat**: `qwen3-vl-plus`
- **Open WebUI default**: `qwen3.7-max`
- **Any other model** (including new ones from Qwen Chat): just specify its ID — the proxy forwards the request directly.

## Useful commands

```bash
npm run auth                  # manage accounts
npm run models:sync           # update the model list
npm run smoke                 # quick API check
SKIP_ACCOUNT_MENU=true npm start
```

Manual checks:

```bash
curl http://localhost:3264/api/health
curl http://localhost:3264/api/status
curl http://localhost:3264/api/models
curl http://localhost:3264/api/images/status
curl http://localhost:3264/api/videos/status
```

## Documentation

- [docs/FORK_DEMO_QUICKSTART.md](docs/FORK_DEMO_QUICKSTART.md) — quick scenario for demos/videos.
- [docs/QWEN_CHAT_MODELS.md](docs/QWEN_CHAT_MODELS.md) — report on Qwen Chat model syncing.
- [IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md) — image and video generation via `chatType`.
- [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md) — DashScope/Qwen Image endpoints.
- [docs/OPENWEBUI_SETUP.md](docs/OPENWEBUI_SETUP.md) — connecting Open WebUI.
- [examples/hermes/config-snippet.yaml](examples/hermes/config-snippet.yaml) — Hermes Agent provider; see the section above for OpenCode, Claude Code, Codex and OpenClaw.
- [examples/litellm/qwen_litellm.yaml](examples/litellm/qwen_litellm.yaml) — LiteLLM bridge.

## Limitations

- This is an unofficial browser-based proxy; Qwen may change the internal API.
- Qwen Chat accounts can hit limits; use multiple accounts for round-robin.
- Binding of Qwen chat/task/file to an account is kept only in process memory and does not store bearer tokens. After a restart, an unknown chatId is safely replaced with a new chat; when a full OpenAI history is sent, the proxy moves it into the new chat. Private files must be uploaded again, and an old taskId cannot be polled.
- The Python entrypoint does not accept Qwen file attachments, because it cannot safely verify the file's owner account. Use the Node.js entrypoint to upload and send files.
- Tokens expire — use `npm run auth -- --relogin`.
- Photo/video generation depends on the availability of Qwen Chat features on the specific account.
- URLs of generated media may be temporary.
- Use with caution in production: this is a tool for experiments, demos and local workflows.

