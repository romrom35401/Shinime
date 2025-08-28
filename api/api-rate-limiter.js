class RateLimiter {
  constructor(requestsPerMinute = 90) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.retryDelay = 1000;
    this.maxRetries = 3;
  }

  async makeRequest(url, options = {}) {
    const cacheKey = `${url}${JSON.stringify(options)}`;
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    // Attendre si nécessaire pour respecter le rate limit
    await this.waitForRateLimit();
    
    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || Math.pow(2, retries);
          console.log(`Rate limited, waiting ${retryAfter}s...`);
          await this.delay(retryAfter * 1000);
          retries++;
          continue;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mettre en cache
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return data;
        
      } catch (error) {
        if (retries === this.maxRetries - 1) {
          throw error;
        }
        await this.delay(Math.pow(2, retries) * 1000);
        retries++;
      }
    }
  }

  async waitForRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Nettoyer les requêtes anciennes
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest);
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms...`);
        await this.delay(waitTime);
      }
    }
    
    this.requests.push(now);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache() {
    this.cache.clear();
  }
}

export default RateLimiter;
