# FreeQwenApi
**🌍 Language / Язык / 语言 / Idioma:** [English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)


> **本地的 OpenAI 兼容代理，用于 Qwen Chat。**  
> 文本、Qwen 3.7 系列模型、文件、Open WebUI、Hermes/LiteLLM，现在还支持通过 Qwen Chat 生成图像和视频。

![API](https://img.shields.io/badge/API-OpenAI--compatible-green)
![Qwen](https://img.shields.io/badge/Qwen-Chat-purple)

## 这是什么

FreeQwenApi 将 Qwen Chat 的网页账号转换为本地 API endpoint：

```text
http://localhost:3264/api
```

这**不是本地显卡上运行的模型**，也**不是阿里/Qwen 的官方 API**。这是一个实用的 browser-based proxy：你在 Qwen Chat 中登录授权，项目保存 session，并为你的工具提供一个本地 OpenAI-compatible API。

## fork 的功能

- **Chat Completions API**：`POST /api/chat/completions`，兼容 OpenAI SDK、Open WebUI、LiteLLM 和各类 agent。
- **所有 Qwen Chat 模型**：代理接受**任意模型 ID**（包括 Qwen 聊天中出现但 `src/AvailableModels.txt` 里还没有的新模型），并按原样传给 Qwen：`qwen3.7-max`、`qwen3.7-plus`、`qwen3.8-max`、`qwen3-235b-a22b` 等。
- **通过 Qwen Chat 生成图像**：`POST /api/images/generations`，无需 `DASHSCOPE_API_KEY`。
- **通过 Qwen Chat 生成视频**：`POST /api/videos/generations` + 通过 `GET /api/tasks/status/:taskId` 轮询任务状态。
- **多账号**：添加、重新登录、删除、`OK` / `WAIT` / `INVALID` 状态，以及在限流时自动 round-robin 轮换。
- **文件上传**：用于 Qwen 文件和附件的 upload endpoint。
- **Open WebUI**：可以连接为 OpenAI-compatible 后端。
- **Hermes Agent / OpenCode / Claude Code / Codex / OpenClaw / LiteLLM**：为本地 AI agent 提供的现成配置说明，以及 tool-use smoke 测试。
- **Health/smoke 工具**：`/api/health`、`/api/status`、`/api/models`、`npm run smoke`、`npm run models:sync`。

## 快速开始

```bash
git clone https://github.com/The2oser-dev/FreeQwenApi
cd FreeQwenApi
npm install
npm run auth
npm run models:sync
SKIP_ACCOUNT_MENU=true npm start
```

在另一个终端中：

```bash
npm run smoke
```

如果一切正常，API 可通过以下地址访问：

```text
http://localhost:3264/api
```

## 通过 `.env` 配置

项目会自动读取仓库根目录下的 `.env`。先复制示例开始：

```bash
cp .env.example .env
```

对 agent 客户端最有用的参数：

- `QWEN_TOOL_PROMPT_MODE=minimal` — 将 OpenAI `tools` / `functions` 紧凑地嵌入到 prompt 中。这是 Hermes、OpenCode、Claude Code、Codex 和 OpenClaw 的最佳模式。
- `QWEN_MAX_SYSTEM_CHARS=180000` — 对于带有较大 system prompt/tool schemas 的重型 agent 客户端的安全上限。普通聊天可以调低，但 OpenClaw/Claude Code/Codex 最好保持较高。
- `QWEN_USE_NODE_FETCH=0` — 将请求保留在浏览器 `page.evaluate(fetch)` 内部，这通常更容易通过 Qwen 的反爬虫。调试时可设为 `1`：anti-bot 错误返回更快、Puppeteer 挂起更少，但 Node 侧请求更常遇到 captcha。
- `NON_INTERACTIVE=1` 和 `SKIP_ACCOUNT_MENU=1` — 不带账号菜单启动，适合本地 agent/守护进程。

带注释的完整参数列表见 `.env.example`。

## Qwen Chat 授权

添加账号：

```bash
npm run auth
```

或者直接执行某个具体操作：

```bash
npm run auth -- --add
npm run auth -- --list
npm run auth -- --relogin
npm run auth -- --remove
```

添加账号时会打开 Chromium。登录 Qwen Chat，然后回到终端——token 会被保存到 `session/`。

**不要提交或发布任何机密：**

- `session/`
- `session/tokens.json`
- `session/accounts/**/token.txt`
- `.env`
- `Authorization.txt`
- cookies / browser profile / 真实 token

Proxy 默认只监听 `127.0.0.1`。如果确实需要从网络访问，请设置 `HOST=0.0.0.0`，在 `src/Authorization.txt` 中添加独立的 client keys，并通过 `CORS_ORIGINS=https://ui.example.com,http://192.168.1.20:3000` 列出精确的 browser-origin。

## 主要 endpoints

### Health

```bash
curl http://localhost:3264/api/health
```

响应包含模型数量和账号数量：

```json
{
  "ok": true,
  "service": "FreeQwenApi",
  "baseUrl": "/api",
  "models": 28
}
```

### 模型列表

```bash
curl http://localhost:3264/api/models
```

从 Qwen Chat metadata 更新模型列表：

```bash
npm run models:sync
```

详细报告：[docs/QWEN_CHAT_MODELS.md](docs/QWEN_CHAT_MODELS.md)

### Chat Completions

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "messages": [
      {"role": "user", "content": "简短回答：什么是 FreeQwenApi？"}
    ],
    "stream": false
  }'
```

OpenAI SDK：

```js
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3264/api',
  apiKey: 'dummy-key'
});

