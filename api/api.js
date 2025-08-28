// api.js
const ANILIST_API = 'https://graphql.anilist.co';

// ===== Firebase (v9 modulaire) =====
import {
  collection,
  getDocs,
  query,
  where,
  limit as qLimit,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig"; // <- adapte le chemin si besoin

// ====== Réglages ======
const bannedGenres = ["Hentai", "Doujin", "Experimental", "Special", "Erotica"];
const bannedWords = [
  "hentai", "doujin", "nsfw",
  "haha", "no te", "musume", "kami", "omake", "one-shot", "oneshot",
  "music video", "pv", "promo", "commercial"
];
const allowedFormats = new Set(["TV", "TV_SHORT", "ONA"]);
const remakeTags = [
  "brotherhood", "shippuuden", "kai", "crystal", "z", "super",
  "after story", "next generations", "2011", "1999", "2020", "remake"
];

// ====== Descriptions ======
const FR_DESC_PLACEHOLDER = "Synopsis en français indisponible.";

// ========== HELPERS ==========
function stripDiacritics(s = "") {
  return s.normalize?.("NFD").replace(/[\u0300-\u036f]/g, "") ?? s;
}

// slug KEBAB pour clés/saisons: "Dan Da Dan" -> "dan-da-dan"
function normalizeTitleForSeasonKey(title) {
  if (!title) return "";
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/[\[\]\(\):_.,'’!¡?¿]/g, " ")
    .replace(/\b(tv|ona|ova|special|movie|edition|uncut|uncensored)\b/gi, "")
    .replace(/\b(the\s*)?final\s*season\b/gi, "")
    .replace(/\b(s(eason|aison)|part|cour|cours)\s*\d+\b/gi, "")
    .replace(/\b(\d+)(st|nd|rd|th)\s*(season|saison|part|cour)\b/gi, "")
    .replace(/\b(2nd|3rd|4th)\b/gi, "")
    .replace(/\b(i{1,3}|iv|v|vi{0,3}|x)\b(?=\s*$)/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

// variante compacte: "dan-da-dan" -> "dandadan"
function collapseNormalizedKey(k) {
  return (k || "").replace(/-/g, "");
}

// Pour l'affichage HomeScreen: PAS de tirets
function normalizeDisplayTitle(title) {
  const slug = normalizeTitleForSeasonKey(title);
  const spaced = slug.replace(/-/g, " ");
  return spaced
    .split(" ")
    .filter(Boolean)
    .map(w => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function getBestImageUrl(coverImage, bannerImage) {
  return {
    poster: coverImage?.extraLarge || coverImage?.large || coverImage?.medium
      || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
    banner: bannerImage || coverImage?.extraLarge
      || 'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner',
    color: coverImage?.color || null
  };
}

function pickTitle(anime) {
  return anime?.title?.english || anime?.title?.romaji || anime?.title?.native || "Sans titre";
}

function detectRemakeTagFromTitles(anime) {
  const pool = [pickTitle(anime), ...(anime?.synonyms || [])].join(" ").toLowerCase();
  return remakeTags.find(tag => pool.includes(tag)) || "";
}

function isAcceptableAnime(anime) {
  if (!allowedFormats.has(anime?.format)) return false;
  if (anime?.isAdult) return false;
  if (anime?.genres?.some(g => bannedGenres.includes(g))) return false;

  const titlesPool = [
    anime?.title?.english,
    anime?.title?.romaji,
    anime?.title?.native,
    ...(anime?.synonyms || []),
  ].filter(Boolean).join(" ").toLowerCase();

  if (bannedWords.some(w => titlesPool.includes(w))) return false;
  if (typeof anime?.averageScore === "number" && anime.averageScore < 50) return false;

  return true;
}

// Choisir saison 1 TV comme rep (AniList regroupé)
function pickBaseRepresentative(sorted) {
  return (
    sorted.find(s => s.format === 'TV') ||
    sorted[0]
  );
}

function groupAnimeByFranchise(animeList) {
  const groups = new Map();

  animeList.forEach(anime => {
    if (!isAcceptableAnime(anime)) return;

    const base = normalizeTitleForSeasonKey(pickTitle(anime));
    if (!base) return;

    const remakeTag = detectRemakeTagFromTitles(anime);
    const key = remakeTag ? `${base}__${remakeTag}` : base;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(anime);
  });

  return Array.from(groups.values()).map(items => {
    const sorted = items.slice().sort((a, b) => {
      const ay = a.seasonYear ?? 0, by = b.seasonYear ?? 0;
      if (ay !== by) return ay - by;
      const order = { WINTER: 0, SPRING: 1, SUMMER: 2, FALL: 3 };
      return (order[a.season] ?? 0) - (order[b.season] ?? 0);
    });

    const rep = pickBaseRepresentative(sorted);
    const images = getBestImageUrl(rep.coverImage, rep.bannerImage);

    return {
      id: `AL-${rep.id}`,
      sourceId: rep.id,
      source: 'anilist',
      title: normalizeDisplayTitle(pickTitle(rep)), // => sans tirets
      title_en: rep?.title?.english,
      title_romaji: rep?.title?.romaji,
      description: rep?.description, // remplacée ensuite par la VF Firebase
      posterImage: images.poster,
      bannerImage: images.banner,
      coverImage: images.poster,
      coverColor: images.color,
      format: rep?.format,
      genres: rep?.genres || [],
      averageScore: rep?.averageScore,
      popularity: rep?.popularity,
      seasons: sorted.map(s => {
        const si = getBestImageUrl(s.coverImage, s.bannerImage);
        return {
          id: `AL-S-${s.id}`,
          sourceId: s.id,
          title: pickTitle(s),
          season: s.season,
          seasonYear: s.seasonYear,
          episodes: s.episodes,
          status: s.status,
          coverImage: si.poster,
        };
      }),
    };
  });
}

// ========== Descriptions FR via Firebase ==========
const firebaseDescCache = new Map();

function pickDocDescription(docData) {
  return (
    docData?.description ||
    docData?.synopsis ||
    docData?.synopsys ||
    docData?.resume || null
  );
}

// Construit des candidats d'ID à partir d'une liste de titres
function buildIdCandidatesFromTitles(titles = []) {
  const ids = new Set();
  titles.filter(Boolean).forEach(t => {
    const slug = normalizeTitleForSeasonKey(t);
    if (slug) {
      ids.add(slug);              // "dan-da-dan"
      ids.add(collapseNormalizedKey(slug)); // "dandadan"
    }
  });
  return Array.from(ids);
}

async function tryGetDocByIds(idCandidates = [], collectionName = "animes") {
  for (const id of idCandidates) {
    try {
      const snap = await getDoc(doc(db, collectionName, id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (_) {}
  }
  return null;
}

async function getFirstDoc(qRef) {
  const snap = await getDocs(qRef);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }
  return null;
}

/**
 * fetchFirebaseDocByTitles:
 * - Tente AVANT TOUT la recherche par titres/normalized/titlesAll/regex
 * - Si rien trouvé, en dernier recours tente la lecture par ID document (tryGetDocByIds)
 * - collectionName: "animes" par défaut (peut être utilisé pour "animesdetails" si nécessaire)
 */
async function fetchFirebaseDocByTitles(titleVariants = [], collectionName = "animes") {
  const variants = Array.from(new Set(titleVariants.filter(Boolean)));
  if (!variants.length) return null;

  const colRef = collection(db, collectionName);
  // 1) ESSAI EXACT "normalized" et "titlesAll" (title-first)
  const normed = variants.map(normalizeTitleForSeasonKey).filter(Boolean);

  try {
    // a) where normalized in [...]
    for (let i = 0; i < normed.length; i += 10) {
      const part = normed.slice(i, i + 10);
      try {
        const q1 = query(colRef, where("normalized", "in", part), qLimit(1));
        const doc1 = await getFirstDoc(q1);
        if (doc1) return doc1;
      } catch (_) {}
    }

    // b) where titlesAll array-contains-any [...]
    for (let i = 0; i < variants.length; i += 10) {
      const part = variants.slice(i, i + 10);
      try {
        const q2 = query(colRef, where("titlesAll", "array-contains-any", part), qLimit(1));
        const doc2 = await getFirstDoc(q2);
        if (doc2) return doc2;
      } catch (_) {}
    }

    // c) REGEX custom côté client (permet `grand-blue` <-> `grandblue`)
    if (normed.length) {
      const regexCandidates = normed.map(n =>
        new RegExp("^" + n.replace(/-/g, "[- ]?") + "$", "i")
      );

      try {
        const snap = await getDocs(query(colRef, qLimit(200))); // batch plus grand pour avoir plus de chances
        for (const d of snap.docs) {
          const norm = d.data().normalized || d.id;
          if (regexCandidates.some(rx => rx.test(norm))) {
            return { id: d.id, ...d.data() };
          }
        }
      } catch (_) {}
    }
  } catch (e) {
    // ignore and fallback to id-based search below
  }

  // 2) LAST RESORT: essayer par ID exact (si on a de bons candidats d'ID)
  const idCandidates = buildIdCandidatesFromTitles(variants);
  if (idCandidates.length) {
    try {
      const byId = await tryGetDocByIds(idCandidates, collectionName);
      if (byId) return byId;
    } catch (_) {}
  }

  return null;
}

async function injectDescriptionsFromFirebase(items = []) {
  await Promise.all(items.map(async (it) => {
    const titleVariants = Array.from(new Set([
      it?.title,
      it?.title_en,
      it?.title_romaji,
      ...(it?.title_variants || []),
    ].filter(Boolean)));

    const cacheKey = titleVariants.map(normalizeTitleForSeasonKey).join("|");
    if (firebaseDescCache.has(cacheKey)) {
      const cached = firebaseDescCache.get(cacheKey);
      it.description = cached || FR_DESC_PLACEHOLDER;
      return;
    }

    try {
      const docFound = await fetchFirebaseDocByTitles(titleVariants, "animes");
      const desc = pickDocDescription(docFound || {});
      firebaseDescCache.set(cacheKey, desc || null);
      it.description = desc || FR_DESC_PLACEHOLDER;

      // stocke l'ID qui a matché (debug/usage interne)
      if (docFound?.id) it._matchedDocId = docFound.id;
    } catch (e) {
      it.description = FR_DESC_PLACEHOLDER;
    }
  }));
}

// ========== FETCH ANI-LIST (puis remplace description par Firebase) ==========
async function fetchAniListGroupedAnimes(variables = {}) {
  const queryStr = `
    query (
      $page: Int, $perPage: Int, $sort: [MediaSort],
      $search: String, $season: MediaSeason, $seasonYear: Int, $genre: String
    ) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME
          sort: $sort
          search: $search
          season: $season
          seasonYear: $seasonYear
          genre: $genre
        ) {
          id
          title { romaji english native }
          synonyms
          description(asHtml: false)
          coverImage { extraLarge large medium color }
          bannerImage
          format
          episodes
          duration
          status
          startDate { year month day }
          season
          seasonYear
          averageScore
          popularity
          genres
          isAdult
        }
      }
    }
  `;

  try {
    const payload = {
      query: queryStr,
      variables: {
        page: 1,
        perPage: 20,
        sort: Array.isArray(variables.sort) ? variables.sort : [variables.sort || 'POPULARITY_DESC'],
        ...variables
      }
    };

    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data.errors) {
      console.error('AniList GraphQL errors:', data.errors);
      return [];
    }

    const media = data?.data?.Page?.media || [];
    const grouped = groupAnimeByFranchise(media);

    await injectDescriptionsFromFirebase(grouped);

    return grouped;
  } catch (error) {
    console.error('AniList API Error:', error);
    return [];
  }
}

// ========= Nouvelles fonctions (Firebase) =========
function mapAnimeDocToCard(docId, d = {}) {
  const rawTitle = d.title || d.romaji || d.english || d.native || "Sans titre";
  const displayTitle = normalizeDisplayTitle(rawTitle); // => pas de tirets
  const poster =
    d.posterImage || d.coverImage || d.cover || d.image ||
    'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image';
  const banner =
    d.bannerImage || d.banner || poster ||
    'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner';

  return {
    id: `FB-${docId}`,
    sourceId: docId,
    source: 'firebase',
    title: displayTitle,
    title_en: d.english,
    title_romaji: d.romaji,
    description: pickDocDescription(d) || FR_DESC_PLACEHOLDER,
    posterImage: poster,
    bannerImage: banner,
    coverImage: poster,
    coverColor: d.color || null,
    format: d.format || d.type || null,
    genres: d.genres || d.tags || [],
    averageScore: d.averageScore || d.score || null,
    popularity: d.popularity || null,
    // facultatif: conserver champ brut pour heuristiques si présent
    startDate: d.startDate || null,
  };
}

function scoreAsBase(docLike) {
  const t = (docLike.title || "").toLowerCase();
  const fmt = (docLike.format || docLike.type || "").toUpperCase();

  if (["MOVIE", "FILM", "SPECIAL", "OVA", "ONA"].includes(fmt)) return 100;

  const season2Plus = /\b(s(?:eason|aison)?\s*[2-9]\b|part\s*[2-9]\b|cour\s*[2-9]\b|ii|iii|iv|v)\b/i.test(t);
  let s = 0;
  if (season2Plus) s += 50;

  const season1 = /\b(s(?:eason|aison)?\s*1\b|part\s*1\b|cour\s*1\b)\b/i.test(t);
  if (!season2Plus && !season1) s -= 5;
  if (season1) s -= 20;

  if (fmt === "TV") s -= 10;

  return s;
}
function pickBaseFromGroup(items) {
  return items.slice().sort((a, b) => scoreAsBase(a) - scoreAsBase(b))[0];
}

// Heuristique plus stricte pour Featured: prend la S1/le titre "propre"
function pickBaseFeatured(items = []) {
  const isS1 = it => /\b(s(?:aison|eason)?\s*1|part\s*1|cour\s*1)\b/i.test(it.title);
  const looksBase = it =>
    !/\b(s(?:aison|eason)|part|cour)\b/i.test(it.title) && !/\b\d+\b/.test(it.title);

  // 1) explicitement "Season 1/Part 1/Cour 1"
  const s1 = items.find(isS1);
  if (s1) return s1;

  // 2) un titre sans bruit
  const base = items.find(looksBase);
  if (base) return base;

  // 3) un TV
  const tv = items.find(it => (it.format || "").toUpperCase() === "TV");
  if (tv) return tv;

  // 4) le plus ancien si on a la date
  const withYear = items.filter(it => it.startDate?.year);
  if (withYear.length) {
    return withYear.sort((a, b) => (a.startDate.year ?? 9999) - (b.startDate.year ?? 9999))[0];
  }

  // 5) fallback
  return items[0];
}

/**
 * fetchFeaturedAnimes:
 * - Cherche dans Firebase (animes.featured == true), puis collection "featured"
 * - Déduplique par franchise
 * - Prend **la base (S1 / titre propre)** -> évite "Science Future / Cour 2"
 * - Description FR: inject via Firebase (avec essai par ID + fallback requêtes)
 */
export async function fetchFeaturedAnimes(limit = 10) {
  const out = [];

  try {
    const qAnimes = query(
      collection(db, "animes"),
      where("featured", "==", true),
      qLimit(limit * 3)
    );
    const snapA = await getDocs(qAnimes);
    snapA.forEach(docSnap => out.push(mapAnimeDocToCard(docSnap.id, docSnap.data())));
  } catch (_) {}

  if (out.length < limit) {
    try {
      const qFeat = query(collection(db, "featured"), qLimit(limit * 3));
      const snapF = await getDocs(qFeat);
      snapF.forEach(docSnap => out.push(mapAnimeDocToCard(docSnap.id, docSnap.data())));
    } catch (_) {}
  }

  // Dédup par franchise (clé normalisée)
  const byKey = new Map();
  for (const it of out) {
    const key = normalizeTitleForSeasonKey(it.title);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  }

  // Ne garde que la "base"
  const dedupedAll = Array.from(byKey.values()).map(pickBaseFeatured);
  const deduped = dedupedAll.slice(0, limit);

  // Injecte la description FR (utilise d'abord l'ID Firestore si possible)
  await injectDescriptionsFromFirebase(deduped);

  return deduped.slice(0, limit);
}

/**
 * fetchEpisodes: triés par date desc
 */
export async function fetchEpisodes(limit = 20) {
  try {
    let qRef;
    try {
      qRef = query(
        collection(db, "episodes"),
        orderBy("date", "desc"),
        qLimit(limit)
      );
    } catch {
      qRef = query(collection(db, "episodes"), qLimit(limit));
    }

    const snap = await getDocs(qRef);
    const items = [];
    snap.forEach(doc => {
      const d = doc.data() || {};
      items.push({
        id: `EP-${doc.id}`,
        anime_title: d.anime_title || d.title || d.animeTitle || "Sans titre",
        season: d.season ?? d.season_number ?? d.saison ?? null,
        episode_number: d.episode_number ?? d.number ?? d.ep ?? d.episode ?? null,
        date: d.date || d.createdAt || d.updatedAt || null,
        ...d,
      });
    });

    items.sort((a, b) => {
      const da = new Date(a.date || 0).getTime() || (typeof a.date === 'number' ? a.date : 0);
      const db = new Date(b.date || 0).getTime() || (typeof b.date === 'number' ? b.date : 0);
      return db - da;
    });

    return items.slice(0, limit);
  } catch (e) {
    console.error("fetchEpisodes error:", e?.message);
    return [];
  }
}

// ========= Exports (AniList regroupé) =========
export async function fetchTrendingGrouped(limit = 12) {
  return fetchAniListGroupedAnimes({ sort: "TRENDING_DESC", perPage: limit });
}
export async function fetchTopRatedGrouped(limit = 12) {
  return fetchAniListGroupedAnimes({ sort: "SCORE_DESC", perPage: limit });
}
export async function fetchCurrentSeasonGrouped(limit = 12) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const season = month < 4 ? 'WINTER' : month < 7 ? 'SPRING' : month < 10 ? 'SUMMER' : 'FALL';
  return fetchAniListGroupedAnimes({ season, seasonYear: year, perPage: limit });
}
export async function searchAniListGrouped(queryText, limit = 12) {
  if (!queryText || queryText.trim().length < 2) return [];
  return fetchAniListGroupedAnimes({ search: queryText.trim(), perPage: limit });
}

// ========= AJOUTS pour HomeScreen (HERO/fallback/etc.) =========

// — Images AniList (avec cache) —
async function fetchAniListImage(title) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query: `
          query ($search: String) {
            Page(page: 1, perPage: 1) {
              media(type: ANIME, search: $search) {
                id
                coverImage { extraLarge large medium color }
                bannerImage
              }
            }
          }
        `,
        variables: { search: title },
      }),
    });
    const data = await response.json();
    const media = data?.data?.Page?.media?.[0];
    if (!media) throw new Error('No media found');
    return {
      poster: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium
        || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
      banner: media.bannerImage || media.coverImage?.extraLarge
        || 'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner',
      color: media.coverImage?.color || null
    };
  } catch (e) {
    return {
      poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
      banner: 'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner',
      color: null
    };
  }
}
const aniListImageCache = new Map();
export async function fetchAniListImageCached(title) {
  if (aniListImageCache.has(title)) return aniListImageCache.get(title);
  const data = await fetchAniListImage(title);
  aniListImageCache.set(title, data);
  return data;
}

