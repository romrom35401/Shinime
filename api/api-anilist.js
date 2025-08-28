// api-anilist.js - API AniList optimisée pour les images avec gestion robuste
const ANILIST_API = 'https://graphql.anilist.co';

// Fonction pour obtenir l'URL d'image la plus haute qualité avec fallback
function getBestImageUrl(coverImage, bannerImage) {
  return {
    poster: coverImage?.extraLarge || 
            coverImage?.large || 
            coverImage?.medium || 
            'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
    banner: bannerImage || 
            coverImage?.extraLarge || 
            'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner'
  };
}

// Fonction pour normaliser les titres (enlever les indications de saison)
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/season\s*\d+/gi, '')
    .replace(/saison\s*\d+/gi, '')
    .replace(/part\s*\d+/gi, '')
    .replace(/cour\s*\d+/gi, '')
    .replace(/第\s*\d+\s*期/gi, '')
    .trim();
}

// Fonction pour regrouper les saisons par franchise avec images optimisées
function groupAnimeByFranchise(animeList) {
  const franchises = new Map();
  
  animeList.forEach(anime => {
    const title = anime.title.romaji || anime.title.english;
    const normalizedTitle = normalizeTitle(title);
    
    if (!franchises.has(normalizedTitle)) {
      const images = getBestImageUrl(anime.coverImage, anime.bannerImage);
      
      franchises.set(normalizedTitle, {
        id: anime.id,
        title: title,
        title_en: anime.title.english,
        title_romaji: anime.title.romaji,
        description: anime.description,
        posterImage: images.poster,
        bannerImage: images.banner,
        coverImage: images.poster,
        format: anime.format,
        genres: anime.genres,
        averageScore: anime.averageScore,
        popularity: anime.popularity,
        seasons: []
      });
    }
    
    // Ajouter la saison avec images optimisées
    const seasonImages = getBestImageUrl(anime.coverImage, anime.bannerImage);
    franchises.get(normalizedTitle).seasons.push({
      id: anime.id,
      season: anime.season,
      seasonYear: anime.seasonYear,
      episodes: anime.episodes,
      status: anime.status,
      coverImage: seasonImages.poster
    });
  });
  
  return Array.from(franchises.values());
}

// Fonction principale optimisée avec gestion d'erreur améliorée
export async function fetchAniListGroupedAnimes(variables = {}) {
  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $search: String, $season: MediaSeason, $seasonYear: Int, $genre: String) {
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
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            extraLarge
            large
            medium
            color
          }
          bannerImage
          format
          episodes
          duration
          status
          startDate {
            year
            month
            day
          }
          season
          seasonYear
          averageScore
          popularity
          genres
          startDate {
            year
            month
            day
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          page: 1,
          perPage: 20,
          sort: 'POPULARITY_DESC',
          ...variables
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('AniList GraphQL errors:', data.errors);
      return [];
    }

    const animeList = data?.data?.Page?.media || [];
    return groupAnimeByFranchise(animeList);
  } catch (error) {
    console.error('AniList API Error:', error);
    return [];
  }
}

// Fonction pour récupérer une franchise complète
export async function fetchFranchiseDetails(animeId) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: FRANCHISE_QUERY,
        variables: { id: animeId }
      })
    });

    const data = await response.json();
    return data?.data?.Media || null;
  } catch (error) {
    console.error('AniList Franchise Error:', error);
    return null;
  }
}

// Fonction pour récupérer les images d'un anime par titre
export async function fetchAniListImage(title) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query ($search: String) {
            Page(page: 1, perPage: 1) {
              media(type: ANIME, search: $search) {
                id
                coverImage {
                  extraLarge
                  large
                  medium
                }
                bannerImage
              }
            }
          }
        `,
        variables: { search: title }
      })
    });

    const data = await response.json();
    const media = data?.data?.Page?.media?.[0];
    
    if (!media) {
      return {
        poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
        banner: 'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner'
      };
    }
    
    return {
      poster: media.coverImage?.extraLarge || 
              media.coverImage?.large || 
              media.coverImage?.medium || 
              'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
      banner: media.bannerImage || 
              media.coverImage?.extraLarge || 
              'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner'
    };
  } catch (error) {
    console.error('AniList Image Error:', error);
    return {
      poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
      banner: 'https://via.placeholder.com/1200x300/1a1a1a/ffffff?text=No+Banner'
    };
  }
}

// Fonctions spécifiques pour les catégories
export async function fetchTrendingGrouped(limit = 12) {
  return fetchAniListGroupedAnimes({
    sort: 'TRENDING_DESC',
    perPage: limit
  });
}

export async function fetchTopRatedGrouped(limit = 12) {
  return fetchAniListGroupedAnimes({
    sort: 'SCORE_DESC',
    perPage: limit
  });
}

export async function fetchCurrentSeasonGrouped(limit = 12) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentSeason = currentMonth < 3 ? 'WINTER' : 
                       currentMonth < 6 ? 'SPRING' : 
                       currentMonth < 9 ? 'SUMMER' : 'FALL';
  
  return fetchAniListGroupedAnimes({
    season: currentSeason,
    seasonYear: currentYear,
    perPage: limit
  });
}

export async function fetchByGenreGrouped(genre, limit = 12) {
  return fetchAniListGroupedAnimes({
    genre: genre,
    perPage: limit
  });
}
// Récupérer les animes populaires depuis Enime API
export async function fetchFeaturedEnime(limit = 10) {
  try {
    // Timeout manuel
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch('https://api.enime.moe/popular', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Enime API Error: HTTP ${res.status}`);

    const data = await res.json();

    if (!data?.data) throw new Error('Enime API: data missing');

    // Limiter et transformer
    return data.data.slice(0, limit).map(anime => ({
      id: anime.id,
      title: anime.title?.english || anime.title?.romaji || anime.title?.native || 'Titre inconnu',
      title_fr: anime.title?.english || anime.title?.romaji || anime.title?.native || 'Titre inconnu',
      image: anime.coverImage || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
      cover: anime.coverImage || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=No+Image',
      type: anime.format || "Anime",
      episodes: anime.episodes || "??",
      synopsis_fr: anime.description || "Synopsis indisponible.",
      averageScore: anime.averageScore || null,
      genres: anime.genres || []
    }));
  } catch (error) {
    console.error("Erreur fetchFeaturedEnime:", error.message || error);
    return [];
  }
}


