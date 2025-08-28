# 🧪 Guide de Test - Backend Render

## 🎯 Objectif
Tester votre backend Render avec l'app Shinime

## 📋 Prérequis

### 1. **URL de votre Backend Render**
Remplacez dans `api/config.js` :
```javascript
new: 'https://VOTRE-BACKEND-REEL.onrender.com'
```

### 2. **Vérifier que votre Backend Fonctionne**
Testez votre backend directement :
```bash
# Test de santé
curl https://VOTRE-BACKEND-REEL.onrender.com/health

# Test d'extraction
curl https://VOTRE-BACKEND-REEL.onrender.com/api/extract?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## 🔍 Tests à Effectuer

### Test 1 : Vérification de la Connectivité
1. Ouvrez l'app Shinime
2. Allez sur un anime (ex: "The Rising OF The Shield Hero")
3. Cliquez sur le bouton **"Debug"** (rouge)
4. Vérifiez que :
   - `Épisodes chargés: 58` (ou plus)
   - `Épisodes filtrés: > 0`
   - `Backend: ✅ OK`

### Test 2 : Lecture d'Épisode
1. Cliquez sur un épisode pour le lire
2. Observez les logs console :
   ```
   🎬 Tentative de lecture épisode: {...}
   🔍 Préparation du stream...
   📦 Données stream reçues: {...}
   ✅ Stream préparé: {...}
   ```

### Test 3 : Test Direct de l'API
Testez votre endpoint `/api/stream/prepare` :
```bash
curl -X POST https://VOTRE-BACKEND-REEL.onrender.com/api/stream/prepare \
  -H "Content-Type: application/json" \
  -d '{
    "episodeId": "the-rising-of-the-shield-hero-Saison 1-1",
    "language": "VOSTFR",
    "preferredQuality": "720p"
  }'
```

## 🐛 Diagnostic des Problèmes

### ❌ **Erreur "Connection timeout"**
**Cause :** Render met du temps à démarrer (cold start)
**Solution :** Attendez 10-30 secondes et réessayez

### ❌ **Erreur "404 Not Found"**
**Cause :** Endpoint inexistant
**Solution :** Vérifiez que votre backend a bien l'endpoint `/api/stream/prepare`

### ❌ **Erreur "500 Internal Server Error"**
**Cause :** Erreur dans votre backend
**Solution :** Vérifiez les logs Render

## 📊 Logs Attendus

### Succès
```
🎬 Tentative de lecture épisode: {
  id: "the-rising-of-the-shield-hero-Saison 1-1",
  title: "Épisode 1",
  number: 1,
  languages: { VOSTFR: ["url1", "url2"] }
}
🔍 Préparation du stream...
📦 Données stream reçues: {
  success: true,
  stream: {
    url: "https://...",
    type: "mp4",
    quality: "720p",
    headers: { Referer: "..." }
  }
}
✅ Stream préparé: {...}
🎯 Navigation vers Player avec URL: https://...
```

## 🔧 Configuration

### 1. **Mettre à jour l'URL Render**
Dans `api/config.js`, remplacez :
```javascript
new: 'https://VOTRE-BACKEND-REEL.onrender.com'
```

### 2. **Vérifier les Variables d'Environnement Render**
Dans votre dashboard Render, vérifiez :
- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_DATABASE_URL`
- `PORT` (généralement 3000)

### 3. **Tester les Endpoints**
```bash
# Health check
curl https://VOTRE-BACKEND-REEL.onrender.com/health

# Test extraction
curl "https://VOTRE-BACKEND-REEL.onrender.com/api/extract?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Test stream prepare
curl -X POST https://VOTRE-BACKEND-REEL.onrender.com/api/stream/prepare \
  -H "Content-Type: application/json" \
  -d '{"episodeId":"test","language":"VOSTFR"}'
```

## ✅ Checklist de Validation

- [ ] URL Render correcte dans `api/config.js`
- [ ] Backend Render accessible (health check OK)
- [ ] Endpoint `/api/stream/prepare` fonctionne
- [ ] App charge les épisodes
- [ ] Lecture d'épisode fonctionne
- [ ] Player reçoit les bonnes URLs
- [ ] Headers sont passés correctement

## 🆘 En Cas de Problème

### 1. **Vérifiez les Logs Render**
- Allez sur votre dashboard Render
- Cliquez sur votre service
- Onglet "Logs"

### 2. **Testez Manuellement**
```bash
# Test complet
curl -v https://VOTRE-BACKEND-REEL.onrender.com/health
```

### 3. **Vérifiez les Variables d'Environnement**
Dans Render Dashboard → Environment Variables

### 4. **Redémarrez le Service**
Dans Render Dashboard → Manual Deploy

## 🎉 Succès !

Si tout fonctionne, vous devriez voir :
- Les épisodes se chargent rapidement
- La lecture démarre sans erreur
- Le Player affiche la vidéo
- Les logs montrent votre backend Render utilisé

## 📱 Test sur Appareil Physique

Aucune configuration spéciale nécessaire ! Votre backend Render est accessible depuis n'importe où.
