// 🚀 CORRECTIONS POUR DÉPLOIEMENT RENDER

// 1. ✅ GESTION DES ERREURS AU DÉMARRAGE
const express = require('express');
const cors = require('cors');

// Gestion globale des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = express();

// 2. ✅ CONFIGURATION PORT RENDER
const PORT = process.env.PORT || 3000;

// 3. ✅ VÉRIFICATIONS PRÉALABLES
console.log('🔍 Environment check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${PORT}`);
console.log(`- Firebase Service Account: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'Present' : 'Missing'}`);
console.log(`- Firebase Database URL: ${process.env.FIREBASE_DATABASE_URL ? 'Present' : 'Missing'}`);

// 4. ✅ IMPORTS CONDITIONNELS AVEC GESTION D'ERREUR
let cheerio, axios, NodeCache, admin;

try {
  cheerio = require('cheerio');
  axios = require('axios');
  NodeCache = require('node-cache');
  console.log('✅ Core dependencies loaded');
} catch (error) {
  console.error('❌ Failed to load core dependencies:', error.message);
  process.exit(1);
}

// 5. ✅ FIREBASE AVEC GESTION D'ERREUR
try {
  admin = require('firebase-admin');
  
  // Vérifier que les variables d'environnement Firebase sont présentes
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.FIREBASE_DATABASE_URL) {
    console.warn('⚠️ Firebase credentials missing - Firebase features disabled');
    admin = null;
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('✅ Firebase initialized');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.log('🔄 Continuing without Firebase...');
  admin = null;
}

const db = admin ? admin.firestore() : null;

// 6. ✅ CACHE AVEC FALLBACK
let videoCache, metadataCache;
try {
  videoCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
  metadataCache = new NodeCache({ stdTTL: 7200 });
  console.log('✅ Cache initialized');
} catch (error) {
  console.error('❌ Cache initialization failed:', error.message);
  // Fallback: cache en mémoire simple
  videoCache = {
    cache: new Map(),
    get: function(key) { return this.cache.get(key); },
    set: function(key, value) { this.cache.set(key, value); },
    keys: function() { return Array.from(this.cache.keys()); }
  };
  metadataCache = videoCache;
  console.log('🔄 Using fallback cache');
}

// 7. ✅ MIDDLEWARES BASIQUES
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 8. ✅ TIMEOUT CONFIGURATION
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// 9. ✅ HEALTH CHECK SIMPLE (TOUJOURS DISPONIBLE)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Anime Backend v2.0 is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    version: '2.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      firebase: admin !== null,
      cache: videoCache !== null
    }
  };

  if (videoCache && videoCache.keys) {
    health.cache = {
      videos: videoCache.keys().length,
      metadata: metadataCache.keys().length
    };
  }

  res.json(health);
});

// 10. ✅ CLASSE VIDEOEXTRACTOR AVEC GESTION D'ERREUR
// ===============================
// 🎯 EXTRACTEURS VIDÉO AVANCÉS - VERSION COMPLÈTE
// ===============================

