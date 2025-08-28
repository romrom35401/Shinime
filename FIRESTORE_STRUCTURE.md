# 🔧 Structure Firestore Correcte

## 🎯 Problème Actuel
Votre document Firestore ne contient que les métadonnées, pas les épisodes avec URLs.

## ✅ Structure Correcte

### Document Firestore Actuel (❌ Incorrect)
```json
{
  "title": "Mikadono Sanshimai wa Angai Choroi",
  "synopsis": "...",
  "genres": ["Comédie", "Romance", "Famille"],
  "episodesCount": 9,
  "image": "..."
}
```

### Structure Correcte (✅ Nécessaire)
```json
{
  "title": "Mikadono Sanshimai wa Angai Choroi",
  "synopsis": "...",
  "genres": ["Comédie", "Romance", "Famille"],
  "episodesCount": 9,
  "image": "...",
  "episodes": {
    "Saison 1": [
      {
        "index": 1,
        "name": "Épisode 1",
        "release_date": "2023-10-05T00:00:00+00:00",
        "languages": {
          "VOSTFR": [
            "https://vk.com/video_ext.php?oid=755747641&id=456240187&hd=3",
            "https://video.sibnet.ru/shell.php?videoid=5268117",
            "https://sendvid.com/embed/zk000hk2"
          ]
        }
      },
      {
        "index": 2,
        "name": "Épisode 2",
        "release_date": "2023-10-12T00:00:00+00:00",
        "languages": {
          "VOSTFR": [
            "https://vk.com/video_ext.php?oid=755747641&id=456240188&hd=3"
          ]
        }
      }
    ]
  }
}
```

## 🛠️ Comment Corriger

### 1. **Via Firebase Console**
1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet
3. Allez dans **Firestore Database**
4. Trouvez le document `mikadono-sanshimai-wa-angai-choroi`
5. Ajoutez le champ `episodes` avec la structure ci-dessus

### 2. **Via Script de Migration**
```javascript
// Script pour ajouter les épisodes
const admin = require('firebase-admin');

const episodesData = {
  "Saison 1": [
    {
      "index": 1,
      "name": "Épisode 1",
      "release_date": "2023-10-05T00:00:00+00:00",
      "languages": {
        "VOSTFR": [
          "https://vk.com/video_ext.php?oid=755747641&id=456240187&hd=3",
          "https://video.sibnet.ru/shell.php?videoid=5268117"
        ]
      }
    }
    // ... autres épisodes
  ]
};

// Mettre à jour le document
await admin.firestore()
  .collection('animes')
  .doc('mikadono-sanshimai-wa-angai-choroi')
  .update({
    episodes: episodesData
  });
```

## 🔍 **Alternative : Modifier le Code**

Si vous ne pouvez pas modifier Firestore, on peut adapter le code pour utiliser l'API principale qui fonctionne :

```javascript
// Dans loadAnimeData, inverser l'ordre :
// 1. API principale (qui fonctionne)
// 2. Firestore (fallback)
```

## 📋 **Prochaines Étapes**

1. **Vérifiez votre structure Firestore** pour cet anime
2. **Ajoutez les épisodes** si manquants
3. **Ou dites-moi** si vous préférez que je modifie le code pour utiliser l'API principale en priorité
