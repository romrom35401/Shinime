// api-images-fixed.js - API optimisée pour les images avec AniList
const ANILIST_API = 'https://graphql.anilist.co';

// Requête GraphQL optimisée pour récupérer les meilleures images
const MEDIA_IMAGES_QUERY = `
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
        status
        averageScore
        popularity
        genres
        startDate {
          year
          month
          day
        }
        season
        seasonYear
      }
    }
  }
`;

// Fonction pour obtenir l'URL d'image la plus haute qualité avec fallback
function getBestImageUrl(coverImage, bannerImage) {
  // Priorité: extraLarge > large > medium > banner > placeholder
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

// Fonction principale avec retry et meilleure gestion d'erreurs
export async function fetchAnimesWithImages(variables = {}) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: MEDIA_IMAGES_QUERY,
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

    const mediaList = data?.data?.Page?.media || [];
    
    return mediaList.map(anime => {
      const images = getBestImageUrl(anime.coverImage, anime.bannerImage);
      
      return {
        id: anime.id,
        title: anime.title.romaji || anime.title.english || anime.title.native,
        title_en: anime.title.english,
        title_romaji: anime.title.romaji,
        description: anime.description,
        posterImage: images.poster,
        bannerImage: images.banner,
        coverImage: anime.coverImage,
        format: anime.format,
        episodes: anime.episodes,
        status: anime.status,
        averageScore: anime.averageScore,
        popularity: anime.popularity,
        genres: anime.genres,
        season: anime.season,
        seasonYear: anime.seasonYear,
        startDate: anime.startDate
      };
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des images AniList:', error);
    return [];
  }
}

// Fonctions spécifiques avec images optimisées
export async function fetchTrendingAnimes(limit = 12) {
  return fetchAnimesWithImages({
    sort: 'TRENDING_DESC',
    perPage: limit
  });
}

export async function fetchTopRatedAnimes(limit = 12) {
  return fetchAnimesWithImages({
    sort: 'SCORE_DESC',
    perPage: limit
  });
}

export async function fetchCurrentSeasonAnimes(limit = 12) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const currentSeason = seasons[Math.floor(currentMonth / 3)];
  
  return fetchAnimesWithImages({
    season: currentSeason,
    seasonYear: currentYear,
    perPage: limit
  });
}

export async function searchAnimesWithImages(searchTerm, limit = 12) {
  if (!searchTerm?.trim()) return [];
  
  return fetchAnimesWithImages({
    search: searchTerm.trim(),
    perPage: limit
  });
}

// Fonction pour récupérer une image spécifique par ID
export async function fetchAnimeImageById(animeId) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              coverImage {
                extraLarge
                large
                medium
              }
              bannerImage
            }
          }
        `,
        variables: { id: animeId }
      })
    });

    const data = await response.json();
    const media = data?.data?.Media;
    
    if (!media) return null;
    
    return getBestImageUrl(media.coverImage, media.bannerImage);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image:', error);
    return null;
  }
}

export default {
  fetchAnimesWithImages,
  fetchTrendingAnimes,
  fetchTopRatedAnimes,
  fetchCurrentSeasonAnimes,
  searchAnimesWithImages,
  fetchAnimeImageById
};
