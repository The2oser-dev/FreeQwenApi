# FreeQwenApi
**🌍 Language / Язык / 语言 / Idioma:** [English](README.md) · [Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)




> **Proxy local compatible con OpenAI hacia Qwen Chat**.  
> Texto, modelos Qwen 3.7, archivos, Open WebUI, Hermes/LiteLLM, y además generación de imágenes y video a través de Qwen Chat.

![API](https://img.shields.io/badge/API-OpenAI--compatible-green)
![Qwen](https://img.shields.io/badge/Qwen-Chat-purple)

## Qué es esto

FreeQwenApi convierte la cuenta web de Qwen Chat en un endpoint de API local:

```text
http://localhost:3264/api
```

Esto **no es un modelo local en tu tarjeta gráfica** ni **la API oficial de Alibaba/Qwen**. Es un browser-based proxy práctico: inicias sesión en Qwen Chat, el proyecto guarda la sesión y ofrece una API local compatible con OpenAI para tus herramientas.

## Características del fork

- **API de Chat Completions**: `POST /api/chat/completions`, compatible con OpenAI SDK, Open WebUI, LiteLLM y agentes.
- **Todos los modelos de Qwen Chat**: el proxy acepta **cualquier ID de modelo** (incluidos los nuevos del chat de Qwen que aún no están en `src/AvailableModels.txt`) y lo pasa a Qwen tal cual: `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max`, `qwen3-235b-a22b`, etc.
- **Generación de imágenes a través de Qwen Chat**: `POST /api/images/generations` sin `DASHSCOPE_API_KEY`.
- **Generación de video a través de Qwen Chat**: `POST /api/videos/generations` + polling de tareas mediante `GET /api/tasks/status/:taskId`.
- **Multi-cuentas**: agregar, re-login, eliminar, estados `OK` / `WAIT` / `INVALID`, rotación round-robin automática ante límites.
- **Subida de archivos**: endpoint de upload para archivos y adjuntos de Qwen.
- **Open WebUI**: se puede conectar como backend compatible con OpenAI.
- **Hermes Agent / OpenCode / Claude Code / OpenClaw / LiteLLM**: instrucciones listas para agentes de IA locales y smoke-tests de tool-use.
- **Health/smoke tooling**: `/api/health`, `/api/status`, `/api/models`, `npm run smoke`, `npm run models:sync`.
- **Traducción mediante Qwen**: `POST /api/v1/translate` traduce texto con tu sesión de Qwen sin otro servicio de traducción.

## Traducción mediante Qwen

`POST /api/v1/translate` procesa cada traducción de forma independiente y no conserva ni devuelve un Qwen chat ID.

```bash
curl -X POST http://localhost:3264/api/v1/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","target":"Spanish","source":"English"}'
```

Campos: `text` (obligatorio, hasta 50.000 caracteres), `target` (opcional, por defecto `Russian`), `source` y `model` (opcionales). También se aceptan los alias `target_language`, `language` y `source_language`. Si `src/Authorization.txt` contiene claves del proxy, envía una en `Authorization: Bearer <key>`.

## Inicio rápido

```bash
git clone https://github.com/The2oser-dev/FreeQwenApi
cd FreeQwenApi
npm install
npm run auth
npm run models:sync
SKIP_ACCOUNT_MENU=true npm start
```

En otra terminal:

```bash
npm run smoke
```

Si todo va bien, la API está disponible aquí:

```text
http://localhost:3264/api
```

## Configuración a través de `.env`

El proyecto lee automáticamente `.env` desde la raíz del repositorio. Empieza con el ejemplo:

```bash
cp .env.example .env
```

Los parámetros más útiles para clientes de agentes:

- `QWEN_TOOL_PROMPT_MODE=minimal` — integra de forma compacta las `tools` / `functions` de OpenAI en el prompt. Es el modo recomendado para Hermes, OpenCode, Claude Code y OpenClaw.
- `QWEN_MAX_SYSTEM_CHARS=180000` — límite recomendado y probado para clientes de agentes con system prompts/tool schemas grandes. Para el chat normal se puede bajar.
- `QWEN_USE_NODE_FETCH=0` — conserva browser fetch como fallback; las peticiones con callback de streaming aún prueban primero Node streaming. Con `1`, la mayoría de los errores no vuelve a browser fetch.
- `NON_INTERACTIVE=1` y `SKIP_ACCOUNT_MENU=1` — ejecución sin el menú de cuentas para agentes/demonios locales.

La lista completa de parámetros con comentarios está en `.env.example`.

## Autorización de Qwen Chat

Agregar una cuenta:

```bash
npm run auth
```

O directamente una acción concreta:

```bash
npm run auth -- --add
npm run auth -- --list
npm run auth -- --relogin
npm run auth -- --remove
```

Al agregar una cuenta se abrirá Chromium. Inicia sesión en Qwen Chat y luego vuelve a la terminal: el token se guardará en `session/`.

**No hagas commit ni publiques secretos:**

- `session/`
- `session/tokens.json`
- `session/accounts/**/token.txt`
- `.env`
- `Authorization.txt`
- cookies / perfil del navegador / tokens reales

Por defecto el proxy solo escucha en `127.0.0.1`. Para acceder intencionadamente desde la red, define `HOST=0.0.0.0`, agrega client keys individuales en `src/Authorization.txt` y enumera los browser-origin exactos mediante `CORS_ORIGINS=https://ui.example.com,http://192.168.1.20:3000`.

## Endpoints principales

### Health

```bash
curl http://localhost:3264/api/health
```

La respuesta contiene el número de modelos y cuentas:

```json
{
  "ok": true,
  "service": "FreeQwenApi",
  "baseUrl": "/api",
  "models": 28
}
```

### Lista de modelos

```bash
curl http://localhost:3264/api/models
```

Actualizar la lista de modelos desde los metadatos de Qwen Chat:

```bash
npm run models:sync
```

Informe detallado: [docs/QWEN_CHAT_MODELS.md](docs/QWEN_CHAT_MODELS.md)

### Chat Completions

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "messages": [
      {"role": "user", "content": "Explica brevemente qué es FreeQwenApi."}
    ],
    "stream": false
  }'
```

SDK de OpenAI:

```js
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3264/api',
  apiKey: 'dummy-key'
});

