# 📡 Documentation des endpoints API

## 🚀 Serveur Anime Backend v2.0

Votre serveur `index.js` modifié supporte maintenant tous les endpoints nécessaires pour votre application React Native anime.

## ✅ Endpoints disponibles

### 🎬 Extraction vidéo
- **GET** `/api/extract?url=URL&prefer=mp4` - Extraction d'URL vidéo depuis les hébergeurs
- **GET** `/api/test` - Test de connectivité backend

### 📺 Gestion des animes et épisodes
- **GET** `/api/episodes/:title` - Récupération des épisodes par titre d'anime
- **GET** `/api/anime/:title/episodes` - Alias pour les épisodes  
- **GET** `/api/anime/:animeId` - Détails d'un anime spécifique
- **GET** `/api/animes?limit=50&offset=0` - Liste de tous les animes (catalogue)

### 🔍 Recherche et découverte
- **GET** `/api/search?q=TERME&limit=20` - Recherche d'animes
- **POST** `/api/search` - Recherche d'animes (POST avec body)
- **GET** `/api/trending?limit=20` - Animes populaires/tendance
- **GET** `/api/top-rated?limit=20` - Animes les mieux notés
- **GET** `/api/current-season?limit=20` - Animes de la saison actuelle
- **GET** `/api/must-watch?limit=20` - Animes incontournables
- **GET** `/api/genre/:genre?limit=20` - Animes par genre

### 🎵 Streaming
- **POST** `/api/stream/prepare` - Préparation de stream avec session

### 📊 Santé et statut
- **GET** `/` - Page d'accueil avec statut
- **GET** `/health` - Check de santé détaillé

## 🔧 Correspondance avec l'app

### Fonctions API de l'app → Endpoints du serveur

| Fonction dans l'app | Endpoint correspondant |
|---------------------|------------------------|
| `fetchEpisodesByTitle(title)` | `GET /api/episodes/${title}` |
| `searchAniListGrouped(q, limit)` | `GET /api/search?q=${q}&limit=${limit}` |
| `fetchTrendingGrouped(limit)` | `GET /api/trending?limit=${limit}` |
| `fetchTopRatedGrouped(limit)` | `GET /api/top-rated?limit=${limit}` |
| `fetchCurrentSeasonGrouped(limit)` | `GET /api/current-season?limit=${limit}` |
| `fetchMustWatch(limit)` | `GET /api/must-watch?limit=${limit}` |
| `fetchByGenreGrouped(genre, limit)` | `GET /api/genre/${genre}?limit=${limit}` |
| `fetchAnimes(limit)` | `GET /api/animes?limit=${limit}` |
| `testBackendConnectivity()` | `GET /api/test` |
| Stream preparation | `POST /api/stream/prepare` |

## 🔄 Fonctionnalités intégrées

### ✅ Gestion Firebase
- Support automatique des collections Firebase existantes
- Fallback avec données mock si Firebase indisponible
- Recherche dans plusieurs collections : `animes`, `animeDetails`, `animesDetails`, etc.

### ✅ Extraction vidéo avancée
- Support de tous les hébergeurs vidéo existants
- Priorité MP4 pour compatibilité Expo Go
- Cache intégré pour optimiser les performances

### ✅ Données mock
- Catalogue d'animes populaires intégré
- Génération d'épisodes factices pour tests
- Images placeholder automatiques

### ✅ Gestion des erreurs
- Logging détaillé des requêtes
- Fallbacks automatiques en cas d'échec
- Messages d'erreur informatifs

## 📱 Configuration de l'app

Pour que votre app utilise ce serveur, assurez-vous que :

1. **L'URL du backend** pointe vers votre serveur Render
2. **Les variables d'environnement Firebase** sont configurées sur Render
3. **L'app utilise les bons endpoints** (ils sont maintenant tous disponibles)

## 🚀 Déploiement sur Render

Votre serveur `index.js` est optimisé pour Render :
- Port automatique via `process.env.PORT`
- Gestion des erreurs de démarrage
- Health checks intégrés
- Timeouts configurés
- Arrêt gracieux du serveur

## 🧪 Tests

Vous pouvez tester les endpoints avec :

```bash
# Test de base
curl https://votre-serveur.render.com/health

# Test recherche
curl "https://votre-serveur.render.com/api/search?q=naruto"

# Test épisodes
curl "https://votre-serveur.render.com/api/episodes/One%20Piece"

# Test extraction vidéo
curl "https://votre-serveur.render.com/api/extract?url=URL_VIDEO&prefer=mp4"
```

---

🎉 **Votre serveur est maintenant entièrement compatible avec votre app React Native !**