class VideoExtractor {
  static async extract(url, options = {}) {
    if (!url) throw new Error('URL requise');
    
    // Check cache first
    const cacheKey = `video:${url}`;
    const cached = videoCache.get(cacheKey);
    if (cached) return cached;
    
    // Si c'est déjà un lien direct
    if (this.isDirectVideo(url)) {
      const result = { 
        url, 
        type: 'direct',
        quality: this.detectQuality(url),
        headers: {}
      };
      videoCache.set(cacheKey, result);
      return result;
    }
    
    // Extraction selon l'hébergeur
    const hostname = new URL(url).hostname.toLowerCase();
    let result = null;
    
    try {
      if (hostname.includes('vidmoly.net')) {
        result = await this.extractVidmoly(url);
      } else if (hostname.includes('sibnet.ru')) {
        result = await this.extractSibnet(url);
      } else if (hostname.includes('vk.com')) {
        result = await this.extractVK(url);
      } else if (hostname.includes('sendvid.com')) {
        result = await this.extractSendvid(url);
      } else if (hostname.includes('myvi.top')) {
        result = await this.extractMyviTop(url);
      } else if (hostname.includes('myvi.tv') || hostname.includes('myvi.ru')) {
        result = await this.extractMyvi(url);
      } else if (hostname.includes('movearnpre.com')) {
        result = await this.extractMovearnpre(url);
      } else if (hostname.includes('oneupload.to')) {
        result = await this.extractOneUpload(url);
      } else if (hostname.includes('smoothpre.com')) {
        result = await this.extractSmoothpre(url);
      } else if (hostname.includes('streamable.com')) {
        result = await this.extractStreamable(url);
      } else {
        result = await this.extractGeneric(url, options);
      }
      
      if (result) {
        if (options && options.preferMp4 && result.url && /\.m3u8(\?|$)/i.test(result.url)) {
          try {
            const mp4Fallback = await this.tryFindMp4Fallback(url);
            if (mp4Fallback) {
              result = { ...result, url: mp4Fallback, type: 'mp4' };
            }
          } catch (e) {}
        }
        videoCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error(`Extraction failed for ${hostname}:`, error.message);
    }
    
    throw new Error(`Extraction impossible pour ${hostname}`);
  }
  
  static isDirectVideo(url) {
    return /\.(mp4|m3u8|webm|mkv|avi|mov)(\?|$|#)/i.test(url);
  }
  
  static detectQuality(url) {
    if (/1080p|fhd/i.test(url)) return '1080p';
    if (/720p|hd/i.test(url)) return '720p';
    if (/480p|sd/i.test(url)) return '480p';
    if (/360p/i.test(url)) return '360p';
    if (/240p/i.test(url)) return '240p';
    return 'auto';
  }

  // 🎬 VIDMOLY.NET EXTRACTOR
  static async extractVidmoly(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    // Patterns pour Vidmoly
    const patterns = [
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /sources:\s*\[\s*{\s*file:\s*["']([^"']+)/,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/,
      /var\s+video_source\s*=\s*["']([^"']+)/,
      /jwplayer\([^)]*\)\.setup\([^}]*file:\s*["']([^"']+)/,
      /eval\(.*?sources.*?file.*?["']([^"']+\.mp4[^"']*)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        // Nettoyer l'URL
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!videoUrl.startsWith('http') && !videoUrl.startsWith('//')) {
          videoUrl = `https://vidmoly.net${videoUrl}`;
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://vidmoly.net/' }
        };
      }
    }
    
    // Si pas trouvé, chercher dans du code obfusqué
    const obfuscated = data.match(/eval\(function\(p,a,c,k,e,d\).*?\)/);
    if (obfuscated) {
      try {
        // Simple déobfuscation pour certains cas
        const decoded = this.deobfuscateP_A_C_K_E_R(obfuscated[0]);
        const mp4Match = decoded.match(/file["']?\s*:\s*["']([^"']+\.mp4[^"']*)/);
        if (mp4Match) {
          return {
            url: mp4Match[1],
            type: 'mp4',
            quality: this.detectQuality(mp4Match[1]),
            headers: { 'Referer': 'https://vidmoly.net/' }
          };
        }
      } catch (e) {
        console.warn('Deobfuscation failed:', e.message);
      }
    }
    
    throw new Error('Vidmoly: video URL not found');
  }

  // 🎥 SIBNET.RU EXTRACTOR (amélioré)
  static async extractSibnet(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      }
    });
    
    const patterns = [
      /player\.src\(\[{src:\s*"([^"]+)"/,
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /"file"\s*:\s*"([^"]+)"/,
      /src:\s*["']([^"']+)/,
      /video_url\s*[:=]\s*["']([^"']+)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (!videoUrl.startsWith('http')) {
          if (videoUrl.startsWith('//')) {
            videoUrl = `https:${videoUrl}`;
          } else if (videoUrl.startsWith('/')) {
            videoUrl = `https://video.sibnet.ru${videoUrl}`;
          } else {
            videoUrl = `https://video.sibnet.ru/${videoUrl}`;
          }
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://video.sibnet.ru/' }
        };
      }
    }
    
    throw new Error('Sibnet: video URL not found');
  }

  // 📱 VK.COM EXTRACTOR (amélioré)
  static async extractVK(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8'
      }
    });
    
