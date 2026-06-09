import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildQwenCompletionUrl, buildQwenRequestHeaders, isQwenAntiBotBody } from '../src/api/chat.js';

test('buildQwenCompletionUrl appends chat_id query required by current Qwen API', () => {
  const url = buildQwenCompletionUrl('https://chat.qwen.ai/api/v2/chat/completions', 'chat-123');
  assert.equal(url, 'https://chat.qwen.ai/api/v2/chat/completions?chat_id=chat-123');
});

test('buildQwenCompletionUrl preserves existing query params', () => {
  const url = buildQwenCompletionUrl('https://chat.qwen.ai/api/v2/chat/completions?foo=bar', 'chat 123');
  assert.equal(url, 'https://chat.qwen.ai/api/v2/chat/completions?foo=bar&chat_id=chat+123');
});

test('buildQwenRequestHeaders includes current web headers expected by Qwen', () => {
  const headers = buildQwenRequestHeaders('token-value', () => 'request-id');
  assert.equal(headers.Authorization, 'Bearer token-value');
  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers.source, 'web');
  assert.equal(headers.Version, '0.2.63');
  assert.equal(headers['X-Request-Id'], 'request-id');
  assert.ok(headers.Timezone.includes('GMT'));
});

test('isQwenAntiBotBody detects Qwen x5 captcha HTML challenge', () => {
  const body = '<script>sessionStorage.x5referer = window.location.href;window.location.replace("https://chat.qwen.ai//api/v2/chat/completions/_____tmd_____/punish?x5step=1");window._config_ = {"action":"captcha"};</script><!--rgv587_flag:sm-->';
  assert.equal(isQwenAntiBotBody(body), true);
  assert.equal(isQwenAntiBotBody('{"success":true}'), false);
});

test('isQwenAntiBotBody detects Qwen JSON captcha challenge', () => {
  const body = '{"ret":["FAIL_SYS_USER_VALIDATE","RGV587_ERROR::SM::哎哟喂"],"data":{"url":"https://chat.qwen.ai/api/v2/chat/completions/_____tmd_____/punish?action=captcha&pureCaptcha="}}';
  assert.equal(isQwenAntiBotBody(body), true);
});
