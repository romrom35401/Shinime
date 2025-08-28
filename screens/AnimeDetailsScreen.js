// AnimeDetailsScreen V2.0 - Compatible VideoExtractor V5 + Player V2
// Migration vers expo-video + backend V6 + gestion d'erreurs robuste

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchEpisodesByTitle } from '../api/api';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../api/firebaseConfig';
import { testBackendConnectivity } from '../api/test-backend';
import { getNewBackendUrl, getLegacyBackendUrl, getPrimaryBackendUrl, BACKEND_CONFIG } from '../api/config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configuration backend
const BACKEND_URL = getPrimaryBackendUrl(); // Utilise le backend principal (Render)
const NEW_BACKEND_URL = getPrimaryBackendUrl(); // Même URL pour la compatibilité

// Couleurs Crunchyroll
const COLORS = {
  primary: '#FF6B1A',
  secondary: '#F47521',
  background: '#0B0B0B',
  surface: '#141414',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  border: '#2A2A2A',
  success: '#4CAF50',
  error: '#F44336',
  premium: '#FFD700',
  new: '#00BCD4',
};

// ===============================
// 🚀 SERVICE D'EXTRACTION VIDÉO
// ===============================

class VideoExtractor {
  static async extractVideoUrl(url, retryCount = 3) {
    if (!url) throw new Error("URL manquante");
    
    if (this.isDirectVideo(url)) return url;
    
    console.log(`🔧 Tentative d'extraction pour: ${url.slice(0, 100)}...`);
    
    // Essayer différents paramètres d'extraction
    const extractParams = [
      'format=hls', // HLS en priorité
      'prefer=mp4', // MP4 si disponible
      ''            // Sans paramètre spécifique
    ];
    
    for (const params of extractParams) {
      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          console.log(`🔄 Tentative ${attempt}/${retryCount} avec ${params || 'paramètres par défaut'}...`);
          
          const extractUrl = `${BACKEND_URL}/api/extract?url=${encodeURIComponent(url)}${params ? '&' + params : ''}`;
          const response = await fetch(extractUrl, {
            method: 'GET',
            headers: { 
              'Accept': 'application/json',
              'User-Agent': 'Shinime/1.0'
            },
            timeout: 15000
          });
          
          console.log(`📡 Réponse backend: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            // Pour les erreurs 500, essayer avec le paramètre suivant
            if (response.status === 500) {
              console.warn(`⚠️ Erreur 500, essai avec paramètre suivant...`);
              break; // Sortir des tentatives pour ce paramètre
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log("📦 Données reçues:", data);
          
          // Accepter MP4 et HLS (m3u8) pour Expo Go
          console.log("🔍 Test URL:", data.url, "Type:", data.type);
          if (data.url && /\.(mp4|m3u8)(\?|$)/i.test(data.url)) {
            console.log("✅ URL vidéo extraite avec succès:", data.type, data.quality);
            return data.url;
          }
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (data.streams && Array.isArray(data.streams) && data.streams.length > 0) {
            // Format alternatif avec streams
            const bestStream = data.streams.find(s => s.url && /\.(mp4|m3u8)(\?|$)/i.test(s.url));
            if (bestStream) {
              console.log("✅ Stream vidéo trouvé:", bestStream.type);
              return bestStream.url;
            }
          }
          
          throw new Error("Pas de lien vidéo valide dans la réponse");
          
        } catch (error) {
          console.warn(`❌ Tentative ${attempt}/${retryCount} échouée:`, error.message);
          
          if (attempt === retryCount) {
            // Si c'est la dernière tentative pour ce paramètre, continuer avec le suivant
            console.log(`🔄 Passage au paramètre suivant après échec avec: ${params || 'défaut'}`);
            break;
          }
          
          const delayMs = 1000 * attempt;
          console.log(`⏳ Attente ${delayMs}ms avant nouvelle tentative...`);
          await this.delay(delayMs);
        }
      }
    }
    
    throw new Error(`Échec extraction après ${retryCount} tentatives avec tous les paramètres`);
  }
  
  static isDirectVideo(url) {
    if (!url || typeof url !== 'string') return false;
    return /\.(mp4|m3u8|webm)(\?|$)/i.test(url);
  }
  
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===============================
// 🛠️ HELPERS POUR PARSING
// ===============================

function stripDiacritics(s = "") {
  return s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "") ?? s;
}

function normalizeTitleForSeasonKey(title) {
  if (!title) return "";
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/[\[\]\(\):_.,'™!¡?¿]/g, " ")
    .replace(/\b(tv|ona|ova|special|movie|edition|uncut|uncensored)\b/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function buildIdCandidatesFromTitles(titles = []) {
  const ids = new Set();
  titles.filter(Boolean).forEach((t) => {
    const slug = normalizeTitleForSeasonKey(t);
    if (slug) {
      ids.add(slug);
      ids.add(slug.replace(/-/g, ""));
    }
  });
  return Array.from(ids);
}

function normalizeEpisodeLanguages(e = {}) {
  const out = {};
  if (!e || typeof e !== "object") return out;
  
  const push = (k, v) => {
    if (!k || v == null) return;
    const kk = String(k).toUpperCase();
    if (!out[kk]) out[kk] = [];
    if (Array.isArray(v)) v.forEach(x => { if (x) out[kk].push(String(x)); });
    else if (typeof v === "string") out[kk].push(v);
    else if (typeof v === "object") {
      const arr = Object.values(v).filter(Boolean).map(String);
      arr.forEach(x => out[kk].push(x));
    }
  };

  if (e.languages && typeof e.languages === "object") {
    for (const k of Object.keys(e.languages)) push(k, e.languages[k]);
  }

  if (e.LANGUAGES && typeof e.LANGUAGES === "object") {
    for (const k of Object.keys(e.LANGUAGES)) push(k, e.LANGUAGES[k]);
  }

  const TOP_KEYS = ['VOSTFR','VF','FR','VOST','SUB','DEFAULT','VO'];
  for (const k of TOP_KEYS) {
    if (e[k]) push(k, e[k]);
  }

  return out;
}

function pickBestUrlFromEpisode(ep = {}, preferredLangs = ["VOSTFR","VF","FR","VO","SUB","DEFAULT"]) {
  if (!ep) return null;
  if (ep.url) return ep.url;
  if (ep.video) return ep.video;
  if (ep.link) return ep.link;
  
  const normalized = normalizeEpisodeLanguages(ep);

  // Fonction pour valider une URL
  const isValidVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Rejeter les URLs publicitaires et de redirection
    const invalidPatterns = [
      /^intent:\/\//i,
      /ak\.amskiploomr\.com/i,
      /doubleclick\.net/i,
      /googlesyndication\.com/i,
      /adservice\.google\.com/i,
      /ads\./i,
      /tracker\./i,
      /analytics\./i,
      /pixel\./i,
      /beacon\./i
    ];
    return !invalidPatterns.some(pattern => pattern.test(url));
  };

  // Essayer d'abord les URLs qui fonctionnent mieux
  const preferredHosts = ['sibnet.ru', 'sendvid.com', 'vk.com', 'vidmoly.net'];

  for (const lang of preferredLangs) {
    const arr = normalized[lang];
    if (!arr || !arr.length) continue;

    // Chercher d'abord les URLs des hôtes préférés
    for (const url of arr) {
      if (url && isValidVideoUrl(url) && preferredHosts.some(host => url.includes(host))) {
        return url;
      }
    }

    // Sinon prendre la première URL valide
    for (const url of arr) {
      if (url && isValidVideoUrl(url)) {
        return url;
      }
    }
  }

  // Fallback : chercher n'importe quelle URL valide
  for (const k of Object.keys(normalized)) {
    for (const url of normalized[k]) {
      if (url && isValidVideoUrl(url)) {
        return url;
      }
    }
  }

  return null;
}

// ===============================
// 🗄️ FIRESTORE HELPERS
// ===============================

async function tryFetchFromFirestore(titleVariants = []) {
  try {
    // Priorité à animeDetails car c'est là que sont les épisodes
    const collectionNames = ["animeDetails", "animesDetails", "animesDetail", "anime", "animes", "animes_details"];
    const ids = buildIdCandidatesFromTitles(titleVariants);

    for (const colName of collectionNames) {
      try {
        for (const id of ids) {
          try {
            const snap = await getDoc(doc(db, colName, id));
            if (snap.exists()) {
              return { id: snap.id, data: snap.data(), collection: colName };
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {}

      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        const norms = titleVariants.map(normalizeTitleForSeasonKey).filter(Boolean);
        
        for (const d of snap.docs) {
          const dat = d.data();
          const norm = (dat.normalized || d.id || "").toLowerCase();
          if (norms.some((n) => new RegExp("^" + n.replace(/-/g, "[- ]?") + "$", "i").test(norm))) {
            return { id: d.id, data: dat, collection: colName };
          }

          const titlesAll = Array.isArray(dat.titlesAll) ? dat.titlesAll :
            (Array.isArray(dat.title_variants) ? dat.title_variants : []);
          
          for (const cand of titleVariants) {
            if (titlesAll && titlesAll.some((t) =>
              String(t || "").toLowerCase() === String(cand || "").toLowerCase())) {
              return { id: d.id, data: dat, collection: colName };
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

function parseDocDataToSeasons(docData = {}, fallbackTitle = "Episode") {
  const seasons = [];
  const flat = [];

  if (docData?.episodes && typeof docData.episodes === "object" && !Array.isArray(docData.episodes)) {
    for (const [seasonName, arr] of Object.entries(docData.episodes)) {
      if (!Array.isArray(arr)) continue;
      
      const eps = arr.map((e, idx) => {
        const number = e.index ?? e.number ?? idx + 1;
        const title = e.name ?? e.title ?? `Épisode ${number}`;
        const languages = normalizeEpisodeLanguages(e);
        const date = e.release_date ?? e.date ?? null;
        const id = `${seasonName}-${number}`;
        const ep = { id, number, title, languages, date, thumbnail: e.thumbnail };
        flat.push(ep);
        return ep;
      });
      
      seasons.push({ season: seasonName, episodes: eps });
    }
  }

  const seasonalKeys = Object.keys(docData || {}).filter(k =>
    /^saison\s*\d+/i.test(k) || /^season\s*\d+/i.test(k)
  );
  
  for (const sk of seasonalKeys) {
    const arr = docData[sk];
    if (!Array.isArray(arr)) continue;
    if (seasons.find(s => s.season === sk)) continue;
    
    const eps = arr.map((e, idx) => {
      const number = e.index ?? e.number ?? idx + 1;
      const title = e.name ?? e.title ?? `Épisode ${number}`;
      const languages = normalizeEpisodeLanguages(e);
      const date = e.release_date ?? e.date ?? null;
      const id = `${sk}-${number}`;
      const ep = { id, number, title, languages, date, thumbnail: e.thumbnail };
      flat.push(ep);
      return ep;
    });
    
    seasons.push({ season: sk, episodes: eps });
  }

  if (Array.isArray(docData.seasons) && docData.seasons.length > 0) {
    for (const s of docData.seasons) {
      const epsArr = (docData.episodes && docData.episodes[s]) ||
        (docData.bySeason && docData.bySeason[s]) || [];
      if (!Array.isArray(epsArr) || epsArr.length === 0) continue;
      if (seasons.find(x => x.season === s)) continue;
      
      const eps = epsArr.map((e, idx) => {
        const number = e.index ?? e.number ?? idx + 1;
        const title = e.name ?? e.title ?? `Épisode ${number}`;
        const languages = normalizeEpisodeLanguages(e);
        const date = e.release_date ?? e.date ?? null;
        const id = `${s}-${number}`;
        const ep = { id, number, title, languages, date, thumbnail: e.thumbnail };
        flat.push(ep);
        return ep;
      });
      
      seasons.push({ season: s, episodes: eps });
    }
  }

  if (seasons.length === 0) {
    const maybe = docData.episodesList || docData.items || docData.list || docData.episodes;
    if (Array.isArray(maybe) && maybe.length > 0) {
      const eps = maybe.map((e, idx) => {
        const number = e.index ?? e.number ?? idx + 1;
        const title = e.name ?? e.title ?? `Épisode ${number}`;
        const languages = normalizeEpisodeLanguages(e);
        const date = e.release_date ?? e.date ?? null;
        const id = `Saison 1-${number}`;
        const ep = { id, number, title, languages, date, thumbnail: e.thumbnail };
        flat.push(ep);
        return ep;
      });
      
      seasons.push({ season: "Saison 1", episodes: eps });
    }
  }

  if (flat.length === 0 && docData?.url) {
    const ep = {
      id: docData.id || docData.title || fallbackTitle,
      number: 1,
      title: docData.title || fallbackTitle,
      languages: { DEFAULT: [docData.url] },
      thumbnail: docData.thumbnail
    };
    seasons.push({ season: "Saison 1", episodes: [ep] });
    flat.push(ep);
  }

  seasons.sort((a, b) => {
    const aNum = parseInt((a.season.match(/\d+/) || [9999])[0]);
    const bNum = parseInt((b.season.match(/\d+/) || [9999])[0]);
    return aNum - bNum;
  });

  return { seasons, flat };
}

// ===============================
// 🎬 COMPOSANT PRINCIPAL V2.0
// ===============================

export default function AnimeDetailsScreenV2() {
  const navigation = useNavigation();
  const route = useRoute();
  const anime = route?.params?.anime || {};

  // États
  const [animeData, setAnimeData] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('Saison 1');
  const [selectedLanguage, setSelectedLanguage] = useState('VOSTFR');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [selectedTab, setSelectedTab] = useState('episodes');
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvingMsg, setResolvingMsg] = useState("");

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Titre et poster de l'anime
  const title = useMemo(() =>
    anime.title || anime.title_romaji || anime.title_en || "—",
    [anime]
  );

  const poster = useMemo(() =>
    anime.posterImage || anime.bannerImage || anime.image || "",
    [anime]
  );

  // ===============================
  // 📡 CHARGEMENT DES DONNÉES V2.0
  // ===============================

  const loadAnimeData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("📡 V2 Chargement des données pour:", title);

      // 1️⃣ Essai API principale en priorité
      console.log("🔄 V2 Tentative API principale...");
      const providerRes = await fetchEpisodesByTitle(title);

      console.log("📊 V2 Résultat API:", {
        type: typeof providerRes,
        isArray: Array.isArray(providerRes),
        length: Array.isArray(providerRes) ? providerRes.length : 'N/A',
        hasGrouped: providerRes && typeof providerRes === 'object' && 'grouped' in providerRes,
        firstEpisode: Array.isArray(providerRes) && providerRes.length > 0 ? providerRes[0] : null
      });

      if (providerRes) {
        let seasonsArr = [];
        let flat = [];

        if (Array.isArray(providerRes) && providerRes.length > 0) {
          const map = new Map();
          providerRes.forEach((e, idx) => {
            const seasonRaw = e.season ?? e.saison ?? e.season_number ?? e.seasonLabel ?? "Saison 1";
            const seasonLabel = typeof seasonRaw === "number" ? `Saison ${seasonRaw}` : String(seasonRaw || "Saison 1");
            const number = e.number ?? e.index ?? idx + 1;
            const langs = normalizeEpisodeLanguages(e);
            
            const ep = {
              id: e.id ?? `${seasonLabel}-${number}`,
              number,
              title: e.name ?? e.title ?? `Épisode ${number}`,
              languages: langs,
              date: e.date ?? e.release_date ?? null,
              thumbnail: e.thumbnail,
            };

            if (!map.has(seasonLabel)) map.set(seasonLabel, []);
            map.get(seasonLabel).push(ep);
          });

          seasonsArr = Array.from(map.entries()).map(([s, eps]) => ({ season: s, episodes: eps }));
          seasonsArr.sort((a, b) => {
            const na = parseInt((a.season.match(/\d+/) || [9999])[0]);
            const nb = parseInt((b.season.match(/\d+/) || [9999])[0]);
            return na - nb;
          });

          flat = seasonsArr.flatMap((s) => s.episodes);

          // Vérifier si les épisodes ont des URLs
          const hasUrls = flat.some(ep => {
            const langs = ep.languages || {};
            return Object.keys(langs).length > 0 && Object.values(langs).some(arr => Array.isArray(arr) && arr.length > 0);
          });

          console.log("🔍 V2 Vérification URLs dans API:", {
            episodesCount: flat.length,
            hasUrls: hasUrls,
            sampleEpisode: flat[0] ? {
              id: flat[0].id,
              languages: flat[0].languages,
              languagesKeys: Object.keys(flat[0].languages || {})
            } : null
          });

          if (hasUrls) {
            setSeasons(seasonsArr);
            setEpisodes(flat);
            const idxS1 = seasonsArr.findIndex(s => /^saison\s*1/i.test(s.season));
            if (idxS1 >= 0) setSelectedSeason(seasonsArr[idxS1].season);
            setAnimeData({ ...anime, episodes: flat, seasons: seasonsArr });
            setLoading(false);
            return;
          }
        }

        if (typeof providerRes === "object" && providerRes.grouped && Array.isArray(providerRes.grouped)) {
          seasonsArr = providerRes.grouped.map((g) => ({
            season: g.season || g.title || g.name || "Saison",
            episodes: (g.episodes || []).map((e, idx) => ({
              id: e.id ?? `${g.season}-${idx}`,
              number: e.number ?? e.index ?? idx + 1,
              title: e.name ?? e.title ?? `Épisode ${idx + 1}`,
              languages: normalizeEpisodeLanguages(e),
              date: e.date ?? e.release_date ?? null,
              thumbnail: e.thumbnail,
            })),
          }));
          
          flat = seasonsArr.flatMap((g) => g.episodes || []);
          setSeasons(seasonsArr);
          setEpisodes(flat);
          if (seasonsArr.length > 0) setSelectedSeason(seasonsArr[0].season);
          setAnimeData({ ...anime, episodes: flat, seasons: seasonsArr });
          setLoading(false);
          return;
        }
      }

      // 2️⃣ Fallback Firestore
      console.log("🔄 V2 Fallback vers Firestore...");
      const titleVariants = [
        anime.title,
        anime.title_en,
        anime.title_romaji,
        ...(anime.title_variants || []),
      ].filter(Boolean);

      console.log("🔍 V2 Variantes de titre:", titleVariants);

      let docFound = null;
      if (anime.id) {
        console.log("🔍 V2 Tentative avec ID exact:", anime.id);
        try {
          const snap = await getDoc(doc(db, "animeDetails", anime.id));
          if (snap.exists()) {
            docFound = { id: snap.id, data: snap.data(), collection: "animeDetails" };
            console.log("✅ V2 Document trouvé avec ID exact dans animeDetails");
          }
        } catch (e) {
          console.log("❌ V2 Erreur avec ID exact:", e.message);
        }
      }

      if (!docFound) {
        docFound = await tryFetchFromFirestore(titleVariants.length ? titleVariants : [title]);
      }

      console.log("📄 V2 Document Firestore trouvé:", docFound ? {
        id: docFound.id,
        collection: docFound.collection,
        hasData: !!docFound.data,
        dataKeys: docFound.data ? Object.keys(docFound.data) : []
      } : "Aucun document");

      if (docFound && docFound.data) {
        console.log("📊 V2 Données Firestore brutes:", docFound.data);
        const parsed = parseDocDataToSeasons(docFound.data, title);
        
        console.log("🔧 V2 Données parsées:", {
          seasonsCount: parsed.seasons.length,
          episodesCount: parsed.flat.length,
          firstEpisode: parsed.flat[0] ? {
            id: parsed.flat[0].id,
            languages: parsed.flat[0].languages,
            hasUrls: Object.keys(parsed.flat[0].languages || {}).length > 0
          } : null
        });

        if (parsed.seasons.length) {
          parsed.flat.forEach(ep => {
            if (!ep.languages) ep.languages = {};
          });

          setSeasons(parsed.seasons);
          setEpisodes(parsed.flat);
          if (parsed.seasons.length > 0) setSelectedSeason(parsed.seasons[0].season);
          setAnimeData({ ...anime, episodes: parsed.flat, seasons: parsed.seasons });
          setLoading(false);
          return;
        }
      }

      // 3️⃣ Aucun résultat
      setSeasons([]);
      setEpisodes([]);
      setAnimeData(anime);

    } catch (error) {
      console.error('V2 Erreur chargement anime:', error);
      Alert.alert(
        'Erreur de chargement',
        'Impossible de charger les informations de l\'anime. Réessayer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réessayer', onPress: loadAnimeData }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [anime, title]);

  // ===============================
  // 🎥 FONCTION DE LECTURE V2.0
  // ===============================

  const onPlayEpisode = useCallback(async (episode) => {
    if (!episode) {
      Alert.alert("Erreur", "Épisode invalide");
      return;
    }

    console.log("🎬 V2 Tentative de lecture épisode:", {
      id: episode.id,
      title: episode.title,
      number: episode.number,
      languages: episode.languages,
      url: episode.url
    });

    try {
      setResolving(true);
      setResolvingMsg("🔍 V2 Préparation du stream...");

      // Vérifier si l'épisode a des URLs directes
      console.log("🎯 V2 Épisode à lire:", {
        id: episode.id,
        languages: episode.languages,
        hasUrls: Object.keys(episode.languages || {}).length > 0
      });

      // Essayer d'abord avec les URLs directes de l'épisode
      let candidateUrl = pickBestUrlFromEpisode(episode, [selectedLanguage, "VOSTFR", "VF", "FR", "VO", "SUB", "DEFAULT"]);
      
      if (candidateUrl) {
        console.log("✅ V2 URL trouvée directement:", candidateUrl);

        // Si c'est une URL directe, l'utiliser directement
        if (VideoExtractorV5.isDirectVideo(candidateUrl)) {
          setResolving(false);
          setResolvingMsg("");
          
          navigation.navigate("PlayerV2", { // Navigation vers PlayerV2
            episode: {
              ...episode,
              url: candidateUrl,
              originalUrl: candidateUrl,
              anime: anime
            }
          });
          return;
        }

        // Sinon, extraire avec VideoExtractor V5
        console.log("🔧 V2 Extraction nécessaire avec VideoExtractor V5...");
        setResolvingMsg("🔧 V2 Extraction en cours...");

        try {
          const extractionResult = await VideoExtractorV5.extractVideoUrl(candidateUrl, {
            preferMp4: true,
            timeout: 60000,
            format: 'best'
          });

          console.log("🎯 V2 Résultat extraction V5:", {
            success: !!extractionResult.url,
            type: extractionResult.type,
            quality: extractionResult.quality,
            version: extractionResult.version,
            extractor: extractionResult.extractor
          });

          if (extractionResult && extractionResult.url) {
            setResolving(false);
            setResolvingMsg("");

            navigation.navigate("PlayerV2", { // Navigation vers PlayerV2
              episode: {
                ...episode,
                url: extractionResult.url,
                originalUrl: candidateUrl,
                anime: anime,
                streamHeaders: extractionResult.headers || {},
                streamQuality: extractionResult.quality,
                extractorVersion: extractionResult.version,
                extractorUsed: extractionResult.extractor
              }
            });
            return;
          } else {
            throw new Error('VideoExtractor V5 returned no URL');
          }

        } catch (extractError) {
          console.error("❌ V2 Erreur extraction V5:", extractError);
          setResolvingMsg("⚠️ V2 Fallback vers autres sources...");

          // Fallback: essayer les autres URLs disponibles
          const allUrls = [];
          const normalized = normalizeEpisodeLanguages(episode);
          
          for (const lang of Object.keys(normalized)) {
            allUrls.push(...normalized[lang]);
          }

          // Filtrer les URLs valides
          const validUrls = allUrls.filter(url => {
            if (!url || typeof url !== 'string') return false;
            const invalidPatterns = [
              /^intent:\/\//i,
              /ak\.amskiploomr\.com/i,
              /doubleclick\.net/i,
              /ads\./i,
              /tracker\./i
            ];
            return !invalidPatterns.some(pattern => pattern.test(url));
          });

          console.log("🔍 V2 URLs alternatives trouvées:", validUrls.length);

          // Essayer les URLs alternatives une par une
          for (let i = 0; i < validUrls.length; i++) {
            const altUrl = validUrls[i];
            try {
              console.log(`🔄 V2 Tentative URL alternative ${i + 1}/${validUrls.length}: ${altUrl.slice(0, 50)}...`);
              setResolvingMsg(`🔄 V2 Test source ${i + 1}/${validUrls.length}...`);

              if (VideoExtractorV5.isDirectVideo(altUrl)) {
                // URL directe
                setResolving(false);
                setResolvingMsg("");
                
                navigation.navigate("PlayerV2", {
                  episode: {
                    ...episode,
                    url: altUrl,
                    originalUrl: altUrl,
                    anime: anime
                  }
                });
                return;
              } else {
                // Essayer extraction
                const altResult = await VideoExtractorV5.extractVideoUrl(altUrl, {
                  preferMp4: true,
                  timeout: 30000 // Timeout plus court pour alternatives
                });

                if (altResult && altResult.url) {
                  setResolving(false);
                  setResolvingMsg("");
                  
                  navigation.navigate("PlayerV2", {
                    episode: {
                      ...episode,
                      url: altResult.url,
                      originalUrl: altUrl,
                      anime: anime,
                      streamHeaders: altResult.headers || {}
                    }
                  });
                  return;
                }
              }
            } catch (altError) {
              console.warn(`❌ V2 URL alternative ${i + 1} échouée:`, altError.message);
              continue;
            }
          }

          // Aucune alternative n'a fonctionné
          throw new Error(`Extraction failed for all ${validUrls.length} available sources`);
        }
      }

      // Aucune URL trouvée
      throw new Error("Aucun lien vidéo trouvé pour cet épisode");

    } catch (err) {
      setResolving(false);
      setResolvingMsg("");
      console.error("💥 V2 Erreur critique lecture:", err);

      Alert.alert(
        "💥 Erreur de lecture",
        `Impossible de lire l'épisode:\n\n${err.message}\n\nVeuillez réessayer ou choisir un autre épisode.`,
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Test Backend', 
            onPress: async () => {
              const backendStatus = await VideoExtractorV5.testBackendConnectivity();
              Alert.alert(
                'Status Backend V6',
                `Statut: ${backendStatus.success ? '✅ OK' : '❌ Erreur'}\n` +
                `Message: ${backendStatus.message}\n` +
                `Version: ${backendStatus.version || 'N/A'}`
              );
            }
          }
        ]
      );
    }
  }, [navigation, anime, selectedLanguage]);

  // ===============================
  // 🔄 EFFETS
  // ===============================

  useEffect(() => {
    loadAnimeData();
  }, [loadAnimeData]);

  // Épisodes filtrés par saison
  const filteredEpisodes = useMemo(() => {
    const season = seasons.find(s => s.season === selectedSeason);
    return season ? season.episodes : [];
  }, [seasons, selectedSeason]);

  // Langues disponibles
  const availableLanguages = useMemo(() => {
    const languages = new Set();
    episodes.forEach(ep => {
      Object.keys(ep.languages || {}).forEach(lang => {
        languages.add(lang);
      });
    });
    return Array.from(languages);
  }, [episodes]);

  // ===============================
  // 🎨 COMPOSANTS DE RENDU
  // ===============================

  const renderHeader = () => (
    <Animated.View style={[styles.header, { backgroundColor: headerOpacity.interpolate({ inputRange: [0, 1], outputRange: ['transparent', COLORS.background] }) }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderHeroSection = () => (
    <View style={styles.heroContainer}>
      <Image source={{ uri: poster }} style={styles.heroPoster} resizeMode="cover" />
      
      <LinearGradient
        colors={['transparent', 'rgba(11,11,11,0.8)', COLORS.background]}
        style={styles.heroGradient}
      />
      
      <View style={styles.heroContent}>
        <View style={styles.heroInfo}>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          
          <View style={styles.heroMeta}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>16+</Text>
            </View>
            <Text style={styles.metaText}>Animation</Text>
            <Text style={styles.metaText}>HD</Text>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => filteredEpisodes[0] && onPlayEpisode(filteredEpisodes[0])}
              disabled={!filteredEpisodes.length || resolving}
            >
              <Ionicons name="play" size={20} color={COLORS.background} />
              <Text style={styles.playButtonText}>LECTURE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, isInWatchlist && styles.actionButtonActive]}
              onPress={() => setIsInWatchlist(!isInWatchlist)}
            >
              <Ionicons 
                name={isInWatchlist ? "checkmark" : "add"} 
                size={20} 
                color={isInWatchlist ? COLORS.success : COLORS.text} 
              />
              <Text style={[styles.actionButtonText, isInWatchlist && styles.actionButtonTextActive]}>
                {isInWatchlist ? "AJOUTÉ" : "MA LISTE"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDescription = () => {
    const description = anime.description || "";
    const cleanDesc = description
      .replace(/(\n)?/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .trim();

    if (!cleanDesc) return null;

    return (
      <View style={styles.descriptionContainer}>
        <Text
          style={[styles.descriptionText, expandedDescription ? {} : { maxHeight: 60 }]}
          numberOfLines={expandedDescription ? undefined : 3}
        >
          {cleanDesc}
        </Text>
        {cleanDesc.length > 150 && (
          <TouchableOpacity onPress={() => setExpandedDescription(!expandedDescription)}>
            <Text style={styles.expandButton}>
              {expandedDescription ? "RÉDUIRE" : "EN SAVOIR PLUS"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'episodes' && styles.activeTab]}
        onPress={() => setSelectedTab('episodes')}
      >
        <Text style={[styles.tabText, selectedTab === 'episodes' && styles.activeTabText]}>
          ÉPISODES
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'similar' && styles.activeTab]}
        onPress={() => setSelectedTab('similar')}
      >
        <Text style={[styles.tabText, selectedTab === 'similar' && styles.activeTabText]}>
          SIMILAIRES
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'details' && styles.activeTab]}
        onPress={() => setSelectedTab('details')}
      >
        <Text style={[styles.tabText, selectedTab === 'details' && styles.activeTabText]}>
          DÉTAILS
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSeasonSelector = () => {
    if (seasons.length <= 1) return null;

    return (
      <View style={styles.seasonSelector}>
        <Text style={styles.sectionTitle}>Saison</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {seasons.map((season) => (
            <TouchableOpacity
              key={season.season}
              style={[
                styles.seasonChip,
                selectedSeason === season.season && styles.selectedSeasonChip
              ]}
              onPress={() => setSelectedSeason(season.season)}
            >
              <Text style={[
                styles.seasonChipText,
                selectedSeason === season.season && styles.selectedSeasonChipText
              ]}>
                {season.season}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderLanguageSelector = () => {
    if (availableLanguages.length <= 1) return null;

    return (
      <View style={styles.languageSelector}>
        <Text style={styles.sectionTitle}>Langue</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableLanguages.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageChip,
                selectedLanguage === lang && styles.selectedLanguageChip
              ]}
              onPress={() => setSelectedLanguage(lang)}
            >
              <Text style={[
                styles.languageChipText,
                selectedLanguage === lang && styles.selectedLanguageChipText
              ]}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEpisodeItem = ({ item: episode, index }) => (
    <TouchableOpacity
      style={styles.episodeItem}
      onPress={() => onPlayEpisode(episode)}
      activeOpacity={0.7}
      disabled={resolving}
    >
      <View style={styles.episodeThumb}>
        <Image
          source={{ uri: episode.thumbnail || poster }}
          style={styles.episodeImage}
          resizeMode="cover"
        />
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
        </View>
        <View style={styles.episodeDuration}>
          <Text style={styles.durationText}>24m</Text>
        </View>
      </View>

      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {episode.number}. {episode.title}
        </Text>
        <Text style={styles.episodeDescription} numberOfLines={2}>
          {episode.description || `Épisode ${episode.number} de ${title}`}
        </Text>
        <Text style={styles.episodeDate}>
          {episode.date ? new Date(episode.date).toLocaleDateString('fr-FR') : ''}
        </Text>
      </View>

      <View style={styles.episodeActions}>
        <TouchableOpacity>
          <Ionicons name="download-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEpisodesList = () => (
    <View style={styles.episodesContainer}>
      {renderSeasonSelector()}
      {renderLanguageSelector()}

      <View style={styles.episodesHeader}>
        <Text style={styles.sectionTitle}>
          {selectedSeason} ({filteredEpisodes.length} épisodes)
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              console.log("🔍 V2 Debug - Épisodes chargés:", episodes.length);
              console.log("🔍 V2 Debug - Épisodes filtrés:", filteredEpisodes.length);
              console.log("🔍 V2 Debug - Premier épisode:", filteredEpisodes[0]);
              
              // Test du backend V6
              const backendTest = await VideoExtractorV5.testBackendConnectivity();
              console.log("🔍 V2 Test backend:", backendTest);
              
              Alert.alert(
                "Debug Info V2",
                `Épisodes chargés: ${episodes.length}\n` +
                `Épisodes filtrés: ${filteredEpisodes.length}\n\n` +
                `Backend V6: ${backendTest.success ? '✅ OK' : '❌ Erreur'}\n` +
                `Version: ${backendTest.version || 'N/A'}\n` +
                `Message: ${backendTest.message}`
              );
            }}
          >
            <MaterialIcons name="bug-report" size={12} color={COLORS.background} />
            <Text style={styles.debugButtonText}>Debug V2</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredEpisodes.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="video-library" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyStateText}>Aucun épisode trouvé</Text>
          <Text style={styles.emptyStateSubtext}>
            Vérifiez votre connexion ou réessayez plus tard
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEpisodes}
          renderItem={renderEpisodeItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const renderSimilarContent = () => (
    <View style={styles.similarContainer}>
      <Text style={styles.sectionTitle}>Titres similaires</Text>
      <View style={styles.similarGrid}>
        {Array.from({ length: 6 }, (_, i) => (
          <TouchableOpacity key={i} style={styles.similarItem}>
            <View style={styles.similarPoster} />
            <Text style={styles.similarTitle}>Anime similaire {i + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetailsContent = () => (
    <View style={styles.detailsContainer}>
      <Text style={styles.sectionTitle}>Informations</Text>
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Créateur</Text>
          <Text style={styles.detailValue}>{anime.studio || "—"}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Genre</Text>
          <Text style={styles.detailValue}>
            {Array.isArray(anime.genres) ? anime.genres.join(", ") : "Animation"}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Année</Text>
          <Text style={styles.detailValue}>{anime.year || "—"}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Statut</Text>
          <Text style={styles.detailValue}>{anime.status || "—"}</Text>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'episodes':
        return renderEpisodesList();
      case 'similar':
        return renderSimilarContent();
      case 'details':
        return renderDetailsContent();
      default:
        return renderEpisodesList();
    }
  };

  // ===============================
  // 🎨 RENDU PRINCIPAL
  // ===============================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement V2...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {renderHeroSection()}
        {renderDescription()}
        {renderTabs()}
        {renderContent()}
      </Animated.ScrollView>

      {renderHeader()}

      {/* Overlay de chargement V2 */}
      {resolving && (
        <View style={styles.resolvingOverlay}>
          <BlurView intensity={20} style={styles.resolvingBlur}>
            <View style={styles.resolvingContent}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.resolvingText}>
                {resolvingMsg || "Préparation V2..."}
              </Text>
              <Text style={styles.resolvingSubtext}>
                Utilisation VideoExtractor V5 + Backend V6
              </Text>
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

// ===============================
// 🎨 STYLES
// ===============================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  headerTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },

  heroContainer: {
    height: SCREEN_HEIGHT * 0.6,
    position: 'relative',
  },

  heroPoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },

  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },

  heroInfo: {
    alignItems: 'center',
  },

  heroTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },

  ratingBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  ratingText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },

  metaText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  heroActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  playButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  playButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },

  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  actionButtonActive: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },

  actionButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },

  actionButtonTextActive: {
    color: COLORS.success,
  },

  descriptionContainer: {
    padding: 20,
  },

  descriptionText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  expandButton: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: COLORS.primary,
  },

  tabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  activeTabText: {
    color: COLORS.primary,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },

  seasonSelector: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  seasonChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },

  selectedSeasonChip: {
    backgroundColor: COLORS.primary,
  },

  seasonChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  selectedSeasonChipText: {
    color: COLORS.background,
  },

  languageSelector: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },

  languageChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },

  selectedLanguageChip: {
    backgroundColor: COLORS.primary,
  },

  languageChipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  selectedLanguageChipText: {
    color: COLORS.background,
  },

  episodesContainer: {
    paddingBottom: 100,
  },

  episodesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  debugButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  debugButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '600',
  },

  episodeItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },

  episodeThumb: {
    width: 140,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.surface,
  },

  episodeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  episodeDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  durationText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
  },

  episodeInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },

  episodeTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  episodeDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },

  episodeDate: {
    color: COLORS.textMuted,
    fontSize: 10,
  },

  episodeActions: {
    paddingLeft: 16,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },

  emptyStateSubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  similarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },

  similarItem: {
    width: (SCREEN_WIDTH - 56) / 2,
    marginBottom: 16,
  },

  similarPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },

  similarTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },

  detailsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  detailsGrid: {
    gap: 16,
  },

  detailItem: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 8,
  },

  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 16,
  },

  resolvingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },

  resolvingBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  resolvingContent: {
    backgroundColor: COLORS.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 40,
    maxWidth: 300,
  },

  resolvingText: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },

  resolvingSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});