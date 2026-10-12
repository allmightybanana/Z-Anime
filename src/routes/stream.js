import { Router } from 'express';
import { defaultClient } from '../client.js';

export const streamRouter = Router();

/**
 * GET /api/stream
 * Query params:
 *   - id: Anime ID (MAL or AniList)
 *   - episode: Episode number (default: 1)
 *   - source: 'mal' | 'ani' (default: 'mal')
 *   - track: 'sub' | 'dub' | 'hsub' (default: 'sub')
 *   - server: 'zoko' | 'kiwi' (default: 'zoko')
 *   - parseM3u8: 'true' | 'false' (default: true)
 *   - url: Optional direct URL (e.g., https://zokoanime.video/player?id=21&ep=1)
 */
streamRouter.get('/stream', async (req, res, next) => {
  try {
    const { url, id, episode, source, track, server, parseM3u8, color, autoplay, refresh } = req.query;

    let result;
    if (url) {
      result = await defaultClient.getStream({
        url: String(url),
        parseM3u8: parseM3u8 !== 'false',
        bypassCache: refresh === 'true'
      });
    } else {
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAM',
            message: 'Parameter "id" or "url" is required. Example: /api/stream?id=21&episode=1&source=mal&track=sub'
          }
        });
      }

      result = await defaultClient.getStream({
        id: String(id),
        episode: episode ? parseFloat(episode) : 1,
        source: source ? String(source) : 'mal',
        track: track ? String(track) : 'sub',
        server: server ? String(server) : 'zoko',
        parseM3u8: parseM3u8 !== 'false',
        color: color ? String(color) : undefined,
        autoplay: autoplay === 'true',
        bypassCache: refresh === 'true'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stream/:source/:id/:episode/:track
 * Path-parameter format matching ZokoAnime stream route
 */
streamRouter.get('/stream/:source/:id/:episode/:track', async (req, res, next) => {
  try {
    const { source, id, episode, track } = req.params;
    const { server, parseM3u8, refresh } = req.query;

    const result = await defaultClient.getStream({
      source,
      id,
      episode: parseFloat(episode) || 1,
      track,
      server: server ? String(server) : 'zoko',
      parseM3u8: parseM3u8 !== 'false',
      bypassCache: refresh === 'true'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/extract and GET /api/extract
 * Extracts direct M3U8 from any Zoko player / stream URL
 */
const handleExtract = async (req, res, next) => {
  try {
    const targetUrl = req.body?.url || req.query?.url;
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAM',
          message: 'Parameter "url" is required (in query string or JSON body)'
        }
      });
    }

    const parseM3u8 = (req.body?.parseM3u8 ?? req.query?.parseM3u8) !== 'false';
    const refresh = (req.body?.refresh ?? req.query?.refresh) === 'true';

    const result = await defaultClient.getStream({
      url: String(targetUrl),
      parseM3u8,
      bypassCache: refresh
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

streamRouter.get('/extract', handleExtract);
streamRouter.post('/extract', handleExtract);
