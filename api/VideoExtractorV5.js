// VideoExtractorV5.js - Client React Native Ultra-Robuste pour Backend V7.0
// Compatible avec retry logic Python-inspired et cache intelligent

/**
 * VideoExtractorV5 - Extracteur vidéo client ultra-robuste
 * Compatible avec Backend V7.0 Python-inspired
 * 
 * Features:
 * - Retry intelligent avec backoff
 * - Cache local des échecs 
 * - Fallback multiple sources
 * - Statistiques intégrées
 * - Test connectivité backend
 */

export class VideoExtractorV5 {
  static async fetchWithTimeout(resource, options = {}) {
  const { timeout = 30000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(id);
  }
  return response;
}

  // Configuration
  static BACKEND_URL = 'https://video-extractor-wqlx.onrender.com'; // ← REMPLACE PAR TON URL RENDER
  static MAX_RETRIES = 6;
  static RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000, 32000]; // Même que Python
  static CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  
  // Cache local
  static cache = new Map();
  static failedCache = new Map();
  static stats = {
    totalRequests: 0,
    successCount: 0,
    failedCount: 0,
    cacheHits: 0,
    avgResponseTime: 0,
    lastReset: Date.now()
  };

  /**
   * Configure l'URL du backend V7.0
   */
  static configureBackend(url) {
    this.BACKEND_URL = url.replace(/\/$/, ''); // Remove trailing slash
    console.log(`🔧 V5 Backend configuré: ${this.BACKEND_URL}`);
  }

  /**
   * Extraction vidéo principale avec retry Python-inspired
   */
   static async extractVideoUrl(url, options = {}) {
    if (!url) throw new Error('URL requise V5');
    
    const startTime = Date.now();
    this.stats.totalRequests++;
    
    console.log(`🔧 V5 Extraction: ${url.slice(0, 100)}...`);
    
    // URLs directes
    if (this.isDirectVideo(url)) {
      console.log('✅ V5 URL directe détectée');
      this.stats.successCount++;
      return {
        url,
        type: this.getVideoType(url),
        quality: this.detectQuality(url),
        headers: {},
        direct: true,
        version: '5.0',
        cached: false
      };
    }
    
    // Cache principal
    const cacheKey = `v5:${this.generateHash(url)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`💾 V5 Cache hit`);
      this.stats.cacheHits++;
      return { ...cached, cached: true };
    }
    
    // Cache échecs récents
    const failKey = `fail:${this.generateHash(url)}`;
    if (this.getFromFailedCache(failKey)) {
      console.log('❌ V5 URL en échec récent, skip');
      throw new Error('URL recently failed - try later');
    }
    
    // Retry logic Python-inspired
    let lastError = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 V5 Tentative ${attempt + 1}/${this.MAX_RETRIES}...`);
        
        const extractionOptions = {
          prefer: options.preferMp4 ? 'mp4' : undefined,
          timeout: options.timeout || 60000,
          quality: options.quality || 'best',
          ...options
        };
        
        const result = await this.callBackendV7(url, extractionOptions);
        
        if (result && result.url && await this.validateVideoUrl(result.url)) {
          const finalResult = {
            ...result,
            version: '5.0',
            clientAttempt: attempt + 1,
            extractionTime: Date.now() - startTime,
            cached: false
          };
          
          // Cache du succès
          this.setToCache(cacheKey, finalResult);
          
          this.stats.successCount++;
          this.updateAvgResponseTime(Date.now() - startTime);
          
          console.log(`✅ V5 Extraction réussie: ${finalResult.type} ${finalResult.quality} (${finalResult.extractionTime}ms)`);
          return finalResult;
        }
        
        throw new Error(`Validation failed`);
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ V5 Tentative ${attempt + 1} échouée: ${error.message}`);
        
        if (attempt === this.MAX_RETRIES - 1) {
          break;
        }
        
        // Attente avec backoff + randomisation (comme Python)
        const baseDelay = this.RETRY_DELAYS[attempt];
        const randomDelay = baseDelay * (0.8 + Math.random() * 0.4); // ±20%
        
        console.log(`⏳ V5 Attente ${Math.round(randomDelay)}ms...`);
        await this.delay(randomDelay);
      }
    }
    
    // Cache l'échec
    this.setToFailedCache(failKey, true);
    
    this.stats.failedCount++;
    this.updateAvgResponseTime(Date.now() - startTime);
    
    console.error(`💥 V5 Échec final après ${this.MAX_RETRIES} tentatives`);
    throw lastError || new Error(`V5 extraction failed after ${this.MAX_RETRIES} attempts`);
  }

  /**
   * Callback vers Backend V7.0
   */
    static async callBackendV7(url, options = {}) {
    const queryParams = new URLSearchParams({
      url: url,
      ...(options.prefer && { prefer: options.prefer }),
      ...(options.timeout && { timeout: options.timeout.toString() }),
      ...(options.quality && { quality: options.quality })
    });
    
    const backendUrl = `${this.BACKEND_URL}/api/extract?${queryParams}`;
    
    console.log(`📡 V5 -> V7.0 Backend: ${backendUrl.slice(0, 120)}...`);
    
    // CORRECTION: Assign the result of the fetch call to the response variable
    const response = await this.fetchWithTimeout(backendUrl, { 
      method: 'GET', 
      headers: { 'Accept': 'application/json', 'User-Agent': 'VideoExtractorV5/1.0' }, 
      timeout: options.timeout || 60000
    });
    
    const responseData = await response.json();
    
    console.log(`📦 V5 Réponse V7.0:`, {
      success: responseData.success,
      version: responseData.version,
      extractor: responseData.data?.extractor,
      cached: responseData.metadata?.cached,
      attemptUsed: responseData.metadata?.attemptUsed
    });
    
    if (!response.ok || !responseData.success) {
      throw new Error(responseData.error?.message || `HTTP ${response.status}`);
    }
    
    if (!responseData.data || !responseData.data.url) {
      throw new Error('No video URL in backend response');
    }
    
    return {
      url: responseData.data.url,
      type: responseData.data.type || 'mp4',
      quality: responseData.data.quality || 'auto',
      headers: responseData.data.headers || {},
      direct: responseData.data.direct || false,
      extractor: responseData.data.extractor,
      backendVersion: responseData.version,
      backendAttempt: responseData.metadata?.attemptUsed,
      backendTime: responseData.metadata?.extractionTime
    };
  }

  /**
   * Test de connectivité Backend V7.0
   */
  static async testBackendConnectivity() {
    try {
      console.log('🔍 V5 Test connectivité Backend V7.0...');
      
      const response = await fetch(`${this.BACKEND_URL}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      const data = await response.json();
      
      const result = {
        success: response.ok,
        version: data.version,
        uptime: data.uptime,
        supportedHosts: data.cache ? Object.keys(data.cache).length : 0,
        message: data.status === 'healthy' ? 'Backend V7.0 opérationnel' : 'Backend V7.0 issues',
        details: {
          memory: data.memory,
          cache: data.cache,
          performance: data.performance
        }
      };
      
      console.log('✅ V5 Backend V7.0 connectivité:', result.success ? 'OK' : 'ERREUR');
      return result;
      
    } catch (error) {
      console.error('❌ V5 Erreur test connectivité:', error.message);
      return {
        success: false,
        version: 'unknown',
        message: `Erreur connectivité: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Extraction de fallback multiple sources (pour épisodes)
   */
  static async extractBestFromMultipleSources(episode, preferredLangs = ["VOSTFR", "VF", "FR", "VO", "SUB", "DEFAULT"]) {
    if (!episode || !episode.languages) {
      throw new Error('Episode ou langues manquantes');
    }
    
    console.log(`🎯 V5 Extraction multi-sources pour épisode: ${episode.title || episode.id}`);
    
    // Collecte toutes les URLs valides
    const allUrls = [];
    for (const lang of preferredLangs) {
      const urls = episode.languages[lang];
      if (Array.isArray(urls)) {
        urls.forEach((url, index) => {
          if (url && this.isValidVideoUrl(url)) {
            allUrls.push({
              url,
              language: lang,
              priority: preferredLangs.indexOf(lang),
              index
            });
          }
        });
      }
    }
    
    if (allUrls.length === 0) {
      throw new Error('Aucune URL valide trouvée dans l\'épisode');
    }
    
    // Tri par priorité de langue
    allUrls.sort((a, b) => a.priority - b.priority);
    
    console.log(`🔍 V5 URLs trouvées: ${allUrls.length} (${allUrls.map(u => u.language).join(', ')})`);
    
    // Teste chaque URL jusqu'à succès
    let lastError = null;
    
    for (const { url, language, index } of allUrls) {
      try {
        console.log(`🔄 V5 Test ${language}[${index}]: ${url.slice(0, 80)}...`);
        
        const result = await this.extractVideoUrl(url, {
          preferMp4: true,
          timeout: 45000
        });
        
        console.log(`✅ V5 Succès avec ${language}: ${result.type} ${result.quality}`);
        return {
          ...result,
          selectedLanguage: language,
          selectedIndex: index,
          originalUrl: url,
          testedUrls: allUrls.length
        };
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ V5 Échec ${language}[${index}]: ${error.message}`);
        continue;
      }
    }
    
    console.error(`💥 V5 Échec toutes sources (${allUrls.length})`);
    throw lastError || new Error(`Aucune des ${allUrls.length} sources n'a fonctionné`);
  }

  // ===============================
  // 🛠️ MÉTHODES UTILITAIRES
  // ===============================

  static generateHash(url) {
    // Simple hash function pour cache
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static isDirectVideo(url) {
    if (!url || typeof url !== 'string') return false;
    return /\.(mp4|m3u8|webm)(\?|$|#)/i.test(url);
  }

  static isValidVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;
    if (url.length > 2000) return false;
    
    // Anti-pub patterns
    const adPatterns = [
      /doubleclick\.net/i, /googlesyndication\.com/i, /ads\./i,
      /tracker\./i, /analytics\./i, /pixel\./i, /beacon\./i,
      /^intent:\/\//i, /ak\.amskiploomr\.com/i
    ];
    
    return !adPatterns.some(pattern => pattern.test(url));
  }

  static getVideoType(url) {
    if (/\.m3u8(\?|$|#)/i.test(url)) return 'hls';
    if (/\.mp4(\?|$|#)/i.test(url)) return 'mp4';
    if (/\.webm(\?|$|#)/i.test(url)) return 'webm';
    return 'video';
  }

  static detectQuality(url) {
    const qualityPatterns = [
      { pattern: /4k|2160p?|uhd/i, quality: '2160p' },
      { pattern: /1440p?|2k/i, quality: '1440p' },
      { pattern: /1080p?|fhd|fullhd/i, quality: '1080p' },
      { pattern: /720p?|hd/i, quality: '720p' },
      { pattern: /480p?|sd/i, quality: '480p' },
      { pattern: /360p?/i, quality: '360p' },
      { pattern: /240p?/i, quality: '240p' }
    ];

    for (const { pattern, quality } of qualityPatterns) {
      if (pattern.test(url)) return quality;
    }
    return 'auto';
  }

  static async validateVideoUrl(url, timeout = 5000) {
    try {
      // Simple validation - check if URL responds
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeout)
      });
      
      return response.ok;
    } catch (error) {
      // Si validation échoue, on assume que c'est valide
      // (certains serveurs bloquent HEAD requests)
      return true;
    }
  }

  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===============================
  // 🗄️ GESTION CACHE
  // ===============================

  static getFromCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  static setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup si cache trop plein
    if (this.cache.size > 200) {
      const oldestKeys = Array.from(this.cache.keys()).slice(0, 50);
      oldestKeys.forEach(k => this.cache.delete(k));
    }
  }

  static getFromFailedCache(key) {
    const item = this.failedCache.get(key);
    if (!item) return false;
    
    // Cache échecs pendant 5 minutes seulement
    if (Date.now() - item.timestamp > this.CACHE_EXPIRY) {
      this.failedCache.delete(key);
      return false;
    }
    
    return true;
  }

  static setToFailedCache(key, value) {
    this.failedCache.set(key, {
      value,
      timestamp: Date.now()
    });
    
    // Cleanup si cache échecs trop plein
    if (this.failedCache.size > 100) {
      const oldestKeys = Array.from(this.failedCache.keys()).slice(0, 20);
      oldestKeys.forEach(k => this.failedCache.delete(k));
    }
  }

  // ===============================
  // 📊 STATISTIQUES
  // ===============================

  static getStats() {
    const successRate = this.stats.totalRequests > 0 
      ? Math.round((this.stats.successCount / this.stats.totalRequests) * 100)
      : 0;
    
    const cacheHitRate = this.stats.totalRequests > 0
      ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100)
      : 0;
    
    return {
      ...this.stats,
      successRate: `${successRate}%`,
      cacheHitRate: `${cacheHitRate}%`,
      avgResponseTime: `${this.stats.avgResponseTime}ms`,
      cacheSize: this.cache.size,
      failedCacheSize: this.failedCache.size,
      uptime: Date.now() - this.stats.lastReset
    };
  }

  static resetStats() {
    this.stats = {
      totalRequests: 0,
      successCount: 0,
      failedCount: 0,
      cacheHits: 0,
      avgResponseTime: 0,
      lastReset: Date.now()
    };
    
    // Reset caches aussi
    this.cache.clear();
    this.failedCache.clear();
    
    console.log('📊 V5 Statistiques réinitialisées');
  }

  static updateAvgResponseTime(time) {
    const total = this.stats.avgResponseTime * (this.stats.totalRequests - 1) + time;
    this.stats.avgResponseTime = Math.round(total / this.stats.totalRequests);
  }

  // ===============================
  // 🧪 MÉTHODES DEBUG
  // ===============================

  static async debugExtraction(url) {
    console.log('🧪 V5 Debug extraction pour:', url);
    
    const startTime = Date.now();
    
    try {
      // Test connectivité backend
      const backendTest = await this.testBackendConnectivity();
      console.log('🔍 Backend V7.0 status:', backendTest.success ? 'OK' : 'ERREUR');
      
      // Test extraction
      const result = await this.extractVideoUrl(url, { debug: true });
      
      const debugInfo = {
        success: true,
        duration: Date.now() - startTime,
        backend: backendTest,
        result: {
          url: result.url.slice(0, 100) + '...',
          type: result.type,
          quality: result.quality,
          extractor: result.extractor,
          cached: result.cached
        },
        stats: this.getStats()
      };
      
      console.log('✅ V5 Debug extraction réussie:', debugInfo);
      return debugInfo;
      
    } catch (error) {
      const debugInfo = {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        stats: this.getStats()
      };
      
      console.error('❌ V5 Debug extraction échouée:', debugInfo);
      return debugInfo;
    }
  }
}

// Export default pour compatibilité
export default VideoExtractorV5;