const response = await openai.chat.completions.create({
  model: 'qwen3.7-max',
  messages: [{ role: 'user', content: '你好！' }]
});

console.log(response.choices[0].message.content);
```

### 思考（thinking）与任意模型

Proxy 接受**任意模型 ID**——即使是 `src/AvailableModels.txt` 里还没有的。未知 ID 会按原样传给 Qwen Chat；Qwen 自己决定该模型是否可用。类似 `qwen-max` → `qwen3-max` 的别名仍然有效。

思考（thinking/reasoning）的开启方式与 Qwen 网页聊天中的开关一致。支持所有主要约定：

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "enable_thinking": true,
    "messages": [{"role": "user", "content": "逐步分析这个任务。"}],
    "stream": true
  }'
```

| 字段 | 类型 | 效果 |
|------|-----|--------|
| `enable_thinking` | `boolean` | `true` — 开启，`false` — 关闭（Qwen 约定） |
| `reasoning_effort` | `"low"` / `"medium"` / `"high"` | 除 `none` / `off` / `disabled` 之外的任意值都会开启思考 |
| `thinking` | `boolean` 或 `{ "type": "enabled" }` | 另一种开启/关闭的方式 |

优先级：`enable_thinking` → `reasoning_effort` → `thinking`（第一个被显式设置的字段优先）。

**思考过程（`reasoning_content`）**

在流式响应（`stream: true`）中，推理通过独立的 SSE 分块 `delta.reasoning_content` 返回（就像普通文本用 `delta.content`）：

```text
data: {"choices":[{"delta":{"reasoning_content":"1. 首先我们来分析...","content":""}}]}
data: {"choices":[{"delta":{"content":"最终答案...","reasoning_content":""}}]}
data: [DONE]
```

在非流式响应中，推理内容位于 `choices[0].message.reasoning_content`。

OpenAI SDK（流式）：

```js
const stream = await openai.chat.completions.create({
  model: "qwen3.7-max",
  enable_thinking: true,
  messages: [{ role: "user", content: "逐步分析这个任务。" }],
  stream: true
});
for await (const chunk of stream) {
  const d = chunk.choices[0]?.delta;
  if (d?.reasoning_content) console.log("[思考]", d.reasoning_content);
  if (d?.content) console.log(d.content);
}
```

## 通过 Qwen Chat 生成图像

默认情况下 `/api/images/generations` 使用 **Qwen Chat**，而不是 DashScope。也就是说不需要单独的 `DASHSCOPE_API_KEY`——只需要一个有效的 Qwen Chat 账号。

```bash
curl http://localhost:3264/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "霓虹东京中的电影感机器人，科幻海报风格",
    "model": "qwen3-vl-plus",
    "size": "16:9"
  }'
```

响应示例：

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

Qwen Chat 支持的 `size` 格式：

- `16:9`
- `9:16`
- `1:1`
- `4:3`
- 也可以传 OpenAI 风格的 `1024x1024`、`1792x1024`、`1024x1792`——它们会被转换为宽高比。

