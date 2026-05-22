class RateLimiter {
  constructor(limit = 5, windowMs = 60 * 60 * 1000) {
    if (!global.__rateLimiterRequests) {
      global.__rateLimiterRequests = new Map();
    }
    this.requests = global.__rateLimiterRequests;
    this.limit = limit;
    this.windowMs = windowMs;
  }

  getClientKey(request) {
    // 1. Resolve IP from standard Vercel/reverse proxy headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      // Split in case of comma-separated list of proxies, take client IP
      return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      return realIp;
    }

    // 2. Fallback to client ID query parameter
    const clientId = request.nextUrl.searchParams.get("id") || request.nextUrl.searchParams.get("clientId");
    if (clientId) {
      return clientId;
    }

    return "anonymous";
  }

  isRateLimited(request) {
    const key = this.getClientKey(request);
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside the current sliding window
    const activeTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    if (activeTimestamps.length >= this.limit) {
      // Keep only active timestamps to free memory
      this.requests.set(key, activeTimestamps);
      console.warn(`RateLimiter: IP/ID '${key}' rate limited. Active requests in window: ${activeTimestamps.length}`);
      return true;
    }

    activeTimestamps.push(now);
    this.requests.set(key, activeTimestamps);
    return false;
  }

  getRemaining(request) {
    const key = this.getClientKey(request);
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const activeTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);
    return Math.max(0, this.limit - activeTimestamps.length);
  }

  prune() {
    const now = Date.now();
    let prunedCount = 0;
    for (const [key, timestamps] of this.requests.entries()) {
      const activeTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);
      if (activeTimestamps.length === 0) {
        this.requests.delete(key);
        prunedCount++;
      } else if (activeTimestamps.length !== timestamps.length) {
        this.requests.set(key, activeTimestamps);
      }
    }
    if (prunedCount > 0) {
      console.log(`RateLimiter: Pruned ${prunedCount} idle IP addresses from memory.`);
    }
  }
}

// Export singleton configured for maximum 5 downloads per hour
if (!global.__rateLimiterInstance) {
  global.__rateLimiterInstance = new RateLimiter(5, 60 * 60 * 1000);
}
export const rateLimiter = global.__rateLimiterInstance;
