/**
 * High-performance in-memory TTL Cache with Request Coalescing.
 * Prevents thundering herds by deduplicating concurrent in-flight requests for identical keys.
 */
export class MemoryCache {
  /**
   * @param {Object} options
   * @param {number} [options.defaultTtlMs=300000] Default TTL (5 minutes)
   * @param {number} [options.maxSize=1000] Max number of items before eviction
   */
  constructor({ defaultTtlMs = 300000, maxSize = 1000 } = {}) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxSize = maxSize;
    this.store = new Map();
    this.inFlight = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      coalesced: 0
    };
  }

  /**
   * Get an entry if it exists and hasn't expired.
   * @param {string} key
   * @returns {any | undefined}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    // Refresh position for LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  /**
   * Set a cached value with optional TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.store.size >= this.maxSize) {
      // Evict oldest (first key in map)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs)
    });
  }

  /**
   * Request Coalescing wrapper: executes fetcher only once for concurrent identical calls.
   * @param {string} key
   * @param {() => Promise<any>} fetcher
   * @param {number} [ttlMs]
   * @returns {Promise<any>}
   */
  async wrap(key, fetcher, ttlMs = this.defaultTtlMs) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    if (this.inFlight.has(key)) {
      this.stats.coalesced++;
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        if (result !== undefined && result !== null) {
          this.set(key, result, ttlMs);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Delete entry from cache
   * @param {string} key
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear() {
    this.store.clear();
    this.inFlight.clear();
  }

  /**
   * Get current cache stats
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    for (const [_, entry] of this.store) {
      if (now <= entry.expiresAt) {
        validCount++;
      }
    }

    return {
      size: validCount,
      totalEntries: this.store.size,
      inFlightRequests: this.inFlight.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      coalesced: this.stats.coalesced,
      hitRatio: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(4)
        : '0.0000'
    };
  }
}

export const defaultCache = new MemoryCache();
