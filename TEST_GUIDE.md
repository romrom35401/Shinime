# 🧪 Guide de Test - Nouveau Système de Lecture

## 🎯 Objectif
Tester le nouveau système de lecture qui utilise votre backend local au lieu de l'ancien service.

## 📋 Prérequis

### 1. **Backend Local en Cours**
```bash
# Dans le dossier de votre backend
node server.js
# ou
npm start
```

### 2. **Vérifier la Configuration**
Le fichier `api/config.js` doit pointer vers votre backend local :
- **Android Emulator** : `http://10.0.2.2:3000`
- **iOS Simulator** : `http://localhost:3000`
- **Appareil physique** : `http://VOTRE_IP_LOCALE:3000`

## 🔍 Tests à Effectuer

### Test 1 : Vérification de la Connectivité
1. Ouvrez l'app
2. Allez sur un anime (ex: "The Rising OF The Shield Hero")
3. Cliquez sur le bouton **"Debug"** (rouge)
4. Vérifiez que :
   - `Épisodes chargés: 58` (ou plus)
   - `Épisodes filtrés: > 0`
   - `Backend: ✅ OK` ou `❌ Erreur`

### Test 2 : Lecture d'Épisode
1. Cliquez sur un épisode pour le lire
2. Observez les logs console :
   ```
   🎬 Tentative de lecture épisode: {...}
   🔍 Préparation du stream...
   📦 Données stream reçues: {...}
   ✅ Stream préparé: {...}
   ```

### Test 3 : Vérification des Headers
1. Dans le Player, vérifiez que les headers sont bien passés
2. Les URLs doivent avoir les bons headers (Referer, etc.)

## 🐛 Diagnostic des Problèmes

### ❌ **Erreur "Connection refused"**
**Cause :** Backend non démarré ou mauvaise URL
**Solution :**
```bash
# Vérifier que le backend tourne
curl http://localhost:3000/health
```

### ❌ **Erreur "Episode non trouvé"**
**Cause :** L'ID d'épisode ne correspond pas au format attendu
**Solution :** Vérifier le format des IDs dans Firebase

### ❌ **Erreur "Aucun stream disponible"**
**Cause :** Les URLs dans Firebase sont invalides
**Solution :** Vérifier les URLs dans la collection `animesDetails`

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

### Échec avec Fallback
```
💥 Erreur critique lecture: Connection refused
🔄 Tentative avec l'ancien backend...
✅ URL extraite: https://...
```

## 🔧 Configuration Avancée

### Pour Appareil Physique
Modifiez `api/config.js` :
```javascript
new: isDevelopment 
  ? 'http://192.168.1.100:3000' // Votre IP locale
  : 'https://votre-backend-prod.com'
```

### Variables d'Environnement
Créez un fichier `.env` :
```env
BACKEND_URL=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT={"type": "service_account", ...}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## ✅ Checklist de Validation

- [ ] Backend local démarré sur le port 3000
- [ ] Endpoint `/health` répond
- [ ] Endpoint `/api/stream/prepare` fonctionne
- [ ] App charge les épisodes (58 pour Shield Hero)
- [ ] Lecture d'épisode fonctionne
- [ ] Player reçoit les bonnes URLs
- [ ] Headers sont passés correctement
- [ ] Fallback vers l'ancien backend si nécessaire

## 🆘 En Cas de Problème

1. **Vérifiez les logs du backend** :
   ```bash
   # Dans le terminal du backend
   tail -f logs/error.log
   ```

2. **Testez l'API directement** :
   ```bash
   curl -X POST http://localhost:3000/api/stream/prepare \
     -H "Content-Type: application/json" \
     -d '{"episodeId":"test-episode","language":"VOSTFR"}'
   ```

3. **Vérifiez la configuration réseau** :
   ```bash
   # Test de connectivité
   ping localhost
   telnet localhost 3000
   ```

## 📱 Test sur Appareil Physique

Si vous testez sur un appareil physique :

1. **Trouvez votre IP locale** :
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. **Modifiez la configuration** :
   ```javascript
   new: 'http://192.168.1.100:3000' // Votre IP
   ```

3. **Vérifiez le firewall** :
   - Port 3000 doit être ouvert
   - Backend doit écouter sur `0.0.0.0:3000`

## 🎉 Succès !

Si tout fonctionne, vous devriez voir :
- Les épisodes se chargent rapidement
- La lecture démarre sans erreur
- Le Player affiche la vidéo
- Les logs montrent le nouveau backend utilisé