旧的 DashScope 模式也保留：

```json
{
  "provider": "dashscope",
  "model": "qwen-image-plus",
  "prompt": "..."
}
```

详细信息：[IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md) 和 [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md)

## 通过 Qwen Chat 生成视频

创建视频并在服务器上等待结果：

```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "摄像机缓慢靠近夜晚的未来城市，电影感，5 秒",
    "model": "qwen3-vl-plus",
    "size": "16:9",
    "wait": true
  }'
```

如果不想保持 HTTP 连接打开：

```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "机器人走在霓虹城市的雨中",
    "size": "16:9",
    "wait": false
  }'
```

响应会返回 `task_id`。查看状态：

```bash
curl http://localhost:3264/api/tasks/status/TASK_ID
```

或者直接在 status endpoint 等待完成：

```bash
curl "http://localhost:3264/api/tasks/status/TASK_ID?wait=true"
```

## Open WebUI

对于本地 Open WebUI：

```text
Base URL: http://localhost:3264/api
API Key: dummy-key
Model: qwen3.7-max
```

如果 Open WebUI 在 Docker 中：

```text
Base URL: http://host.docker.internal:3264/api
API Key: dummy-key
```

完整说明：[docs/OPENWEBUI_SETUP.md](docs/OPENWEBUI_SETUP.md)

## 代理与 tool-use：Hermes、OpenCode、Claude Code、Codex、OpenClaw

FreeQwenApi 不仅能做普通聊天，还支持 agent/tool-use 场景。对外表现为 OpenAI/Anthropic-compatible 的 tool calling，内部则通过为 Qwen Chat 生成的系统 prompt 来模拟 tool schemas。

在启动 agent 客户端之前，最好这样启动服务器：

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

直接验证 OpenAI-compatible 的 tool call：

```bash
curl http://127.0.0.1:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "stream": false,
    "messages": [{"role":"user","content":"为 smoke.js 调用工具 write_file"}],
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

预期结果是 non-streaming 模式下的 `message.tool_calls`，或 streaming 模式下的 `delta.tool_calls` + `finish_reason: "tool_calls"`。

### Hermes Agent

Hermes 可以作为 OpenAI-compatible 的自定义 provider 连接。

```yaml
custom_providers:
  - name: qwen-free
    base_url: http://127.0.0.1:3264/api
    model: qwen3.7-max
    api_key: dummy-key
```

现成示例：[examples/hermes/config-snippet.yaml](examples/hermes/config-snippet.yaml)

Hermes 支持的功能：

- `/api/chat/completions` 和 `/api/v1/chat/completions` 接受 `tools` / 旧版 `functions`；
- tool calls 以 OpenAI `message.tool_calls` 或 streaming `delta.tool_calls` 返回；
- 带有 `role: "tool"` 的后续消息不会破坏对话：proxy 会把 OpenAI transcript 折叠成 Qwen 能理解的 prompt；
- 对于较长的 Hermes system prompt，请使用 `QWEN_MAX_SYSTEM_CHARS=180000`。

### OpenCode

对于一次性的 smoke 测试，不必修改 OpenCode 的常驻 config——可以通过 `OPENCODE_CONFIG_CONTENT` 传入 provider：

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

成功的 smoke 测试中，OpenCode 应当真正调用 `write`/`bash`，而不是只返回一段文本。


### Claude Code

Claude Code 需要 Anthropic Messages API，因此 FreeQwenApi 会提供一个 shim：

```text
POST /api/messages
POST /api/v1/messages
```

通过本地 endpoint 启动：

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

在内部，shim 会把 Anthropic 的 `tools`、`tool_use` 和 `tool_result` 转换为 OpenAI 风格的历史记录，再转换回来。

### Codex CLI

当前的 Codex CLI 已不再支持 `wire_api = "chat"`；请使用 Responses API 模式：

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

Smoke：

```bash
CODEX_HOME=/path/to/codex-home \
codex exec 'Create smoke.js, create package.json with script smoke, run npm run smoke, return output' \
  --skip-git-repo-check
```

### OpenClaw

OpenClaw 最好使用较大的上下文运行——它的 system prompt 和工具列表明显比平时大。

provider config 的最小思路：

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

Smoke：

```bash
openclaw --profile freeqwen-smoke agent \
  --local \
  --json \
  --model freeqwen/qwen3.7-max \
  --message 'Create smoke.js, run npm run smoke, return marker if successful' \
  --timeout 240