const response = await openai.chat.completions.create({
  model: 'qwen3.7-max',
  messages: [{ role: 'user', content: '¡Hola!' }]
});

console.log(response.choices[0].message.content);
```

### Razonamiento (thinking) y cualquier modelo

El proxy acepta **cualquier ID de modelo** — incluso aquellos que aún no están en `src/AvailableModels.txt`. El ID desconocido se pasa a Qwen Chat tal cual; Qwen decide por sí mismo si el modelo está disponible. Los alias como `qwen-max` → `qwen3-max` siguen funcionando.

El razonamiento (thinking/reasoning) se activa igual que el toggle en el chat web de Qwen. Se admiten todas las convenciones principales:

```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "enable_thinking": true,
    "messages": [{"role": "user", "content": "Resuelve la tarea paso a paso."}],
    "stream": true
  }'
```

| Campo | Tipo | Efecto |
|------|-----|--------|
| `enable_thinking` | `boolean` | `true` — activar, `false` — desactivar (convención de Qwen) |
| `reasoning_effort` | `"low"` / `"medium"` / `"high"` | cualquier valor excepto `none` / `off` / `disabled` activa el razonamiento |
| `thinking` | `boolean` o `{ "type": "enabled" }` | otra forma de activar/desactivar |

Prioridad: `enable_thinking` → `reasoning_effort` → `thinking` (el primer valor establecido explícitamente gana).

**Progreso del razonamiento (`reasoning_content`)**

En la respuesta en streaming (`stream: true`), los razonamientos llegan en chunks SSE separados `delta.reasoning_content` (como `delta.content` para el texto normal):

```text
data: {"choices":[{"delta":{"reasoning_content":"1. Primero, analicemos...","content":""}}]}
data: {"choices":[{"delta":{"content":"Respuesta final...","reasoning_content":""}}]}
data: [DONE]
```

En la respuesta sin streaming, los razonamientos están en `choices[0].message.reasoning_content`.

SDK de OpenAI (streaming):

```js
const stream = await openai.chat.completions.create({
  model: "qwen3.7-max",
  enable_thinking: true,
  messages: [{ role: "user", content: "Resuelve la tarea paso a paso." }],
  stream: true
});
for await (const chunk of stream) {
  const d = chunk.choices[0]?.delta;
  if (d?.reasoning_content) console.log("[razonamiento]", d.reasoning_content);
  if (d?.content) console.log(d.content);
}
```

## Generación de imágenes a través de Qwen Chat

Por defecto, `/api/images/generations` usa **Qwen Chat**, no DashScope. Es decir, no se necesita una `DASHSCOPE_API_KEY` aparte — solo se necesita una cuenta de Qwen Chat activa.

```bash
curl http://localhost:3264/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Un robot cinematográfico en un Tokio de neón, estilo póster de ciencia ficción",
    "model": "qwen3-vl-plus",
    "size": "16:9"
  }'
