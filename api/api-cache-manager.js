class CacheManager {
  constructor() {
    this.cache = new Map();
    this.sessionStorage = typeof window !== 'undefined' ? window.sessionStorage : null;
    this.localStorage = typeof window !== 'undefined' ? window.localStorage : null;
    this.defaultExpiry = 5 * 60 * 1000; // 5 minutes
  }

  set(key, value, expiry = this.defaultExpiry) {
    const item = {
      data: value,
      timestamp: Date.now(),
      expiry: expiry
    };
    
    this.cache.set(key, item);
    
    // Sauvegarder dans localStorage pour persistance
    if (this.localStorage) {
      try {
        this.localStorage.setItem(`anime_cache_${key}`, JSON.stringify(item));
      } catch (e) {
        console.warn('LocalStorage full, using memory cache only');
      }
    }
  }

  get(key) {
    // Vérifier d'abord le cache mémoire
    if (this.cache.has(key)) {
      const item = this.cache.get(key);
      if (Date.now() - item.timestamp < item.expiry) {
        return item.data;
      }
      this.cache.delete(key);
    }
    
    // Vérifier localStorage
    if (this.localStorage) {
      try {
        const stored = this.localStorage.getItem(`anime_cache_${key}`);
        if (stored) {
          const item = JSON.parse(stored);
          if (Date.now() - item.timestamp < item.expiry) {
            this.cache.set(key, item);
            return item.data;
          } else {
            this.localStorage.removeItem(`anime_cache_${key}`);
          }
        }
      } catch (e) {
        console.warn('Error reading from localStorage');
      }
    }
    
    return null;
  }

  clear() {
    this.cache.clear();
    if (this.localStorage) {
      const keys = Object.keys(this.localStorage);
      keys.forEach(key => {
        if (key.startsWith('anime_cache_')) {
          this.localStorage.removeItem(key);
        }
      });
    }
  }

  clearExpired() {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.expiry) {
        this.cache.delete(key);
      }
    }
    
    if (this.localStorage) {
      const keys = Object.keys(this.localStorage);
      keys.forEach(key => {
        if (key.startsWith('anime_cache_')) {
          try {
            const item = JSON.parse(this.localStorage.getItem(key));
            if (now - item.timestamp > item.expiry) {
              this.localStorage.removeItem(key);
            }
          } catch (e) {
            this.localStorage.removeItem(key);
          }
        }
      });
    }
  }

  getStats() {
    return {
      memoryCacheSize: this.cache.size,
      localStorageKeys: this.localStorage ? Object.keys(this.localStorage).filter(k => k.startsWith('anime_cache_')).length : 0
    };
  }
}

export default CacheManager;
