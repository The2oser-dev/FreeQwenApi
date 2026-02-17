# Image and Video Generation Guide

## Overview

The Qwen API Proxy supports three content generation types through the `chatType` parameter:

- **Text Chat (t2t)** — standard conversational AI, streaming response (default)
- **Image Generation (t2i)** — text-to-image, streaming response (~10-30s)
- **Video Generation (t2v)** — text-to-video, task polling system (~30-120s)

## Key Differences

| Feature | Text (t2t) | Image (t2i) | Video (t2v) |
| -------------------- | ------------------- | ---------------------------- | ------------------------------- |
| **Request Type** | `stream: true` | `stream: true` | `stream: false` |
| **Response Method** | Streaming SSE | Streaming SSE | Task polling |
| **Time to Complete** | ~2-5s | ~10-30s | ~30-120s |
| **URL Location** | N/A (text) | `choices[0].message.content` | `video_url` / `content` |
| **Server Polling** | No | No | Yes (automatic) |
| **Task ID** | No | No | Yes |

---

## Image Generation (t2i)

### How It Works

1. Client sends POST request with `chatType: "t2i"`
2. Server creates chat with `stream: true`
3. Server receives streaming SSE response with image URL
4. Image URL arrives in `content` field of streaming chunks
5. Server returns complete URL to client

### Request Format

```
POST /api/chat
Content-Type: application/json

{
  "message": "Your image description prompt",
  "model": "qwen3-vl-plus",
  "chatType": "t2i",
  "size": "16:9"
}
```

### Parameters

| Parameter | Required | Description | Example Values |
| ---------- | -------- | ---------------------------------------- | --------------------------------------------- |
| `message` | Yes | Text description of the image to generate | `"A sunset over the ocean with purple clouds"` |
| `model` | Optional | Model to use (defaults to qwen-max-latest) | `qwen-max-latest`, `qwen3-vl-plus` |
| `chatType` | Yes | Must be `"t2i"` | `"t2i"` |
| `size` | Optional | Aspect ratio | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"` |
| `chatId` | Optional | Existing chat ID to continue context | UUID from previous response |
| `parentId` | Optional | Parent message ID | UUID from previous response |

### Expected Response

```json
{
  "id": "response-uuid-here",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen3-vl-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "https://cdn.qwenlm.ai/output/.../t2i/.../image.png?key=..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "characters": 0,
    "width": 2688,
    "image_count": 1,
    "height": 1536
  },
  "response_id": "response-uuid-here",
  "chatId": "chat-uuid-here",
  "parentId": "parent-uuid-here"
}
```

The `content` field contains the direct URL(s) to the generated image(s). Image URLs are typically hosted on `cdn.qwenlm.ai`.

### Examples

**JavaScript (fetch):**

```javascript
const response = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "A beautiful landscape with mountains and a lake at sunrise",
    model: "qwen3-vl-plus",
    chatType: "t2i",
    size: "16:9"
  }),
});

const data = await response.json();
const imageUrl = data.choices[0].message.content;
console.log("Generated Image:", imageUrl);
```

**cURL:**

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A futuristic city at night with neon lights",
    "model": "qwen3-vl-plus",
    "chatType": "t2i",
    "size": "16:9"
  }'
