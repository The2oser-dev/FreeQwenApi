import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Node runtime defaults to the current Qwen model when no override is set', (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), 'freeqwen-default-model-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  const configUrl = new URL('../src/config.js', import.meta.url).href;
  const { DEFAULT_MODEL: _ignored, ...cleanEnv } = process.env;
  const stdout = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { DEFAULT_MODEL } from ${JSON.stringify(configUrl)}; process.stdout.write(DEFAULT_MODEL);`
    ],
    { cwd, env: cleanEnv, encoding: 'utf8' }
  );

  assert.equal(stdout, 'qwen3.7-max');
});

test('route fallbacks use DEFAULT_MODEL instead of the rejected legacy literal', () => {
  const routesSource = readFileSync(path.join(projectRoot, 'src', 'api', 'routes.js'), 'utf8');
  assert.doesNotMatch(routesSource, /qwen-max-latest/);
});

test('Python runtime has the same configurable default model', () => {
  const pythonSource = readFileSync(path.join(projectRoot, 'main.py'), 'utf8');
  assert.match(
    pythonSource,
    /DEFAULT_MODEL\s*=\s*os\.environ\.get\("DEFAULT_MODEL",\s*"qwen3\.7-max"\)/
  );
});