    // VK utilise différents patterns selon la qualité
    const qualities = {
      '1080': [/"url1080":"([^"]+)"/, /"hls":"([^"]+)".*"url1080"/],
      '720': [/"url720":"([^"]+)"/, /"url720p":"([^"]+)"/],
      '480': [/"url480":"([^"]+)"/, /"url480p":"([^"]+)"/],
      '360': [/"url360":"([^"]+)"/, /"url360p":"([^"]+)"/],
      '240': [/"url240":"([^"]+)"/, /"url240p":"([^"]+)"/]
    };
    
    // Prendre la meilleure qualité disponible
    for (const [quality, patterns] of Object.entries(qualities)) {
      for (const pattern of patterns) {
        const match = data.match(pattern);
        if (match && match[1]) {
          let videoUrl = match[1].replace(/\\/g, '');
          
          // Décoder l'URL si nécessaire
          try {
            videoUrl = decodeURIComponent(videoUrl);
          } catch (e) {
            // Ignorer les erreurs de décodage
          }
          
          return {
            url: videoUrl,
            type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
            quality: `${quality}p`,
            headers: { 'Referer': 'https://vk.com/' }
          };
        }
      }
    }
    
    // Fallback: chercher n'importe quel lien vidéo
    const fallbackPatterns = [
      /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/,
      /https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/,
      /"cache[0-9]+":"([^"]+)"/
    ];
    
    for (const pattern of fallbackPatterns) {
      const match = data.match(pattern);
      if (match) {
        const videoUrl = match[1] ? match[1].replace(/\\/g, '') : match[0];
        return {
          url: videoUrl,
          type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
          quality: 'auto',
          headers: { 'Referer': 'https://vk.com/' }
        };
      }
    }
    
    throw new Error('VK: video URL not found');
  }

  // 📤 SENDVID.COM EXTRACTOR (amélioré)
  static async extractSendvid(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const patterns = [
      /var\s+video_source\s*=\s*["']([^"']+)/,
      /source\s+src=["']([^"']+\.mp4[^"']*)/,
      /file:\s*["']([^"']+)/,
      /"file"\s*:\s*"([^"]+)"/,
      /video\s*:\s*{\s*file\s*:\s*["']([^"']+)/,
      /jwplayer.*?file.*?["']([^"']+\.mp4[^"']*)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!videoUrl.startsWith('http') && videoUrl.includes('.mp4')) {
          videoUrl = `https://sendvid.com${videoUrl}`;
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://sendvid.com/' }
        };
      }
    }
    
    throw new Error('Sendvid: video URL not found');
  }

  // 🔝 MYVI.TOP EXTRACTOR
  static async extractMyviTop(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    const patterns = [
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/,
      /dataUrl:\s*["']([^"']+)/,
      /video\.src\s*=\s*["']([^"']+)/,
      /sources:\s*\[.*?file.*?["']([^"']+\.mp4[^"']*)/,
      /jwplayer\([^)]*\)\.setup\([^}]*file:\s*["']([^"']+)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (!videoUrl.startsWith('http')) {
          if (videoUrl.startsWith('//')) {
            videoUrl = `https:${videoUrl}`;
          } else if (videoUrl.startsWith('/')) {
            videoUrl = `https://myvi.top${videoUrl}`;
          }
        }
        
        // Si c'est une URL d'API, la résoudre
        if (videoUrl.includes('/api/') || videoUrl.includes('/player/')) {
          try {
            const { data: apiData } = await axios.get(videoUrl, {
              headers: { 'Referer': url }
            });
            
            const videoMatch = apiData.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
            if (videoMatch) videoUrl = videoMatch[0];
          } catch (e) {
            console.warn('API resolution failed for myvi.top');
          }
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://myvi.top/' }
        };
      }
    }
    
    throw new Error('Myvi.top: video URL not found');
  }

  // 📺 MYVI.TV EXTRACTOR (amélioré)
  static async extractMyvi(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const patterns = [
      /dataUrl:\s*["']([^"']+)/,
      /video\.src\s*=\s*["']([^"']+)/,
      /PlayerLoader\.CreatePlayer\(.*?["']([^"']+\.mp4[^"']*)/,
      /file:\s*["']([^"']+)/,
      /"videoUrl"\s*:\s*"([^"]+)"/,
      /jwplayer.*?file.*?["']([^"']+\.mp4[^"']*)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (!videoUrl.startsWith('http')) {
          if (videoUrl.startsWith('//')) {
            videoUrl = `https:${videoUrl}`;
          } else if (videoUrl.startsWith('/')) {
            videoUrl = `https://www.myvi.tv${videoUrl}`;
          }
        }
        
        // Si c'est une URL de données, il faut la résoudre
        if (videoUrl.includes('/player/api/') || videoUrl.includes('/data/')) {
          try {
            const { data: apiData } = await axios.get(videoUrl, {
              headers: { 'Referer': url }
            });
            
            if (typeof apiData === 'object' && apiData.url) {
              videoUrl = apiData.url;
            } else {
              const videoMatch = String(apiData).match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
              if (videoMatch) videoUrl = videoMatch[0];
            }
          } catch (e) {
            console.warn('API resolution failed for myvi.tv');
          }
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://www.myvi.tv/' }
        };
      }
    }
    
    throw new Error('Myvi.tv: video URL not found');
  }

  // 🎞️ MOVEARNPRE.COM EXTRACTOR
  static async extractMovearnpre(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const patterns = [
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/,
      /sources:\s*\[.*?src.*?["']([^"']+\.mp4[^"']*)/,
      /var\s+video_url\s*=\s*["']([^"']+)/,
      /jwplayer\([^)]*\)\.setup\([^}]*file:\s*["']([^"']+)/,
      /videojs\([^)]*\)\.src\([^)]*["']([^"']+\.mp4[^"']*)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!videoUrl.startsWith('http') && videoUrl.includes('.mp4')) {
          videoUrl = `https://movearnpre.com${videoUrl}`;
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://movearnpre.com/' }
        };
      }
    }
    
    throw new Error('Movearnpre: video URL not found');
  }

  // ☝️ ONEUPLOAD.TO EXTRACTOR
  static async extractOneUpload(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const patterns = [
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/,
      /jwplayer\([^)]*\)\.setup\([^}]*file:\s*["']([^"']+)/,
      /sources:\s*\[\s*{\s*file:\s*["']([^"']+)/,
      /var\s+(?:videoUrl|video_url|file)\s*=\s*["']([^"']+)/,
      /\.mp4["']\s*:\s*["']([^"']+\.mp4[^"']*)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!videoUrl.startsWith('http') && videoUrl.includes('.mp4')) {
          videoUrl = `https://oneupload.to${videoUrl}`;
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://oneupload.to/' }
        };
      }
    }
    
    throw new Error('OneUpload: video URL not found');
  }

  // 🌊 SMOOTHPRE.COM EXTRACTOR
  static async extractSmoothpre(url) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const patterns = [
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/,
      /sources:\s*\[.*?file.*?["']([^"']+\.mp4[^"']*)/,
      /jwplayer\([^)]*\)\.setup\([^}]*file:\s*["']([^"']+)/,
      /var\s+(?:video_url|videoUrl|file)\s*=\s*["']([^"']+)/,
      /videojs\([^)]*\)\.src\([^)]*["']([^"']+\.mp4[^"']*)/
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        let videoUrl = match[1];
        
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!videoUrl.startsWith('http') && videoUrl.includes('.mp4')) {
          videoUrl = `https://smoothpre.com${videoUrl}`;
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': 'https://smoothpre.com/' }
        };
      }
    }
    
    throw new Error('Smoothpre: video URL not found');
  }

  // 🎬 STREAMABLE.COM EXTRACTOR (déjà présent, mais amélioré)
  static async extractStreamable(url) {
    const videoId = url.match(/streamable\.com\/([a-z0-9]+)/i)?.[1];
    if (!videoId) throw new Error('Invalid Streamable URL');
    
    try {
      const { data } = await axios.get(`https://api.streamable.com/videos/${videoId}`);
      
      if (data?.files?.mp4) {
        const file = data.files.mp4;
        let videoUrl = file.url;
        
        if (!videoUrl.startsWith('http')) {
          videoUrl = `https:${videoUrl}`;
        }
        
        return {
          url: videoUrl,
          type: 'mp4',
          quality: `${file.height}p`,
          headers: {}
        };
      }
    } catch (apiError) {
      console.warn('Streamable API failed, trying scraping...');
      
      // Fallback: scraping
      const { data } = await axios.get(url);
      const patterns = [
        /"url":"([^"]+\.mp4[^"]*)"/,
        /video\s+src=["']([^"']+\.mp4[^"']*)/,
        /file:\s*["']([^"']+\.mp4[^"']*)/
      ];
      
      for (const pattern of patterns) {
        const match = data.match(pattern);
        if (match && match[1]) {
          return {
            url: match[1].replace(/\\/g, ''),
            type: 'mp4',
            quality: 'auto',
            headers: {}
          };
        }
      }
    }
    
    throw new Error('Streamable: video not found');
  }

  // 🔧 EXTRACTEUR GÉNÉRIQUE AMÉLIORÉ
  static async extractGeneric(url, options = {}) {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(data);
    
    // Chercher les balises video/source
    const videoElements = [
      $('video source').attr('src'),
      $('video').attr('src'),
      $('source[type*="video"]').attr('src'),
      $('iframe[src*="embed"]').attr('src')
    ].filter(Boolean);
    
    if (videoElements.length > 0) {
      const videoSrc = videoElements[0];
      let finalUrl = videoSrc;
      
      if (finalUrl.startsWith('//')) finalUrl = `https:${finalUrl}`;
      if (!finalUrl.startsWith('http')) finalUrl = new URL(finalUrl, url).href;
      
      return {
        url: finalUrl,
        type: this.isDirectVideo(finalUrl) ? 'direct' : 'embed',
        quality: this.detectQuality(finalUrl),
        headers: { 'Referer': url }
      };
    }
    
    // Chercher prioritairement des MP4 si preferMp4
    const mp4Patterns = [
      /file:\s*["']([^"']+\.mp4[^"']*)/,
      /source:\s*["']([^"']+\.mp4[^"']*)/,
      /src:\s*["']([^"']+\.mp4[^"']*)/,
      /url:\s*["']([^"']+\.mp4[^"']*)/,
      /"file"\s*:\s*"([^"]+\.mp4[^"]*)"/,
      /jwplayer.*?file.*?["']([^"']+\.mp4[^"']*)/,
      /videojs.*?src.*?["']([^"']+\.mp4[^"']*)/,
      /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g
    ];
    if (options && options.preferMp4) {
      for (const pattern of mp4Patterns) {
        const matches = data.match(pattern);
        if (matches) {
          let videoUrl = matches[1] || matches[0];
          
          if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
          if (!videoUrl.startsWith('http')) {
            try {
              videoUrl = new URL(videoUrl, url).href;
            } catch (e) {
              continue;
            }
          }
          
          return {
            url: videoUrl,
            type: 'mp4',
            quality: this.detectQuality(videoUrl),
            headers: { 'Referer': url }
          };
        }
      }
    }

    // Patterns génériques dans le JavaScript
    const patterns = [
      /file:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/,
      /source:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/,
      /src:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/,
      /url:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/,
      /"file"\s*:\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/,
      /jwplayer.*?file.*?["']([^"']+\.(?:mp4|m3u8)[^"']*)/,
      /videojs.*?src.*?["']([^"']+\.(?:mp4|m3u8)[^"']*)/,
      /https?:\/\/[^"'\s]+\.(?:mp4|m3u8)[^"'\s]*/g
    ];
    
    for (const pattern of patterns) {
      const matches = data.match(pattern);
      if (matches) {
        let videoUrl = matches[1] || matches[0];
        
        if (videoUrl.startsWith('//')) videoUrl = `https:${videoUrl}`;
        if (!videoUrl.startsWith('http')) {
          try {
            videoUrl = new URL(videoUrl, url).href;
          } catch (e) {
            continue;
          }
        }
        
        return {
          url: videoUrl,
          type: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
          quality: this.detectQuality(videoUrl),
          headers: { 'Referer': url }
        };
      }
    }
    
    throw new Error('Generic: no video found');
  }

  // 🔓 Fonction de déobfuscation pour certains sites
  static deobfuscateP_A_C_K_E_R(packedCode) {
    try {
      // Simple déobfuscation pour le format P.A.C.K.E.R
      const match = packedCode.match(/eval\(function\(p,a,c,k,e,d\).*?return p}\('([^']+)',([0-9]+),([0-9]+),'([^']+)'\.split\('\|'\)/);
      
      if (!match) return packedCode;
      
      const [, payload, radix, count, keywords] = match;
      const dict = keywords.split('|');
      
      return payload.replace(/\b\w+\b/g, (word) => {
        const index = parseInt(word, parseInt(radix));
        return (index < dict.length && dict[index]) ? dict[index] : word;
      });
    } catch (error) {
      console.warn('Deobfuscation failed:', error.message);
      return packedCode;
    }
  }
  
  // Essaie de récupérer un mp4 dans la page quand on a seulement du HLS
  static async tryFindMp4Fallback(url) {
    try {
      const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const mp4 = data.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
      return mp4 ? mp4[0] : null;
    } catch (e) {
      return null;
    }
  }
}