```

Ejemplo de respuesta:

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

Formatos `size` admitidos para Qwen Chat:

- `16:9`
- `9:16`
- `1:1`
- `4:3`
- también se pueden pasar estilos OpenAI como `1024x1024`, `1792x1024`, `1024x1792` — se convertirán a aspect ratio.

El antiguo modo DashScope también se mantiene:

```json
{
  "provider": "dashscope",
  "model": "qwen-image-plus",
  "prompt": "..."
}
```

Detalles: [IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md) y [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md)

## Generación de video a través de Qwen Chat

Crear un video y esperar el resultado en el servidor:

```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "La cámara se acerca lentamente a una ciudad futurista de noche, cinematográfico, 5 segundos",
    "model": "qwen3-vl-plus",
    "size": "16:9",
    "wait": true
  }'
```

Si no quieres mantener la conexión HTTP abierta:

```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Un robot camina bajo la lluvia en una ciudad de neón",
    "size": "16:9",
    "wait": false
  }'
```

La respuesta devolverá `task_id`. Comprobar el estado:

```bash
curl http://localhost:3264/api/tasks/status/TASK_ID
```

O esperar a que termine directamente en el endpoint de status:

```bash
curl "http://localhost:3264/api/tasks/status/TASK_ID?wait=true"
```

## Open WebUI

Para Open WebUI local:

```text
Base URL: http://localhost:3264/api
API Key: dummy-key
Model: qwen3.7-max
```

Si Open WebUI está en Docker:

```text
Base URL: http://host.docker.internal:3264/api
API Key: dummy-key
```

Instrucciones completas: [docs/OPENWEBUI_SETUP.md](docs/OPENWEBUI_SETUP.md)

## Agentes y tool-use: Hermes, OpenCode, Claude Code, OpenClaw

FreeQwenApi no solo sirve para el chat normal, sino también para escenarios de agentes/tool-use. Por fuera se ve como tool calling compatible con OpenAI/Anthropic; por dentro los tool schemas se emulan a través del system prompt para Qwen Chat.

Antes de lanzar clientes de agentes, conviene levantar el servidor así:

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

Comprobar una tool call compatible con OpenAI directamente:

```bash
curl http://127.0.0.1:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "stream": false,
    "messages": [{"role":"user","content":"Llama a la herramienta write_file para smoke.js"}],
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

El resultado esperado es `message.tool_calls` en modo non-streaming o `delta.tool_calls` + `finish_reason: "tool_calls"` en modo streaming.

### Hermes Agent

Hermes se puede conectar como custom provider compatible con OpenAI.

```yaml
custom_providers:
  - name: qwen-free
    base_url: http://127.0.0.1:3264/api
    model: qwen3.7-max
    api_key: dummy-key
```

Ejemplo listo: [examples/hermes/config-snippet.yaml](examples/hermes/config-snippet.yaml)

Lo que se admite para Hermes:

- `/api/chat/completions` y `/api/v1/chat/completions` aceptan `tools` / legacy `functions`;
- las tool calls se devuelven como `message.tool_calls` de OpenAI o `delta.tool_calls` en streaming;
- las continuaciones con `role: "tool"` no rompen el diálogo: el proxy convierte el transcript de OpenAI en un prompt comprensible para Qwen;
- para system prompts largos de Hermes usa `QWEN_MAX_SYSTEM_CHARS=180000`.

### OpenCode

Para un smoke-test puntual no hace falta cambiar el config permanente de OpenCode — se puede pasar el provider mediante `OPENCODE_CONFIG_CONTENT`:

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

En un smoke exitoso, OpenCode debe invocar realmente `write`/`bash`, no limitarse a responder con texto.

### Claude Code

Claude Code requiere la Anthropic Messages API, por lo que FreeQwenApi ofrece un shim:

```text
POST /api/messages
POST /api/v1/messages
```

Ejecución a través del endpoint local:

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

Bajo el capó, el shim convierte las `tools`, `tool_use` y `tool_result` de Anthropic en un historial estilo OpenAI y viceversa.

### OpenClaw

OpenClaw es mejor ejecutarlo con un contexto amplio — su system prompt y su lista de tools son notablemente mayores de lo habitual.

Idea mínima de provider config:

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

### Puente LiteLLM

Si necesitas un puente a través de LiteLLM:

```yaml
model_list:
  - model_name: qwen3.7-max
    litellm_params:
      model: openai/qwen3.7-max
      api_base: http://127.0.0.1:3264/api
      api_key: dummy-key
```

