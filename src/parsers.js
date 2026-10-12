/**
 * Parses HLS Master M3U8 playlist text into structured quality streams.
 * @param {string} m3u8Content Raw HLS master playlist text
 * @param {string} masterUrl Original signed master.m3u8 URL for relative path resolution
 * @returns {Array<{ quality: string, resolution: string, bandwidth: number, codecs?: string, url: string }>}
 */
export function parseMasterM3u8(m3u8Content, masterUrl) {
  if (!m3u8Content || typeof m3u8Content !== 'string') return [];

  const baseUrl = new URL(masterUrl);
  const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);

  const lines = m3u8Content.split(/\r?\n/);
  const variants = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/i);
      const bandMatch = line.match(/BANDWIDTH=(\d+)/i);
      const codeMatch = line.match(/CODECS="([^"]+)"/i);
      const nextLine = lines[i + 1]?.trim();

      if (nextLine && !nextLine.startsWith('#')) {
        let variantUrl = nextLine;
        if (!variantUrl.startsWith('http://') && !variantUrl.startsWith('https://')) {
          if (variantUrl.startsWith('/')) {
            variantUrl = `${baseUrl.origin}${variantUrl}`;
          } else {
            variantUrl = `${baseUrl.origin}${basePath}${variantUrl}`;
          }
          // Preserve query tokens if present on master playlist
          if (baseUrl.search && !variantUrl.includes('?')) {
            variantUrl += baseUrl.search;
          }
        }

        const resolution = resMatch ? resMatch[1] : 'auto';
        let quality = 'auto';
        if (resMatch) {
          const height = resMatch[1].split('x')[1];
          quality = `${height}p`;
        }

        variants.push({
          quality,
          resolution,
          bandwidth: bandMatch ? parseInt(bandMatch[1], 10) : 0,
          codecs: codeMatch ? codeMatch[1] : null,
          url: variantUrl
        });
      }
    }
  }

  // Sort highest resolution/bandwidth first
  variants.sort((a, b) => b.bandwidth - a.bandwidth);
  return variants;
}

/**
 * Parses and extracts anime parameters from any ZokoAnime player, stream, or embed URL.
 * Handles formats:
 * - https://zokoanime.video/player?id=21&ep=1
 * - https://zokoanime.video/player?source=mal&id=21&episode=1&track=sub&server=zoko
 * - https://zokoanime.video/stream/mal/21/1/sub
 * - https://zokoanime.video/kiwi/mal/21/1/sub
 * - https://zokoanime.video/download/mal/21/1/sub
 * 
 * @param {string} inputUrl Full URL or path string
 * @returns {{ server: string, source: string, id: string, episode: number, track: string } | null}
 */
export function parsePlayerUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;

  try {
    const rawUrl = inputUrl.startsWith('http') ? inputUrl : `https://zokoanime.video${inputUrl.startsWith('/') ? '' : '/'}${inputUrl}`;
    const parsed = new URL(rawUrl);
    const path = parsed.pathname;

    // Pattern 1: /stream/:source/:id/:episode/:track or /kiwi/:source/:id/:episode/:track or /download/...
    const pathMatch = path.match(/^\/(stream|kiwi|download)\/([a-z0-9_-]+)\/([a-z0-9_-]+)\/([0-9.]+)\/([a-z0-9_-]+)/i);
    if (pathMatch) {
      const type = pathMatch[1].toLowerCase();
      const server = type === 'kiwi' ? 'kiwi' : 'zoko';
      const source = pathMatch[2].toLowerCase();
      const id = pathMatch[3];
      const episode = parseFloat(pathMatch[4]) || 1;
      const track = pathMatch[5].toLowerCase();

      return {
        server,
        source: ['mal', 'ani'].includes(source) ? source : 'mal',
        id,
        episode,
        track: ['sub', 'dub', 'hsub'].includes(track) ? track : 'sub'
      };
    }

    // Pattern 2: /player or /stream with query params (?id=21&ep=1 or ?id=21&episode=1&track=dub...)
    const params = parsed.searchParams;
    const id = params.get('id') || params.get('animeId') || params.get('malId') || params.get('aniId');
    if (id) {
      const sourceParam = params.get('source') || (params.has('aniId') ? 'ani' : 'mal');
      const epParam = params.get('episode') || params.get('ep') || '1';
      const trackParam = params.get('track') || 'sub';
      const serverParam = params.get('server') || 'zoko';

      return {
        server: serverParam.toLowerCase() === 'kiwi' ? 'kiwi' : 'zoko',
        source: sourceParam.toLowerCase() === 'ani' ? 'ani' : 'mal',
        id: String(id),
        episode: parseFloat(epParam) || 1,
        track: ['sub', 'dub', 'hsub'].includes(trackParam.toLowerCase()) ? trackParam.toLowerCase() : 'sub'
      };
    }
  } catch {
    // Return null if parsing failed
  }

  return null;
}

/**
 * Builds standard embed URL from parameters
 * @param {object} params
 * @returns {string}
 */
export function buildEmbedUrl({ server = 'zoko', source = 'mal', id, episode = 1, track = 'sub', color, autoplay }) {
  if (!id) throw new Error('Anime id is required');
  const normalizedServer = server === 'kiwi' ? 'kiwi' : 'stream';
  const normalizedSource = source === 'ani' ? 'ani' : 'mal';
  const normalizedTrack = ['sub', 'dub', 'hsub'].includes(track) ? track : 'sub';

  let url = `https://zokoanime.video/${normalizedServer}/${normalizedSource}/${id}/${episode}/${normalizedTrack}`;

  const queryParams = new URLSearchParams();
  if (color) queryParams.set('color', String(color).replace('#', ''));
  if (autoplay) queryParams.set('autoplay', 'true');

  const query = queryParams.toString();
  return query ? `${url}?${query}` : url;
}