```

**PowerShell:**

```powershell
$body = @{
    message = "A cute cat sitting on a bookshelf"
    model = "qwen3-vl-plus"
    chatType = "t2i"
    size = "1:1"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3264/api/chat" `
    -Method Post -Body $body -ContentType "application/json"

$imageUrl = $response.choices[0].message.content
Write-Host "Image URL: $imageUrl"
```

---

## Video Generation (t2v)

### How It Works

Video generation supports two polling modes:

#### Mode 1: Server-Side Polling (Default)

Best for simple integrations, shorter videos (<2 min).

1. Client sends request with `chatType: "t2v"` and `waitForCompletion: true` (default)
2. Server creates task — Qwen API returns `task_id`
3. Server polls automatically every 2 seconds (up to 90 attempts = 3 min)
4. Task completes — returns video URL to client

**Pros:** Simple, single request, no client logic needed.
**Cons:** Long HTTP connection, fixed 3-minute timeout.

#### Mode 2: Client-Side Polling (Manual)

Best for long videos (>2 min), custom timeouts, UI progress tracking.

1. Client sends request with `chatType: "t2v"` and `waitForCompletion: false`
2. Server returns `task_id` immediately (~1-2s)
3. Client polls `GET /api/tasks/status/:taskId` every 2-5 seconds
4. Task completes — client receives video URL

**Pros:** Flexible timeout, progress tracking, better for long operations.
**Cons:** Requires client-side polling logic.

### Request Format

```
POST /api/chat
Content-Type: application/json

{
  "message": "Your video description prompt",
  "model": "qwen3-vl-plus",
  "chatType": "t2v",
  "size": "16:9"
}
```

### Parameters

| Parameter | Required | Description | Example Values |
| ------------------- | -------- | ----------------------------------------------------- | --------------------------------------------- |
| `message` | Yes | Text description of the video to generate | `"Ocean waves on a sandy beach at sunset"` |
| `model` | Yes | Model to use | `qwen3-vl-plus`, `qwen-max-latest` |
| `chatType` | Yes | Must be `"t2v"` | `"t2v"` |
| `size` | Optional | Aspect ratio (default: `"16:9"`) | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"` |
| `waitForCompletion` | Optional | Server polls until complete (default: `true`) | `true` / `false` |
| `chatId` | Optional | Existing chat ID | UUID from previous response |
| `parentId` | Optional | Parent message ID | UUID from previous response |

**Important:** Video size uses aspect ratio format (e.g., `"16:9"`), not pixel dimensions.

### Expected Response

```json
{
  "id": "task-uuid-here",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen3-vl-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "https://cdn.qwenlm.ai/output/.../t2v/.../video.mp4?key=..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  },
  "task_id": "task-uuid-here",
  "video_url": "https://cdn.qwenlm.ai/output/.../t2v/.../video.mp4?key=...",
  "chatId": "chat-uuid-here",
  "parentId": "task-uuid-here"
}
```

### Examples

**Server-Side Polling (default):**

```javascript
const response = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "A calm ocean with gentle waves at sunset",
    model: "qwen3-vl-plus",
    chatType: "t2v",
    size: "16:9"
  }),
});

const data = await response.json();
if (data.error) {
  console.error("Video generation failed:", data.error);
} else {
  const videoUrl = data.video_url || data.choices[0].message.content;
  console.log("Generated Video:", videoUrl);
}
```

**Client-Side Polling:**

```javascript
// Step 1: Create task (returns immediately)
const taskResponse = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "A serene forest with sunlight filtering through trees",
    model: "qwen3-vl-plus",
    chatType: "t2v",
    size: "16:9",
    waitForCompletion: false
  }),
});

const taskData = await taskResponse.json();
console.log("Task created:", taskData.task_id);

// Step 2: Poll until complete
const taskId = taskData.task_id;
let videoUrl = null;
let attempts = 0;
const maxAttempts = 90; // 3 min max

while (attempts < maxAttempts && !videoUrl) {
  attempts++;
  await new Promise(resolve => setTimeout(resolve, 2000));

  const statusResponse = await fetch(`http://localhost:3264/api/tasks/status/${taskId}`);
  const statusData = await statusResponse.json();
  const status = statusData.task_status || statusData.status;

  console.log(`Attempt ${attempts}: ${status}`);

  if (status === 'completed' || status === 'succeeded') {
    videoUrl = statusData.content || statusData.data?.content;
    console.log("Video ready:", videoUrl);
  } else if (status === 'failed' || status === 'error') {
    console.error("Task failed");
    break;
  }
}
```

**cURL (server-side polling):**

```bash
curl -X POST http://localhost:3264/api/chat \
  --max-time 200 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A bird flying over a forest",
    "model": "qwen3-vl-plus",
    "chatType": "t2v",
    "size": "16:9"
  }'
```

**cURL (client-side polling):**

```bash
# Step 1: Create task
TASK_ID=$(curl -s -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ocean waves at sunset",
    "model": "qwen3-vl-plus",
    "chatType": "t2v",
    "size": "16:9",
    "waitForCompletion": false
  }' | jq -r '.task_id')

echo "Task ID: $TASK_ID"

# Step 2: Poll status
while true; do
  STATUS=$(curl -s "http://localhost:3264/api/tasks/status/$TASK_ID" | jq -r '.task_status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done
```

---

## Comparison: Image vs Video

| Feature | Image (t2i) | Video (t2v) |
| ------------------- | ---------------------------- | ----------------------------------- |
| **Chat Type** | `"t2i"` | `"t2v"` |
| **Response Method** | Streaming | Task Polling |
| **Typical Duration** | 10-30 seconds | 30-120 seconds |
| **Response Field** | `choices[0].message.content` | `video_url` or `content` |
| **File Format** | `.jpg` / `.png` | `.mp4` |
| **Stream** | `true` (auto) | `false` (auto) |
| **Polling** | N/A | 90 attempts x 2s = 3 min max |
| **Client Timeout** | 30-60 seconds | 120-200 seconds |

---

## Best Practices

### Image Generation

1. **Detailed prompts** — include style, colors, mood, composition
2. **Recommended models** — `qwen3-vl-plus` (fast, good quality), `qwen-max-latest`
3. **Aspect ratios** — `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`
4. **Client timeout** — at least 60 seconds

### Video Generation

1. **Motion descriptions** — describe movement and changes, not static scenes
2. **Keep it simple** — focus on one main action/movement
3. **Aspect ratios** — `"16:9"` (default), `"9:16"`, `"1:1"`, `"4:3"`
4. **Client timeout** — at least 200 seconds
5. **Patience** — expect 1-2 minutes for generation

---

## Error Handling

### Timeout

```json
{ "error": "Task polling timeout exceeded", "status": "timeout", "task_id": "..." }
```

Retry the request or switch to client-side polling with a higher max attempts value.

### Task ID Not Found

```json
{ "error": "Task ID not found in response" }
```

Check Qwen API status — may be a temporary issue.

### Rate Limit

```json
{ "error": "RateLimited", "detail": "You've reached the upper limit for today's usage." }
```

Wait for daily limit reset or add more accounts.

---

## Testing

Run the bundled test scripts:

```bash
# Test all three generation types (chat, image, video)
npm run test:features

# Compare server-side vs client-side video polling
npm run test:video-polling
```

---

## Notes

1. Generated URLs are temporary — download content if you need it long-term
2. Higher resolutions take longer to generate
3. Multiple concurrent requests work with the multi-account system
4. Use `chatId` and `parentId` to generate related images/videos in context

## Related Endpoints

- `POST /api/chat` — text chat (`chatType: "t2t"`, default), image (`"t2i"`), video (`"t2v"`)
- `GET /api/tasks/status/:taskId` — poll video generation task status
- `GET /api/models` — list available models
- `POST /api/files/upload` — upload files for analysis
