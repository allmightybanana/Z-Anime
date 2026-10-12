import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseMasterM3u8, parsePlayerUrl, buildEmbedUrl } from '../src/parsers.js';

describe('Parsers Utilities', () => {
  test('parsePlayerUrl parses /stream path format', () => {
    const res = parsePlayerUrl('https://zokoanime.video/stream/mal/21/1/sub');
    assert.deepEqual(res, {
      server: 'zoko',
      source: 'mal',
      id: '21',
      episode: 1,
      track: 'sub'
    });
  });

  test('parsePlayerUrl parses /kiwi path format', () => {
    const res = parsePlayerUrl('https://zokoanime.video/kiwi/ani/5114/4/dub');
    assert.deepEqual(res, {
      server: 'kiwi',
      source: 'ani',
      id: '5114',
      episode: 4,
      track: 'dub'
    });
  });

  test('parsePlayerUrl parses /player query format', () => {
    const res = parsePlayerUrl('https://zokoanime.video/player?id=21&ep=2&source=mal&track=sub');
    assert.deepEqual(res, {
      server: 'zoko',
      source: 'mal',
      id: '21',
      episode: 2,
      track: 'sub'
    });
  });

  test('buildEmbedUrl builds proper URL', () => {
    const url = buildEmbedUrl({
      server: 'zoko',
      source: 'mal',
      id: '21',
      episode: 1,
      track: 'sub',
      color: '35d5bf'
    });
    assert.equal(url, 'https://zokoanime.video/stream/mal/21/1/sub?color=35d5bf');
  });

  test('parseMasterM3u8 parses HLS variant streams', () => {
    const masterText = `
#EXTM3U
#EXT-X-VERSION:4
#EXT-X-STREAM-INF:BANDWIDTH=5300000,RESOLUTION=1920x1080
1080/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
720/index.m3u8
    `.trim();

    const baseUrl = 'https://cdn.example.com/stream/master.m3u8';
    const variants = parseMasterM3u8(masterText, baseUrl);

    assert.equal(variants.length, 2);
    assert.equal(variants[0].quality, '1080p');
    assert.equal(variants[0].resolution, '1920x1080');
    assert.equal(variants[0].bandwidth, 5300000);
    assert.equal(variants[0].url, 'https://cdn.example.com/stream/1080/index.m3u8');

    assert.equal(variants[1].quality, '720p');
    assert.equal(variants[1].resolution, '1280x720');
    assert.equal(variants[1].bandwidth, 2800000);
    assert.equal(variants[1].url, 'https://cdn.example.com/stream/720/index.m3u8');
  });
});
