// In-memory sliding window rate limiter with automatic stale-entry cleanup

class RateLimiter {
  constructor() {
    this.hits = new Map();
    this.lastCleanup = Date.now();
  }

  cleanup(now) {
    if (now - this.lastCleanup < 60000) return;
    this.lastCleanup = now;
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter(t => now - t < 120000);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  check(key, limit = 20, windowMs = 60000) {
    const now = Date.now();
    this.cleanup(now);

    const windowStart = now - windowMs;
    const timestamps = (this.hits.get(key) || []).filter(t => t > windowStart);

    if (timestamps.length >= limit) {
      const oldestInWindow = timestamps[0];
      const resetTime = oldestInWindow + windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfterSec: Math.max(1, Math.ceil((resetTime - now) / 1000))
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);
    return {
      allowed: true,
      remaining: limit - timestamps.length,
      resetTime: now + windowMs,
      retryAfterSec: 0
    };
  }

  reset(key) {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }
}

export const ocrRateLimiter = new RateLimiter();
export { RateLimiter };
