import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

describe('API Endpoints', () => {
  let app;
  let server;
  let port;
  let baseUrl;

  before(async () => {
    app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('GET /health returns status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'zokoanime-scraper');
  });

  test('GET /openapi.json returns valid spec', async () => {
    const res = await fetch(`${baseUrl}/openapi.json`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.openapi, '3.0.3');
    assert.equal(data.info.title, 'ZokoAnime Scraper & Direct M3U8 API');
  });

  test('GET /api/cache/stats returns stats', async () => {
    const res = await fetch(`${baseUrl}/api/cache/stats`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.size !== undefined);
  });

  test('GET /api/stream without id or url returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/stream`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'MISSING_PARAM');
  });
});
