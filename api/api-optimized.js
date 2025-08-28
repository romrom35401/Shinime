import RateLimiter from '../api-rate-limiter';
import CacheManager from './api-cache-manager';
import AnimeAPIAlternatives from './api-alternatives';

class OptimizedAPI {
  constructor() {
    this.rateLimiter = new RateLimiter(60); // 60 requêtes par minute
    this.cacheManager = new CacheManager();
    this.alternatives = new AnimeAPIAlternatives();
    this.useAlternatives = false;
  }

  async fetchAniListData(variables = {}) {
    const cacheKey = `anilist_${JSON.stringify(variables)}`;
    
    // Vérifier le cache
    const cached = this.cacheManager.get(cacheKey);
    if (cached) {
      console.log('Serving from cache');
      return cached;
    }

    try {
      const data = await this.rateLimiter.makeRequest('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: this.getAniListQuery(),
          variables: {
            page: 1,
            perPage: 20,
            sort: 'POPULARITY_DESC',
            ...variables
          }
        })
      });

      const animeList = data?.data?.Page?.media || [];
      const result = this.transformAniListData(animeList);
      
      // Mettre en cache
      this.cacheManager.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('AniList API Error, switching to alternatives:', error);
      this.useAlternatives = true;
      return this.fetchFromAlternatives(variables);
    }
  }

  async fetchFromAlternatives(variables = {}) {
    try {
      // Utiliser Jikan pour les anime trending/populaires
      const trendingData = await this.alternatives.fetchTrendingAnime(20);
      return trendingData;
    } catch (error) {
      console.error('All APIs failed:', error);
      return [];
    }
  }

  getAniListQuery() {
    return `
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
          }
        }
      }
    `;
  }

  transformAniListData(animeList) {
    return animeList.map(anime => ({
      id: anime.id,
      title: {
        romaji: anime.title.romaji,
        english: anime.title.english,
        native: anime.title.native
      },
      description: anime.description,
      coverImage: {
        extraLarge: anime.coverImage?.extraLarge,
        large: anime.coverImage?.large,
        medium: anime.coverImage?.medium
      },
      bannerImage: anime.bannerImage,
      format: anime.format,
      episodes: anime.episodes,
      duration: anime.duration,
      status: anime.status,
      startDate: anime.startDate,
      season: anime.season,
      seasonYear: anime.seasonYear,
      averageScore: anime.averageScore,
      popularity: anime.popularity,
      genres: anime.genres
    }));
  }

  // Méthodes spécifiques
  async fetchFeaturedAnime() {
    return this.fetchAniListData({
      sort: 'POPULARITY_DESC',
      perPage: 12
    });
  }

  async fetchTrendingAnime() {
    return this.fetchAniListData({
      sort: 'TRENDING_DESC',
      perPage: 12
    });
  }

  async fetchTopRatedAnime() {
    return this.fetchAniListData({
      sort: 'SCORE_DESC',
      perPage: 12
    });
  }

  async fetchCurrentSeasonAnime() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentSeason = currentMonth < 3 ? 'WINTER' : 
                         currentMonth < 6 ? 'SPRING' : 
                         currentMonth < 9 ? 'SUMMER' : 'FALL';
    
    return this.fetchAniListData({
      season: currentSeason,
      seasonYear: currentYear,
      perPage: 12
    });
  }

  clearCache() {
    this.cacheManager.clear();
  }

  getCacheStats() {
    return this.cacheManager.getStats();
  }
}

export default OptimizedAPI;
