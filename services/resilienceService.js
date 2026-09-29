/**
 * Central Resilience & Performance Module for LOXER Job Platform
 * Features:
 * 1. ProviderCircuitBreaker: CLOSED, OPEN, HALF_OPEN states for external providers
 * 2. JobSearchCache: In-memory TTL cache (TTL 5 mins, max 500 entries)
 * 3. ConcurrencySemaphore: Limit simultaneous outbound API requests (max 5)
 * 4. IPCache: Public IP caching singleton with 1 hour TTL
 * 5. SlidingWindowRateLimiter: 60 req/min per client IP for jobs & query endpoints
 */

// ---------------------------------------------------------------------------
// 1. Circuit Breaker
// ---------------------------------------------------------------------------

export class ProviderCircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = Date.now();
  }

  isOpen() {
    if (this.state === 'OPEN') {
      // Check if reset timeout has elapsed to allow probe request (HALF_OPEN)
      if (Date.now() - this.lastStateChange >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.lastStateChange = Date.now();
        console.info(`[CircuitBreaker:${this.name}] Transitioned to HALF_OPEN (probing...)`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    if (this.state !== 'CLOSED') {
      console.info(`[CircuitBreaker:${this.name}] Recovered: Transitioned to CLOSED`);
      this.state = 'CLOSED';
      this.lastStateChange = Date.now();
    }
  }

  recordFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    const errMsg = error?.message || String(error);

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
      console.warn(
        `[CircuitBreaker:${this.name}] Transitioned to OPEN after ${this.failureCount} consecutive failures. Last error: ${errMsg}`
      );
    } else {
      console.warn(
        `[CircuitBreaker:${this.name}] Failure recorded (${this.failureCount}/${this.failureThreshold}). Error: ${errMsg}`
      );
    }
  }

  /**
   * Executes an asynchronous task protected by the circuit breaker.
   * If OPEN, fails fast (<1ms) and returns the fallback value.
   */
  async execute(action, fallback = null) {
    if (this.isOpen()) {
      return typeof fallback === 'function'
        ? fallback()
        : fallback || { jobs: [], hits: 0, pages: 0, fromBreaker: true, provider: this.name };
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      if (fallback !== null) {
        return typeof fallback === 'function'
          ? fallback(error)
          : { ...fallback, fromBreaker: true, provider: this.name, error: error.message };
      }
      throw error;
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = Date.now();
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
    };
  }
}

// Global registry of provider circuit breakers
const circuitBreakers = new Map();

export function getProviderCircuitBreaker(name, options = {}) {
  const key = String(name || 'default').toLowerCase();
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, new ProviderCircuitBreaker(key, options));
  }
  return circuitBreakers.get(key);
}

// Pre-initialize standard providers
export const careerjetBreaker = getProviderCircuitBreaker('careerjet');
export const arbeitnowBreaker = getProviderCircuitBreaker('arbeitnow');
export const jsearchBreaker = getProviderCircuitBreaker('jsearch');

// ---------------------------------------------------------------------------
// 2. In-Memory Job Search Hot Cache
// ---------------------------------------------------------------------------

export class JobSearchCache {
  constructor(maxEntries = 500, defaultTtlMs = 5 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map(); // key -> { data, expiresAt }
  }

  static generateKey(params = {}) {
    const {
      keywords = '',
      location = '',
      page = 1,
      salary = 0,
      provider = 'all',
      sort = '',
      contract_type = '',
      work_hours = '',
    } = params;

    const k = String(keywords || '').trim().toLowerCase();
    const l = String(location || '').trim().toLowerCase();
    const p = Number(page) || 1;
    const s = Number(salary) || 0;
    const prov = String(provider || 'all').trim().toLowerCase();
    const so = String(sort || '').trim().toLowerCase();
    const c = String(contract_type || '').trim().toLowerCase();
    const w = String(work_hours || '').trim().toLowerCase();

    return `${prov}:${k}:${l}:${p}:${s}:${so}:${c}:${w}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU position (delete & re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key, data, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (first item in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const jobSearchCache = new JobSearchCache(500, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// 3. Concurrency Semaphore (Max 5 concurrent outbound API calls)
// ---------------------------------------------------------------------------

export class ConcurrencySemaphore {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve(() => this.release());
      });
    });
  }

  release() {
    this.running--;
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  async run(fn) {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export const outboundApiSemaphore = new ConcurrencySemaphore(5);

// ---------------------------------------------------------------------------
// 4. IP Cache Singleton (TTL 1 Hour)
// ---------------------------------------------------------------------------

export class IPCache {
  constructor(ttlMs = 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
    this.cachedIp = '';
    this.cachedAt = 0;
    this.inFlightPromise = null;
  }

  isFresh() {
    return Boolean(this.cachedIp && Date.now() - this.cachedAt < this.ttlMs);
  }

  async getPublicIp() {
    if (this.isFresh()) {
      return this.cachedIp;
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = (async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json', {
          signal: AbortSignal.timeout(3500),
        });
        if (!response.ok) return this.cachedIp || '';
        const payload = await response.json();
        const ip = payload?.ip || '';
        if (ip) {
          this.cachedIp = ip;
          this.cachedAt = Date.now();
        }
        return this.cachedIp;
      } catch (err) {
        console.warn('[IPCache] Failed to resolve public IP:', err.message);
        return this.cachedIp || '';
      } finally {
        this.inFlightPromise = null;
      }
    })();

    return this.inFlightPromise;
  }

  clear() {
    this.cachedIp = '';
    this.cachedAt = 0;
    this.inFlightPromise = null;
  }
}

export const ipCache = new IPCache(60 * 60 * 1000);
export const getPublicIp = () => ipCache.getPublicIp();

// ---------------------------------------------------------------------------
// 5. In-Memory Sliding Window Rate Limiter (60 req/min per client IP)
// ---------------------------------------------------------------------------

export class SlidingWindowRateLimiter {
  constructor(maxRequests = 60, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clientTimestamps = new Map(); // ip -> Array<number>

    // Periodic cleanup of stale IPs every 2 minutes
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.cleanup(), 2 * 60 * 1000);
      if (timer.unref) timer.unref();
    }
  }

  check(ip) {
    if (!ip) return { allowed: true, remaining: this.maxRequests, resetMs: 0 };

    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.clientTimestamps.get(ip);
    if (!timestamps) {
      timestamps = [];
      this.clientTimestamps.set(ip, timestamps);
    }

    // Filter out timestamps outside the active sliding window
    while (timestamps.length > 0 && timestamps[0] <= windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        retryAfterSec: Math.ceil(resetMs / 1000) || 1,
      };
    }

    timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetMs: this.windowMs,
      retryAfterSec: 0,
    };
  }

  cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.clientTimestamps.entries()) {
      while (timestamps.length > 0 && timestamps[0] <= windowStart) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        this.clientTimestamps.delete(ip);
      }
    }
  }

  reset(ip) {
    if (ip) {
      this.clientTimestamps.delete(ip);
    } else {
      this.clientTimestamps.clear();
    }
  }
}

export const apiRateLimiter = new SlidingWindowRateLimiter(60, 60 * 1000);
export const dbRateLimiter = new SlidingWindowRateLimiter(600, 60 * 1000);
