import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { xor, deobfuscate, obfuscate, extractPayloadFromHtml, extractKiwiM3u8, OBF_KEY } from '../src/deobfuscate.js';

describe('Deobfuscate Utilities', () => {
  test('xor performs symmetric byte XOR with key', () => {
    const original = 'Hello World 123';
    const encoded = xor(original, OBF_KEY);
    const decoded = xor(encoded, OBF_KEY);
    assert.equal(decoded, original);
  });

  test('obfuscate and deobfuscate roundtrip', () => {
    const testData = {
      src: 'https://example.com/master.m3u8',
      video_id: 1234,
      subtitles: [{ lang: 'en', label: 'English', src: 'https://example.com/subs.vtt' }]
    };

    const blob = obfuscate(testData);
    assert.equal(typeof blob, 'string');

    const decoded = deobfuscate(blob);
    assert.deepEqual(decoded, testData);
  });

  test('extractPayloadFromHtml extracts window.__P blob', () => {
    const html = `
      <!doctype html><html><head><title>Test</title></head>
      <body>
      <script>window.__P="dGVzdF9wYXlsb2Fk"</script>
      </body></html>
    `;
    const payload = extractPayloadFromHtml(html);
    assert.equal(payload, 'dGVzdF9wYXlsb2Fk');
  });

  test('extractKiwiM3u8 extracts and decodes base64 url from iframe', () => {
    const targetUrl = 'https://example.com/stream/master.m3u8';
    const b64 = Buffer.from(targetUrl).toString('base64');
    const html = `
      <div id="stage">
        <iframe src="https://mewcdn.online/player/plyr.php#${b64}#" title="Kiwi"></iframe>
      </div>
    `;
    const extracted = extractKiwiM3u8(html);
    assert.equal(extracted, targetUrl);
  });

  test('deobfuscate throws on empty or invalid payload', () => {
    assert.throws(() => deobfuscate(''), /Invalid payload/);
    assert.throws(() => deobfuscate(null), /Invalid payload/);
  });
});