// — Featured (Jikan) — utilisé en fallback HERO
export async function fetchFeaturedJikan(limit = 10) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=${limit}`);
    if (!res.ok) throw new Error(`Jikan API Error: ${res.status}`);
    const json = await res.json();

    const mapped = (json?.data || []).map(anime => {
      const titleVariants = [
        anime?.title,
        anime?.title_english,
        anime?.title_japanese,
        ...(Array.isArray(anime?.titles) ? anime.titles.map(t => t?.title).filter(Boolean) : []),
      ].filter(Boolean);

      return {
        rawId: anime.mal_id,
        source: 'jikan',
        title: anime.title,
        title_variants: titleVariants,
        image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        cover: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        type: anime.type,
        episodes: anime.episodes,
        averageScore: anime.score,
        genres: anime.genres?.map(g => g.name) || [],
      };
    });

    // Dédup par franchise (titre normalisé)
    const seen = new Set();
    const deduped = [];
    for (const it of mapped) {
      const key = normalizeTitleForSeasonKey(it.title);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(it);
    }

    // Description FR depuis Firebase (si dispo)
    await injectDescriptionsFromFirebase(deduped);

    return deduped.map(it => ({
      id: `JK-${it.rawId}`,
      sourceId: it.rawId,
      source: 'jikan',
      title: normalizeDisplayTitle(it.title), // pas de tirets
      description: it.description || FR_DESC_PLACEHOLDER,
      posterImage: it.image,
      bannerImage: it.cover,
      coverImage: it.image,
      type: it.type,
      episodes: it.episodes,
      averageScore: it.averageScore,
      genres: it.genres,
      _matchedDocId: it._matchedDocId, // si inject l'a rempli
    }));
  } catch (error) {
    console.error('Erreur fetchFeaturedJikan:', error);
    return [];
  }
}

// — Must Watch (mix popularité + score)
export async function fetchMustWatch(limit = 12) {
  return fetchAniListGroupedAnimes({
    sort: ["POPULARITY_DESC", "SCORE_DESC"],
    perPage: limit
  });
}

// — Fallback catalogue Firestore (utilisé par HomeScreen quand tout est vide)
export async function fetchAnimes(limit = 30) {
  try {
    // Essaye de trier si champ 'popularity' existe
    let snap;
    try {
      const qRef = query(collection(db, "animes"), orderBy("popularity", "desc"), qLimit(limit * 2));
      snap = await getDocs(qRef);
    } catch {
      const qRef = query(collection(db, "animes"), qLimit(limit * 2));
      snap = await getDocs(qRef);
    }

    const items = [];
    snap.forEach(doc => items.push(mapAnimeDocToCard(doc.id, doc.data())));

    // Dédup par franchise et privilégie la S1 TV (heuristique générique)
    const byKey = new Map();
    for (const it of items) {
      const key = normalizeTitleForSeasonKey(it.title);
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(it);
    }
    const deduped = Array.from(byKey.values()).map(pickBaseFromGroup);

    await injectDescriptionsFromFirebase(deduped);

    return deduped.slice(0, limit);
  } catch (e) {
    console.error("fetchAnimes error:", e?.message);
    return [];
  }
}

// ---------- Firebase: fetchEpisodesByTitle / grouping by season ----------
const DETAILS_COLLECTION = "animesDetails"; // adapte si besoin

/**
 * fetchEpisodesByTitle(titleOrAnime, options)
 * - titleOrAnime: string (titre) ou objet anime (route.params.anime)
 * - options.grouped: si true, renvoie { grouped: [{season, episodes}], flat: [...] }
 * Retourne par défaut un array plat d'épisodes triés.
 *
 * IMPORTANT: recherche par TITRE d'abord (normalized, titlesAll, regex),
 * puis en dernier recours essais par ID exact.
 */
export async function fetchEpisodesByTitle(titleOrAnime, options = { grouped: false }) {
  try {
    // Construire variantes de titre depuis string ou objet anime
    const titleVariants = [];
    if (typeof titleOrAnime === "string") {
      titleVariants.push(titleOrAnime);
    } else if (titleOrAnime && typeof titleOrAnime === "object") {
      titleVariants.push(
        titleOrAnime.title,
        titleOrAnime.title_en,
        titleOrAnime.title_romaji,
        titleOrAnime.sourceId,
        titleOrAnime.source_id,
        titleOrAnime.id,
        ...(Array.isArray(titleOrAnime.title_variants) ? titleOrAnime.title_variants : [])
      );
    }
    const variants = Array.from(new Set(titleVariants.filter(Boolean)));
    if (!variants.length) return options.grouped ? { grouped: [], flat: [] } : [];

    const colRef = collection(db, DETAILS_COLLECTION);
    const normed = variants.map(normalizeTitleForSeasonKey).filter(Boolean);

    let detailsDoc = null;

    // 1) Try normalized IN (title-first)
    for (let i = 0; i < normed.length && !detailsDoc; i += 10) {
      const part = normed.slice(i, i + 10);
      try {
        const q = query(colRef, where("normalized", "in", part), qLimit(1));
        const first = await getFirstDoc(q);
        if (first) { detailsDoc = first; break; }
      } catch (_) {}
    }

    // 2) Try titlesAll array-contains-any
    for (let i = 0; i < variants.length && !detailsDoc; i += 10) {
      const part = variants.slice(i, i + 10);
      try {
        const q2 = query(colRef, where("titlesAll", "array-contains-any", part), qLimit(1));
        const first2 = await getFirstDoc(q2);
        if (first2) { detailsDoc = first2; break; }
      } catch (_) {}
    }

    // 3) Regex scanning on a batch (client-side)
    if (!detailsDoc && normed.length) {
      try {
        const regexCandidates = normed.map(n => new RegExp("^" + n.replace(/-/g, "[- ]?") + "$", "i"));
        const snap = await getDocs(query(colRef, qLimit(250)));
        for (const d of snap.docs) {
          const norm = d.data().normalized || d.id;
          if (regexCandidates.some(rx => rx.test(norm))) {
            detailsDoc = { id: d.id, ...d.data() };
            break;
          }
        }
      } catch (_) {}
    }

    // 4) LAST RESORT: essayer par ID direct (les idCandidates sont dérivés des titres)
    if (!detailsDoc) {
      const idCandidates = buildIdCandidatesFromTitles(variants);
      if (idCandidates.length) {
        try {
          const byId = await tryGetDocByIds(idCandidates, DETAILS_COLLECTION);
          if (byId) detailsDoc = byId;
        } catch (_) {}
      }
    }

    // 5) Récupérer meta doc depuis collection "animes" si possible (pour thumbnail, episodesCount...)
    let animeMeta = null;
    try {
      animeMeta = await fetchFirebaseDocByTitles(variants, "animes");
    } catch (_) { /* ignore */ }

    // 6) Construire map saisons => array d'épisodes bruts
    const seasonsMap = new Map();

    if (detailsDoc && detailsDoc.episodes) {
      const epsField = detailsDoc.episodes;
      if (Array.isArray(epsField)) {
        // pas de saisons, on met tout dans "Saison 1"
        seasonsMap.set("Saison 1", epsField);
      } else if (typeof epsField === "object") {
        // epsField est un map: clé = "Saison 1", "Saison 2", ...
        for (const [seasonNameRaw, arrLike] of Object.entries(epsField)) {
          let arr = arrLike;
          // si la valeur est un objet indexé (0,1,2) -> convertir en array trié
          if (arr && !Array.isArray(arr) && typeof arr === "object") {
            const keys = Object.keys(arr).filter(k => !isNaN(k)).sort((a, b) => Number(a) - Number(b));
            arr = keys.map(k => arr[k]);
          }
          seasonsMap.set(String(seasonNameRaw), Array.isArray(arr) ? arr : []);
        }
      }
    }

    // 7) Si rien trouvé côté "details" mais episodesCount présent dans animeMeta -> générer placeholder
    if (seasonsMap.size === 0 && animeMeta && typeof animeMeta.episodesCount === "number") {
      const count = animeMeta.episodesCount;
      const arr = [];
      for (let i = 1; i <= count; i++) arr.push({ index: i, name: `Épisode ${i}`, release_date: null, languages: {} });
      seasonsMap.set("Saison 1", arr);
    }

    // 8) Si toujours vide, renvoyer vide
    if (seasonsMap.size === 0) {
      return options.grouped ? { grouped: [], flat: [] } : [];
    }

    // 9) Normaliser et aplatir les épisodes
    const allEpisodes = [];
    const preferLangPriority = ["VF", "VOSTFR", "FR", "VOST", "SUB", "DEFAULT"];

    for (const [seasonName, epsArr] of seasonsMap.entries()) {
      for (let i = 0; i < (epsArr || []).length; i++) {
        const raw = epsArr[i] || {};
        const num = raw.index ?? raw.episode ?? raw.number ?? (i + 1);
        const epTitle = raw.name || raw.title || `Épisode ${num}`;
        const date = raw.release_date || raw.date || null;

        // languages peut venir sous forme d'objet { VOSTFR: [urls], VF: [urls] } ou parfois array (urls directement)
        const langsRaw = raw.languages || raw.language || raw.lang || raw.langs || {};
        const langs = {};
        if (Array.isArray(langsRaw)) {
          // pas d'info de langue -> on met en "default"
          langs.default = langsRaw.filter(Boolean);
        } else if (langsRaw && typeof langsRaw === "object") {
          for (const [lk, lv] of Object.entries(langsRaw)) {
            langs[String(lk).toUpperCase()] = Array.isArray(lv) ? lv.filter(Boolean) : (lv ? [lv] : []);
          }
        }

        // choisir une URL par défaut (priorité VF > VOSTFR > 1ere dispo)
        let defaultUrl = null;
        for (const p of preferLangPriority) {
          if (langs[p] && langs[p][0]) { defaultUrl = langs[p][0]; break; }
        }
        if (!defaultUrl) {
          const firstLang = Object.keys(langs)[0];
          defaultUrl = firstLang ? (langs[firstLang][0] || null) : null;
        }

        // thumbnail / image fallback
        const thumbnail =
          animeMeta?.image ||
          animeMeta?.posterImage ||
          detailsDoc?.image ||
          detailsDoc?.posterImage ||
          animeMeta?.coverImage ||
          null;

        // id stable
        const seasonKey = collapseNormalizedKey(normalizeTitleForSeasonKey(String(seasonName)));
        const baseId = detailsDoc?.id || animeMeta?.id || buildIdCandidatesFromTitles(variants)[0] || "unknown";
        const epId = raw.id || `${baseId}-${seasonKey}-ep-${num}`;

        allEpisodes.push({
          id: epId,
          animeId: baseId,
          title: epTitle,
          number: Number(num),
          season: String(seasonName),
          seasonKey,
          date,
          languages: langs,
          url: defaultUrl,
          thumbnail,
          raw: raw,
        });
      }
    }

    // 10) Trier: par saison (numérique si possible) puis par numéro d'épisode
    function seasonSortVal(name) {
      const m = String(name).match(/(\d+)/);
      return m ? Number(m[1]) : 1;
    }
    allEpisodes.sort((a, b) => {
      const sa = seasonSortVal(a.season), sb = seasonSortVal(b.season);
      if (sa !== sb) return sa - sb;
      return (a.number || 0) - (b.number || 0);
    });

    if (options.grouped) {
      const bySeason = new Map();
      for (const ep of allEpisodes) {
        if (!bySeason.has(ep.season)) bySeason.set(ep.season, []);
        bySeason.get(ep.season).push(ep);
      }
      const grouped = Array.from(bySeason.entries()).map(([season, episodes]) => ({ season, episodes }));
      return { grouped, flat: allEpisodes };
    }

    return allEpisodes;
  } catch (e) {
    console.error("fetchEpisodesByTitle error:", e?.message || e);
    return options.grouped ? { grouped: [], flat: [] } : [];
  }
}

/** Alias: obtenir grouped + flat directement */
export async function fetchEpisodesGroupedBySeason(titleOrAnime) {
  return fetchEpisodesByTitle(titleOrAnime, { grouped: true });
}

// — Featured (autres fonctions déjà présentes) —
// (les autres fonctions exportées plus haut restent inchangées)

// — fetchAniListImageCached, fetchFeaturedJikan, fetchMustWatch, fetchAnimes ... (déjà définis) —
// (nous avons conservé tout le reste du fichier tel quel)

// FIN DU FICHIER
