import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ZokoAnimeClient } from '../src/client.js';
import { MemoryCache } from '../src/cache.js';
import { obfuscate } from '../src/deobfuscate.js';

describe('ZokoAnimeClient', () => {
  test('client handles mocked Zoko stream embed', async () => {
    const mockPayload = {
      src: 'https://cdn.example.com/stream/master.m3u8',
      video_id: 9999,
      download_url: '/download/mal/21/1/sub',
      subtitles: [
        { lang: 'en', label: 'English', default: true, src: 'https://cdn.example.com/subs.vtt' }
      ],
      skip: {
        intro: { start: 10, end: 90 },
        outro: { start: 1200, end: 1290 }
      }
    };
    const blob = obfuscate(mockPayload);
    const mockHtml = `<html><body><script>window.__P="${blob}"</script></body></html>`;

    const client = new ZokoAnimeClient({
      cache: new MemoryCache()
    });

    // Mock request and fetchPlaylist
    client.request = async () => ({
      ok: true,
      status: 200,
      text: async () => mockHtml
    });

    client.fetchPlaylist = async () => `
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080/index.m3u8
    `.trim();

    const result = await client.getStream({
      id: 21,
      episode: 1,
      source: 'mal',
      track: 'sub'
    });

    assert.equal(result.success, true);
    assert.equal(result.masterUrl, 'https://cdn.example.com/stream/master.m3u8');
    assert.equal(result.videoId, 9999);
    assert.equal(result.qualities.length, 1);
    assert.equal(result.qualities[0].quality, '1080p');
    assert.equal(result.subtitles.length, 1);
    assert.equal(result.skip.intro.start, 10);
  });

  test('client throws on missing anime id', async () => {
    const client = new ZokoAnimeClient();
    await assert.rejects(
      () => client.getStream({ episode: 1 }),
      /Anime id is required/
    );
  });
});