Ejemplo listo: [examples/litellm/qwen_litellm.yaml](examples/litellm/qwen_litellm.yaml)

### Caveats importantes para agentes

- Esto es un Qwen Chat web proxy, no una API oficial de tool calling. Las tool calls se emulan con un prompt adapter.
- A veces el backend web de Qwen informa que el `chatId` no existe; normalmente ayuda repetir la petición o abrir un chat nuevo.
- Con peticiones frecuentes/largas puede aparecer un reto anti-bot/captcha.
- Para OpenClaw/Claude Code mantén `QWEN_MAX_SYSTEM_CHARS=180000`; de lo contrario, las tool-instructions podrían truncarse.
- Si el agente escribe texto en lugar de invocar la herramienta, comprueba que el cliente realmente haya enviado `tools` y que el servidor se haya lanzado con `QWEN_TOOL_PROMPT_MODE=minimal`.

## Docker

Primero agrega la cuenta localmente, porque dentro del contenedor no hay GUI para iniciar sesión:

```bash
npm run auth
```

Después:

```bash
docker compose up --build -d
```

En `docker-compose.yml` es importante reenviar `session/`:

```yaml
services:
  qwen-proxy:
    build: .
    environment:
      - SKIP_ACCOUNT_MENU=true
      - PORT=3264
      - HOST=0.0.0.0
    ports:
      - "3264:3264"
    volumes:
      - ./session:/app/session
      - ./logs:/app/logs
      - ./uploads:/app/uploads
```

## Modelos recomendados

- **Chat normal / agentes**: `qwen3.7-max`
- **Más rápido y ligero**: `qwen3.7-plus`
- **Codificación**: `qwen3-coder-plus`
- **Imágenes/video a través de Qwen Chat**: `qwen3-vl-plus`
- **Open WebUI default**: `qwen3.7-max`
- **Cualquier otro modelo** (incluidos los nuevos del chat de Qwen): solo indica su ID — el proxy transmitirá la petición directamente.

## Comandos útiles

```bash
npm run auth                  # administrar cuentas
npm run models:sync           # actualizar la lista de modelos
npm run smoke                 # comprobación rápida de la API
SKIP_ACCOUNT_MENU=true npm start
```

Comprobaciones manuales:

```bash
curl http://localhost:3264/api/health
curl http://localhost:3264/api/status
curl http://localhost:3264/api/models
curl http://localhost:3264/api/images/status
curl http://localhost:3264/api/videos/status
```

## Documentación

- [docs/FORK_DEMO_QUICKSTART.md](docs/FORK_DEMO_QUICKSTART.md) — escenario rápido para demo/video.
- [docs/QWEN_CHAT_MODELS.md](docs/QWEN_CHAT_MODELS.md) — informe de sincronización de modelos de Qwen Chat.
- [IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md) — generación de imágenes y video a través de `chatType`.
- [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md) — endpoints de imagen DashScope/Qwen.
- [docs/OPENWEBUI_SETUP.md](docs/OPENWEBUI_SETUP.md) — cómo conectar Open WebUI.
- [examples/hermes/config-snippet.yaml](examples/hermes/config-snippet.yaml) — provider de Hermes Agent; consulta la sección anterior para OpenCode, Claude Code y OpenClaw.
- [examples/litellm/qwen_litellm.yaml](examples/litellm/qwen_litellm.yaml) — puente LiteLLM.

## Limitaciones

- Es un browser-based proxy no oficial; Qwen puede cambiar su API interna.
- Las cuentas de Qwen Chat pueden alcanzar límites; usa varias cuentas para round-robin.
- La vinculación de chat/task/file de Qwen a la cuenta se guarda solo en memoria del proceso y no conserva tokens bearer. Tras un reinicio, un `chatId` desconocido se reemplaza de forma segura por un chat nuevo; al enviar el historial completo de OpenAI, el proxy lo traslada al chat nuevo. Los archivos privados deben subirse de nuevo y el `taskId` antiguo no puede consultarse.
- El entrypoint de Python no acepta adjuntos de archivos de Qwen porque no puede verificar de forma segura la cuenta propietaria del archivo. Para upload y envío de archivos usa el entrypoint de Node.js.
- Los tokens caducan — usa `npm run auth -- --relogin`.
- La generación de foto/video depende de la disponibilidad de las funciones de Qwen Chat en cada cuenta concreta.
- Las URLs de los medios generados pueden ser temporales.
- Para producción úsalo con cuidado: es una herramienta para experimentos, demos y workflows locales.
