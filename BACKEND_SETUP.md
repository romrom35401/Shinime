# 🔧 Configuration du Backend

## 🎯 Problème Actuel
Les deux backends pointent vers la même URL : `https://video-extractor-wqlx.onrender.com`

## ✅ Solution

### 1. **Trouver votre URL Render**
1. Allez sur [render.com](https://render.com)
2. Connectez-vous à votre compte
3. Trouvez votre service backend
4. Copiez l'URL (ex: `https://mon-backend-abc123.onrender.com`)

### 2. **Mettre à jour la configuration**
Dans le fichier `api/config.js`, ligne 14 :

```javascript
// Avant
new: 'https://video-extractor-wqlx.onrender.com',

// Après (remplacez par votre vraie URL)
new: 'https://VOTRE-BACKEND-REEL.onrender.com',
```

### 3. **Vérifier que votre backend fonctionne**
Testez votre backend directement :

```bash
# Test de santé
curl https://VOTRE-BACKEND-REEL.onrender.com/health

# Test d'extraction
curl https://VOTRE-BACKEND-REEL.onrender.com/api/extract?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## 🔍 Diagnostic

### Si vous ne trouvez pas votre URL Render :
1. Vérifiez que votre backend est déployé
2. Vérifiez qu'il n'est pas en pause (gratuit)
3. Regardez les logs dans Render

### Si votre backend ne répond pas :
1. Vérifiez les variables d'environnement
2. Vérifiez que Firebase est configuré
3. Regardez les logs d'erreur

## 📝 Exemple de Configuration Complète

```javascript
// api/config.js
export const BACKEND_CONFIG = {
  // Ancien backend (fallback)
  legacy: 'https://video-extractor-wqlx.onrender.com',
  
  // Votre nouveau backend
  new: 'https://mon-backend-abc123.onrender.com',
  
  // Timeouts
  timeout: {
    health: 5000,
    extract: 15000,
    stream: 20000
  }
};
```

## 🚀 Après la Configuration

1. **Redémarrez l'app** : `npx expo start --clear`
2. **Testez** : Cliquez sur le bouton "Debug" dans l'app
3. **Vérifiez** : Les deux backends doivent avoir des URLs différentes
