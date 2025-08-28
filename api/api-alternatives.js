// API alternatives pour éviter les limites AniList
const ANIME_APIS = {
  // Jikan - API MyAnimeList non officielle
  jikan: {
    baseUrl: 'https://api.jikan.moe/v4',
    endpoints: {
      topAnime: '/top/anime',
      animeById: '/anime/{id}',
      search: '/anime',
      recommendations: '/anime/{id}/recommendations'
    }
  },
  
  // Kitsu - API alternative
  kitsu: {
    baseUrl: 'https://kitsu.io/api/edge',
    endpoints: {
      trending: '/trending/anime',
      anime: '/anime'
    }
  },
  
  // Simkl - API avec images
  simkl: {
    baseUrl: 'https://api.simkl.com',
    endpoints: {
      trending: '/anime/trending',
      popular: '/anime/popular'
    }
  }
};

// Classe pour gérer les API alternatives
class AnimeAPIAlternatives {
  constructor() {
    this.apis = ['jikan', 'kitsu', 'simkl'];
    this.currentApi = 0;
  }

  async fetchFromJikan(endpoint, params = {}) {
    try {
      const url = new URL(`${ANIME_APIS.jikan.baseUrl}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Jikan API error: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Jikan API Error:', error);
      return null;
    }
  }

  async fetchFromKitsu(endpoint, params = {}) {
    try {
      const url = new URL(`${ANIME_APIS.kitsu.baseUrl}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      });
      
      if (!response.ok) throw new Error(`Kitsu API error: ${response.status}`);
      
      const data = await response.json();
      return this.transformKitsuData(data);
    } catch (error) {
      console.error('Kitsu API Error:', error);
      return null;
    }
  }

  async fetchFromSimkl(endpoint, params = {}) {
    try {
      const url = new URL(`${ANIME_APIS.simkl.baseUrl}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Simkl API error: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Simkl API Error:', error);
      return null;
    }
  }

  transformKitsuData(data) {
    if (!data.data) return [];
    
    return data.data.map(item => ({
      id: item.id,
      title: {
        romaji: item.attributes.titles.en_jp,
        english: item.attributes.titles.en
      },
      description: item.attributes.synopsis,
      coverImage: {
        extraLarge: item.attributes.posterImage?.original,
        large: item.attributes.posterImage?.large
      },
      bannerImage: item.attributes.coverImage?.original,
      averageScore: item.attributes.averageRating ? Math.round(item.attributes.averageRating) : null,
      popularity: item.attributes.popularityRank,
      genres: item.attributes.genres || []
    }));
  }

  async fetchTrendingAnime(limit = 12) {
    // Essayer Jikan d'abord
    const jikanData = await this.fetchFromJikan('/top/anime', { limit, type: 'tv' });
    if (jikanData?.data) {
      return this.transformJikanData(jikanData.data);
    }

    // Essayer Kitsu
    const kitsuData = await this.fetchFromKitsu('/trending/anime', { limit });
    if (kitsuData) {
      return kitsuData;
    }

    return [];
  }

  transformJikanData(data) {
    return data.map(item => ({
      id: item.mal_id,
      title: {
        romaji: item.title,
        english: item.title_english
      },
      description: item.synopsis,
      coverImage: {
        extraLarge: item.images?.jpg?.large_image_url,
        large: item.images?.jpg?.image_url
      },
      bannerImage: item.images?.jpg?.large_image_url,
      averageScore: item.score ? Math.round(item.score * 10) : null,
      popularity: item.popularity,
      genres: item.genres?.map(g => g.name) || []
    }));
  }
}

export default AnimeAPIAlternatives;
