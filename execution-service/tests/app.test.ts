import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';

async function withServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server = createApp().listen(0);
  await once(server, 'listening');

  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health reports that execution is disabled', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.executionEnabled, false);
  });
});

test('all advertised languages are unsupported', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/languages`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(body.data.length > 0);
    assert.ok(body.data.every((language: { supported: boolean }) => !language.supported));
  });
});

test('valid source code is rejected without execution', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'console.log("must not run")',
        language: 'javascript',
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error, 'EXECUTION_DISABLED');
    assert.equal(body.data, undefined);
  });
});