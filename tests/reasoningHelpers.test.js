import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveThinkingEnabled } from '../src/api/reasoning.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routesSource = readFileSync(path.join(projectRoot, 'src', 'api', 'routes.js'), 'utf8');

test('thinking controls are strict and predictable', () => {
  assert.equal(resolveThinkingEnabled({ enable_thinking: true }), true);
  assert.equal(resolveThinkingEnabled({ enable_thinking: ' off ' }), false);
  assert.equal(resolveThinkingEnabled({ reasoning_effort: 'high' }), true);
  assert.equal(resolveThinkingEnabled({ reasoning_effort: 'none' }), false);
  assert.equal(resolveThinkingEnabled({ thinking: { type: 'enabled' } }), true);
  assert.throws(() => resolveThinkingEnabled({ reasoning_effort: false }), /must be a string/);
  assert.throws(() => resolveThinkingEnabled({ reasoning_effort: 'unexpected' }), /must be one of/);
});

test('Anthropic and tool-call response adapters retain reasoning', () => {
  assert.match(routesSource, /content\.push\(\{ type: 'thinking', thinking: String\(message\.reasoning_content\) \}\)/);
  assert.match(routesSource, /\.\.\.\(reasoningContent \? \{ reasoning_content: reasoningContent \} : \{\}\)/);
});
