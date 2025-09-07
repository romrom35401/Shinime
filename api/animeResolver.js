// animeResolver.js - Système de résolution vers l'anime de base

import { 
  findBestAnimeSamaMatch, 
  normalizeTitleForSeasonKey, 
  generateAliases 
} from './api';
import { db } from './firebaseConfig';
import { doc, getDoc, collection, getDocs, query, where, limit as qLimit } from 'firebase/firestore';

/**
 * Nettoie un titre pour trouver la version de base (sans saisons, films, etc.)
 */
function extractBaseTitle(title) {
  if (!title) return '';
  
  let baseTitle = String(title).trim();
  
  // Enlever les indicateurs de saison/partie
  baseTitle = baseTitle
    .replace(/\s*[:\-–—]\s*(saison|season|part|partie|cour|arc)\s*\d+.*$/gi, '')
    .replace(/\s*[:\-–—]\s*(2nd|3rd|4th|final).*$/gi, '')
    .replace(/\s*\b(saison|season|part|partie|cour|arc)\s*\d+\b.*$/gi, '')
    .replace(/\s*\b(s|season)\s*[2-9]\d*\b.*$/gi, '')
    .replace(/\s*\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b.*$/gi, '')
    
    // Enlever les indicateurs de films/OVA/spéciaux
    .replace(/\s*[:\-–—]\s*(movie|film|ova|special|ona).*$/gi, '')
    .replace(/\s*\((movie|film|ova|special|ona).*?\)$/gi, '')
    
    // Enlever les années
    .replace(/\s*\(?\d{4}\)?$/g, '')
    
    // Enlever les extensions communes
    .replace(/\s*[:\-–—]\s*(brotherhood|shippuuden|kai|crystal|z|super|after\s*story|next\s*generations|remake|reboot|shin|neo|new).*$/gi, '')
    
    // Nettoyer
    .replace(/[:\-–—_]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  return baseTitle;
}

/**
 * Détermine si un anime est probablement l'entrée de base d'une franchise
 */
function isBaseEntry(anime) {
  const title = anime.title || anime.title_en || anime.title_romaji || '';
  const titleLower = title.toLowerCase();
  
  // Vérifications pour les entrées NON-base
  const nonBaseIndicators = [
    // Saisons
    /\b(season|saison|s)\s*[2-9]\d*\b/i,
    /\b(2nd|3rd|4th|5th|6th|7th|8th|9th)\b/i,
    /\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b(?=\s|$)/i,
    
    // Films et spéciaux
    /\b(movie|film|ova|special|ona)\b/i,
    
    // Extensions
    /\b(brotherhood|shippuuden|kai|crystal|z|super|after\s*story|next\s*generations|remake|reboot)\b/i,
    
    // Indicateurs de continuation
    /\b(part|partie|cour|arc)\s*[2-9]\b/i,
    /\b(final|last|end)\b/i
  ];
  
  // Si le titre contient des indicateurs non-base, ce n'est pas l'entrée de base
  if (nonBaseIndicators.some(pattern => pattern.test(titleLower))) {
    return false;
  }
  
  // Vérifications positives pour les entrées de base
  const format = anime.format || anime.type || '';
  const isTV = format.toUpperCase() === 'TV';
  const hasHighPopularity = (anime.popularity || 0) > 1000;
  
  // Bonus si c'est TV format et populaire
  return isTV || hasHighPopularity;
}

/**
 * Score un anime pour déterminer sa priorité comme entrée de base
 */
function scoreAsBaseCandidate(anime) {
  let score = 0;
  const title = anime.title || anime.title_en || anime.title_romaji || '';
  const titleLower = title.toLowerCase();
  
  // Pénalités pour les non-base
  if (/\b(season|saison|s)\s*[2-9]\d*\b/i.test(titleLower)) score -= 100;
  if (/\b(movie|film|ova|special)\b/i.test(titleLower)) score -= 50;
  if (/\b(brotherhood|shippuuden|kai|crystal|z|super)\b/i.test(titleLower)) score -= 30;
  if (/\b(part|partie|cour)\s*[2-9]\b/i.test(titleLower)) score -= 80;
  
  // Bonus pour les caractéristiques de base
  const format = (anime.format || anime.type || '').toUpperCase();
  if (format === 'TV') score += 50;
  if (format === 'TV_SHORT') score += 30;
  
  // Bonus pour la popularité
  const popularity = anime.popularity || 0;
  score += Math.min(popularity / 100, 50);
  
  // Bonus pour le score
  const avgScore = anime.averageScore || 0;
  score += avgScore / 10;
  
  // Bonus pour l'année (plus récent = mieux, mais pas trop)
  const year = anime.seasonYear || anime.startDate?.year || 0;
  if (year > 2000) {
    score += Math.min((year - 2000) / 2, 10);
  }
  
  return score;
}

/**
 * Trouve l'anime de base pour un anime donné
 */
export async function resolveToBaseAnime(anime) {
  try {
    console.log('🔍 Résolution de l\'anime de base pour:', anime.title);
    
    // Si c'est déjà probablement l'anime de base, le retourner
    if (isBaseEntry(anime)) {
      console.log('✅ Déjà l\'anime de base');
      return anime;
    }
    
    // Extraire le titre de base
    const baseTitle = extractBaseTitle(anime.title || anime.title_en || anime.title_romaji);
    console.log('📝 Titre de base extrait:', baseTitle);
    
    if (!baseTitle) {
      console.log('⚠️ Impossible d\'extraire le titre de base');
      return anime;
    }
    
    // Générer des variantes de recherche
    const searchVariants = [
      baseTitle,
      extractBaseTitle(anime.title_en),
      extractBaseTitle(anime.title_romaji),
      ...generateAliases(baseTitle).slice(0, 5), // Limiter pour éviter trop de requêtes
    ].filter(Boolean);
    
    console.log('🔍 Variantes de recherche:', searchVariants);
    
    // Chercher dans Firestore (collection animes)
    const candidates = [];
    
    // Recherche par titre normalisé
    for (const variant of searchVariants.slice(0, 3)) { // Limiter les requêtes
      try {
        const normalized = normalizeTitleForSeasonKey(variant);
        if (normalized) {
          const q = query(
            collection(db, 'animes'),
            where('normalized', '==', normalized),
            qLimit(5)
          );
          
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            const data = doc.data();
            candidates.push({
              id: doc.id,
              source: 'firestore',
              ...data,
              _firestoreScore: scoreAsBaseCandidate(data)
            });
          });
        }
      } catch (error) {
        console.warn('Erreur recherche Firestore:', error);
      }
    }
    
    // Recherche par titlesAll (si disponible)
    try {
      const q = query(
        collection(db, 'animes'),
        where('titlesAll', 'array-contains-any', searchVariants.slice(0, 10)),
        qLimit(10)
      );
      
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const data = doc.data();
        // Éviter les doublons
        if (!candidates.some(c => c.id === doc.id)) {
          candidates.push({
            id: doc.id,
            source: 'firestore',
            ...data,
            _firestoreScore: scoreAsBaseCandidate(data)
          });
        }
      });
    } catch (error) {
      console.warn('Erreur recherche titlesAll:', error);
    }
    
    console.log('📋 Candidats trouvés:', candidates.length);
    
    // Si on a des candidats, choisir le meilleur
    if (candidates.length > 0) {
      // Trier par score (plus élevé = mieux)
      candidates.sort((a, b) => {
        const scoreA = a._firestoreScore || 0;
        const scoreB = b._firestoreScore || 0;
        return scoreB - scoreA;
      });
      
      const bestCandidate = candidates[0];
      console.log('🏆 Meilleur candidat:', bestCandidate.title, 'Score:', bestCandidate._firestoreScore);
      
      // Nettoyer les propriétés internes
      delete bestCandidate._firestoreScore;
      
      return bestCandidate;
    }
    
    // Fallback: utiliser le matching Anime-Sama
    console.log('🔄 Fallback vers Anime-Sama matching');
    const animeSamaMatch = findBestAnimeSamaMatch(baseTitle);
    
    if (animeSamaMatch && animeSamaMatch.score > 70) {
      console.log('🎯 Match Anime-Sama trouvé:', animeSamaMatch.id);
      
      // Chercher dans Firestore avec l'ID Anime-Sama
      try {
        const docRef = doc(db, 'animes', animeSamaMatch.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          console.log('✅ Document Firestore trouvé avec ID Anime-Sama');
          return {
            id: docSnap.id,
            ...docSnap.data(),
            source: 'anime-sama-match'
          };
        }
      } catch (error) {
        console.warn('Erreur récupération doc Anime-Sama:', error);
      }
    }
    
    // Si rien n'est trouvé, retourner l'anime original
    console.log('🤷 Aucun anime de base trouvé, retour à l\'original');
    return anime;
    
  } catch (error) {
    console.error('❌ Erreur résolution anime de base:', error);
    return anime; // Fallback vers l'anime original
  }
}

/**
 * Middleware pour la navigation - résout automatiquement vers l'anime de base
 */
export function createNavigateToAnimeDetails(navigation) {
  return async (anime) => {
    try {
      console.log('🚀 Navigation vers détails anime:', anime.title);
      
      // Résoudre vers l'anime de base
      const baseAnime = await resolveToBaseAnime(anime);
      
      // Naviguer vers les détails avec l'anime résolu
      navigation.navigate('AnimeDetails', { anime: baseAnime });
      
    } catch (error) {
      console.error('❌ Erreur navigation anime:', error);
      // Fallback: naviguer avec l'anime original
      navigation.navigate('AnimeDetails', { anime });
    }
  };
}

/**
 * Hook pour utiliser la résolution d'anime dans les composants
 */
export function useAnimeResolver(navigation) {
  const navigateToAnimeDetails = createNavigateToAnimeDetails(navigation);
  
  return {
    navigateToAnimeDetails,
    resolveToBaseAnime,
  };
}