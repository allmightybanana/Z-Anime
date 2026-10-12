export const OBF_KEY = 'otaku-embed-v1';

/**
 * Performs XOR operation against the key.
 * @param {string} str Binary string
 * @param {string} key Key string
 * @returns {string}
 */
export function xor(str, key = OBF_KEY) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

/**
 * Deobfuscates base64 XOR payload from ZokoAnime window.__P
 * @param {string} blob Base64 encoded payload
 * @returns {object} Parsed JSON payload
 */
export function deobfuscate(blob) {
  if (!blob || typeof blob !== 'string') {
    throw new Error('Invalid payload: blob must be a non-empty string');
  }
  const binary = Buffer.from(blob, 'base64').toString('binary');
  const xored = xor(binary, OBF_KEY);
  const jsonStr = decodeURIComponent(escape(xored));
  return JSON.parse(jsonStr);
}

/**
 * Obfuscates an object into ZokoAnime format (for testing / simulation)
 * @param {object} obj Object to encode
 * @returns {string} Base64 encoded string
 */
export function obfuscate(obj) {
  const jsonStr = JSON.stringify(obj);
  const unescaped = unescape(encodeURIComponent(jsonStr));
  const xored = xor(unescaped, OBF_KEY);
  return Buffer.from(xored, 'binary').toString('base64');
}

/**
 * Extracts window.__P payload from HTML
 * @param {string} html Raw HTML
 * @returns {string|null}
 */
export function extractPayloadFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const match = html.match(/window\.__P\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

/**
 * Extracts Kiwi-Stream direct M3U8 from iframe source in HTML
 * Format: <iframe src="https://mewcdn.online/player/plyr.php#<base64_m3u8>#" ...>
 * @param {string} html Raw HTML
 * @returns {string|null}
 */
export function extractKiwiM3u8(html) {
  if (!html || typeof html !== 'string') return null;
  const match = html.match(/iframe\s+src=["']([^"']*mewcdn\.online\/player\/plyr\.php#([^#]+)#?)["']/i);
  if (match && match[2]) {
    try {
      const decoded = Buffer.from(match[2], 'base64').toString('utf8');
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        return decoded;
      }
    } catch {
      // Fall through
    }
  }

  // Alternative pattern: any base64 string after hash in plyr.php
  const altMatch = html.match(/plyr\.php#([A-Za-z0-9+/=]+)/i);
  if (altMatch && altMatch[1]) {
    try {
      const decoded = Buffer.from(altMatch[1], 'base64').toString('utf8');
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        return decoded;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}