```

### LiteLLM bridge

如果需要通过 LiteLLM 架桥：

```yaml
model_list:
  - model_name: qwen3.7-max
    litellm_params:
      model: openai/qwen3.7-max
      api_base: http://127.0.0.1:3264/api
      api_key: dummy-key
```

现成示例：[examples/litellm/qwen_litellm.yaml](examples/litellm/qwen_litellm.yaml)

### 针对 agent 的重要 caveats

- 这是 Qwen Chat 的 web proxy，不是官方的 tool-calling API。Tool calls 是通过 prompt adapter 模拟的。
- 有时 Qwen 的 web 后端会返回 `chatId 不存在`；通常重试请求或开启新的聊天可以解决。
- 请求频繁/过长时可能出现 anti-bot/captcha 挑战。
- 对于 OpenClaw/Codex/Claude Code，请保持 `QWEN_MAX_SYSTEM_CHARS=180000`，否则工具指令可能被截断。
- 如果 agent 只是写文本而不是调用工具，请检查客户端是否真的传了 `tools`，且服务器是否以 `QWEN_TOOL_PROMPT_MODE=minimal` 启动。

## Docker

先在本地添加账号，因为容器内部没有登录用的图形界面：

```bash
npm run auth
```

然后：

```bash
docker compose up --build -d
```

在 `docker-compose.yml` 中，重要的是挂载 `session/`：

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

## 推荐模型

- **普通聊天 / 代理**：`qwen3.7-max`
- **更快更轻**：`qwen3.7-plus`
- **编程**：`qwen3-coder-plus`
- **通过 Qwen Chat 生成图像/视频**：`qwen3-vl-plus`
- **Open WebUI 默认**：`qwen3.7-max`
- **任何其他模型**（包括 Qwen 聊天中出现的新模型）：直接指定其 ID——proxy 会把请求直接传过去。

## 实用命令

```bash
npm run auth                  # 账号管理
npm run models:sync           # 更新模型列表
npm run smoke                 # 快速检查 API
SKIP_ACCOUNT_MENU=true npm start
```

手动检查：

```bash
curl http://localhost:3264/api/health
curl http://localhost:3264/api/status
curl http://localhost:3264/api/models
curl http://localhost:3264/api/images/status
curl http://localhost:3264/api/videos/status
```

## 文档

- [docs/FORK_DEMO_QUICKSTART.md](docs/FORK_DEMO_QUICKSTART.md) — 用于演示/视频的快速场景。
- [docs/QWEN_CHAT_MODELS.md](docs/QWEN_CHAT_MODELS.md) — Qwen Chat 模型同步报告。
- [IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md) — 通过 `chatType` 生成图像和视频。
- [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md) — DashScope/Qwen Image endpoints。
- [docs/OPENWEBUI_SETUP.md](docs/OPENWEBUI_SETUP.md) — 连接 Open WebUI。
- [examples/hermes/config-snippet.yaml](examples/hermes/config-snippet.yaml) — Hermes Agent provider；OpenCode、Claude Code、Codex 和 OpenClaw 见上面的章节。
- [examples/litellm/qwen_litellm.yaml](examples/litellm/qwen_litellm.yaml) — LiteLLM bridge。

## 限制

- 这是非官方的 browser-based proxy，Qwen 可能会更改内部 API。
- Qwen Chat 账号可能会被限流；请使用多个账号进行 round-robin。
- Qwen chat/task/file 与账号的绑定只保存在进程内存中，不会持久化 bearer-token。重启后，未知的 chatId 会被安全地替换为新聊天；在发送完整 OpenAI 历史时，proxy 会将其迁移到新聊天。私有文件需要重新上传，旧 taskId 无法再轮询。
- Python entrypoint 不接受 Qwen 文件附件，因为它无法安全地校验文件的账号所有者。上传和发送文件请使用 Node.js entrypoint。
- Token 会过期——请使用 `npm run auth -- --relogin`。
- 照片/视频生成取决于特定账号上 Qwen Chat 功能的可用性。
- 生成的媒体 URL 可能是临时的。
- 用于生产环境时请谨慎：这是用于实验、演示和本地 workflow 的工具。