// 11. ✅ ENDPOINTS AVEC GESTION D'ERREUR
app.get('/api/extract', async (req, res) => {
  try {
    const { url, prefer, format } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL manquante' });
    }
    
    const preferMp4 = String(prefer || format || '').toLowerCase() === 'mp4';
    const result = await VideoExtractor.extract(url, { preferMp4 });
    res.json(result);
  } catch (error) {
    console.error('Extraction error:', error.message);
    res.status(500).json({ 
      error: error.message,
      url: req.query.url 
    });
  }
});

// 12. ✅ GESTIONNAIRE D'ANIME AVEC FALLBACK
class AnimeManager {
  static async getAnimeDetails(animeId) {
    if (!db) {
      // Mode sans Firebase
      return {
        id: animeId,
        title: animeId,
        description: 'Firebase not available',
        episodes: []
      };
    }
    
    try {
      const doc = await db.collection('animes').doc(animeId).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('Firebase error:', error.message);
      return null;
    }
  }
}

// 13. ✅ ENDPOINT ANIME AVEC FALLBACK
app.get('/api/anime/:animeId', async (req, res) => {
  try {
    const { animeId } = req.params;
    const anime = await AnimeManager.getAnimeDetails(animeId);
    
    if (!anime) {
      return res.status(404).json({ error: 'Anime non trouvé' });
    }
    
    res.json(anime);
  } catch (error) {
    console.error('Anime fetch error:', error.message);
    res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
});

// 14. ✅ DÉMARRAGE SÉCURISÉ
const startServer = async () => {
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Anime Backend v2.0 running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🎬 Extraction endpoint: /api/extract`);
    });

    // Timeout pour les requêtes
    server.timeout = 30000;

    // Gestion propre de l'arrêt
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// 15. ✅ LANCEMENT
startServer();

module.exports = app;