export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ZokoAnime Scraper & Direct M3U8 API',
    version: '1.0.0',
    description: `High-performance direct stream extractor and API for ZokoAnime (zokoanime.video).
Deobfuscates stream tokens to extract direct master.m3u8 playlists, parsed quality streams, WebVTT subtitles, and intro/outro timestamps without running headless browsers.`
  },
  servers: [
    {
      url: '/',
      description: 'Current Server'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns service health and system uptime',
        responses: {
          '200': {
            description: 'Service is healthy'
          }
        }
      }
    },
    '/api/stream': {
      get: {
        summary: 'Get stream by query parameters or URL',
        description: 'Extracts direct master.m3u8 stream and qualities by MAL/AniList ID or full player URL',
        parameters: [
          {
            name: 'id',
            in: 'query',
            description: 'Anime ID (e.g. 21 for One Piece, 5114 for FMAB)',
            required: false,
            schema: { type: 'string', example: '21' }
          },
          {
            name: 'episode',
            in: 'query',
            description: 'Episode number',
            required: false,
            schema: { type: 'number', example: 1, default: 1 }
          },
          {
            name: 'source',
            in: 'query',
            description: 'Metadata source (mal = MyAnimeList, ani = AniList)',
            required: false,
            schema: { type: 'string', enum: ['mal', 'ani'], default: 'mal' }
          },
          {
            name: 'track',
            in: 'query',
            description: 'Audio/Subtitle track',
            required: false,
            schema: { type: 'string', enum: ['sub', 'dub', 'hsub'], default: 'sub' }
          },
          {
            name: 'server',
            in: 'query',
            description: 'Stream server',
            required: false,
            schema: { type: 'string', enum: ['zoko', 'kiwi'], default: 'zoko' }
          },
          {
            name: 'url',
            in: 'query',
            description: 'Alternative: Direct ZokoAnime player or stream URL',
            required: false,
            schema: { type: 'string', example: 'https://zokoanime.video/stream/mal/21/1/sub' }
          },
          {
            name: 'parseM3u8',
            in: 'query',
            description: 'Fetch and parse master playlist into quality variants',
            required: false,
            schema: { type: 'boolean', default: true }
          },
          {
            name: 'refresh',
            in: 'query',
            description: 'Bypass cache and force fresh scrape',
            required: false,
            schema: { type: 'boolean', default: false }
          }
        ],
        responses: {
          '200': {
            description: 'Stream extraction result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        server: { type: 'string', example: 'zoko' },
                        source: { type: 'string', example: 'mal' },
                        animeId: { type: 'string', example: '21' },
                        episode: { type: 'number', example: 1 },
                        track: { type: 'string', example: 'sub' },
                        embedUrl: { type: 'string', example: 'https://zokoanime.video/stream/mal/21/1/sub' },
                        masterUrl: { type: 'string', example: 'https://hls.dramahot.top/p/.../master.m3u8' },
                        qualities: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              quality: { type: 'string', example: '1080p' },
                              resolution: { type: 'string', example: '1920x1080' },
                              bandwidth: { type: 'number', example: 5300000 },
                              url: { type: 'string' }
                            }
                          }
                        },
                        subtitles: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              lang: { type: 'string', example: 'en' },
                              label: { type: 'string', example: 'English' },
                              default: { type: 'boolean', example: true },
                              url: { type: 'string' }
                            }
                          }
                        },
                        skip: {
                          type: 'object',
                          properties: {
                            intro: {
                              type: 'object',
                              properties: {
                                start: { type: 'number', example: 31 },
                                end: { type: 'number', example: 111 }
                              }
                            },
                            outro: {
                              type: 'object',
                              properties: {
                                start: { type: 'number', example: 1376 },
                                end: { type: 'number', example: 1447 }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/stream/{source}/{id}/{episode}/{track}': {
      get: {
        summary: 'Get stream by path parameters',
        description: 'Matches ZokoAnime player path routing scheme',
        parameters: [
          {
            name: 'source',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['mal', 'ani'] }
          },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: '21' }
          },
          {
            name: 'episode',
            in: 'path',
            required: true,
            schema: { type: 'number', example: 1 }
          },
          {
            name: 'track',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['sub', 'dub', 'hsub'] }
          },
          {
            name: 'server',
            in: 'query',
            schema: { type: 'string', enum: ['zoko', 'kiwi'], default: 'zoko' }
          },
          {
            name: 'parseM3u8',
            in: 'query',
            schema: { type: 'boolean', default: true }
          }
        ],
        responses: {
          '200': { description: 'Stream extraction result' }
        }
      }
    },
    '/api/extract': {
      post: {
        summary: 'Extract stream from any URL',
        description: 'Takes any ZokoAnime player, stream, or kiwi embed URL and returns direct stream info',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', example: 'https://zokoanime.video/player?id=21&ep=1' },
                  parseM3u8: { type: 'boolean', default: true },
                  refresh: { type: 'boolean', default: false }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Extraction result' }
        }
      }
    },
    '/api/proxy/stream': {
      get: {
        summary: 'CORS HLS proxy stream',
        description: 'Proxies M3U8 playlists and video segments with permissive CORS headers',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': { description: 'Proxied playlist or video chunk' }
        }
      }
    }
  }
};
