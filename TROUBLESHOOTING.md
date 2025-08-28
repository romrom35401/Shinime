# 🔧 Guide de Dépannage - Problèmes de Lecture d'Animes

## 🎯 Problème Principal
La lecture des animes ne fonctionne pas dans AnimeDetailsScreen.js

## 🔍 Étapes de Diagnostic

### 1. **Vérifier les Données d'Épisodes**
- Ouvrez l'app et allez sur un anime
- Cliquez sur le bouton **"Debug"** (rouge) en haut à droite
- Vérifiez que :
  - `Épisodes chargés` > 0
  - `Épisodes filtrés` > 0
  - Le premier épisode a des données

### 2. **Vérifier le Backend d'Extraction**
- Le bouton Debug teste automatiquement le backend
- Vérifiez que `Backend: ✅ OK`
- Si `❌ Erreur`, le service est hors service

### 3. **Vérifier les Logs Console**
Ouvrez la console de développement et cherchez :
```
🎬 Tentative de lecture épisode:
🔗 URL candidate initiale:
📋 Tous les candidats trouvés:
🌐 Test de connectivité...
⚡ Récupération du flux direct...
```

## 🛠️ Solutions par Problème

### ❌ **Aucun épisode chargé**
**Cause :** Problème avec Firebase ou l'API
**Solutions :**
1. Vérifiez la connexion internet
2. Vérifiez la configuration Firebase dans `api/firebaseConfig.js`
3. Vérifiez que la collection `animesDetails` existe dans Firebase

### ❌ **Backend non accessible**
**Cause :** Le service d'extraction vidéo est hors service
**Solutions :**
1. Attendez quelques minutes (service peut être en maintenance)
2. Vérifiez l'URL : `https://video-extractor-wqlx.onrender.com`
3. Contactez l'administrateur du service

### ❌ **Aucun lien trouvé pour l'épisode**
**Cause :** Les épisodes n'ont pas d'URLs valides
**Solutions :**
1. Vérifiez que l'anime a des épisodes dans la base de données
2. Vérifiez le format des URLs dans Firebase
3. Ajoutez des URLs manuellement dans Firebase

### ❌ **Erreur d'extraction**
**Cause :** Le backend ne peut pas extraire l'URL
**Solutions :**
1. Vérifiez que l'URL source est valide
2. Essayez une autre langue (VF au lieu de VOSTFR)
3. Le service peut ne pas supporter cet hébergeur

## 🔧 **Actions Correctives**

### 1. **Ajouter des URLs de Test**
Si vous n'avez pas d'épisodes, ajoutez ceci dans Firebase :

```javascript
// Collection: animesDetails
// Document: test-anime
{
  "title": "Anime de Test",
  "episodes": {
    "Saison 1": [
      {
        "index": 1,
        "name": "Épisode 1",
        "languages": {
          "VOSTFR": ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
          "VF": ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]
        }
      }
    ]
  }
}
```

### 2. **Tester avec une URL Directe**
Modifiez temporairement `onPlayEpisode` pour tester :

```javascript
// Dans onPlayEpisode, remplacez candidateUrl par :
const candidateUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
```

### 3. **Vérifier la Navigation**
Assurez-vous que l'écran `Player` est bien configuré dans votre navigation.

## 📱 **Test Rapide**

1. Ouvrez l'app
2. Allez sur un anime
3. Cliquez sur "Debug"
4. Notez les informations affichées
5. Essayez de lire un épisode
6. Regardez les logs console

## 🆘 **Si Rien ne Fonctionne**

1. **Redémarrez l'app** complètement
2. **Vérifiez votre connexion internet**
3. **Vérifiez que Firebase est configuré correctement**
4. **Contactez le support** avec les logs d'erreur

## 📋 **Logs Utiles à Collecter**

Quand vous reportez un problème, incluez :
- Le résultat du bouton Debug
- Les logs console (🎬, 🔗, 📋, etc.)
- Le nom de l'anime testé
- Votre version d'Android/iOS
- Votre connexion internet (WiFi/4G)
