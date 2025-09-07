// api/firestoreService.ts
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from './firebaseConfig';

const CANONICAL_COLLECTION = 'animes_canonical';
const ALIASES_COLLECTION = 'anime_aliases';

// Interface pour représenter les données d'un anime
interface AnimeData {
  id: string;
  [key: string]: any; // Permet d'autres champs
}

/**
 * Recherche l'ID canonique d'un anime en utilisant une liste de clés d'alias.
 * Interroge la collection `anime_aliases` de manière efficace.
 * @param searchKeys - Un tableau de clés de recherche (slugs) générées par FranchiseResolver.
 * @returns L'ID canonique trouvé, ou null si aucune correspondance.
 */
export async function findCanonicalIdByAliases(searchKeys: string[]): Promise<string | null> {
  if (!searchKeys || searchKeys.length === 0) {
    return null;
  }
  
  try {
    // Firestore limite les requêtes 'in' à 30 valeurs.
    // Si nécessaire, nous pouvons diviser en plusieurs requêtes.
    const q = query(
      collection(db, ALIASES_COLLECTION), 
      where('alias', 'in', searchKeys.slice(0, 30)),
      limit(1) // On n'a besoin que d'une seule correspondance pour trouver l'ID.
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const canonicalId = doc.data().canonicalId;
      console.log(`✅ ID Canonique trouvé via alias '${doc.id}': ${canonicalId}`);
      return canonicalId;
    }
    
    console.log("ℹ️ Aucun alias trouvé dans la première tentative.");
    return null;

  } catch (error) {
    console.error("❌ Erreur lors de la recherche d'alias dans Firestore:", error);
    return null;
  }
}

/**
 * Récupère les détails complets d'un anime à partir de la collection canonique
 * en utilisant son ID canonique.
 * @param canonicalId - L'ID canonique de l'anime.
 * @returns Les données complètes de l'anime, ou null si non trouvé.
 */
export async function getAnimeDetails(canonicalId: string): Promise<AnimeData | null> {
  if (!canonicalId) return null;

  try {
    const docRef = doc(db, CANONICAL_COLLECTION, canonicalId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log(`✅ Données complètes récupérées pour: ${canonicalId}`);
      return { id: docSnap.id, ...docSnap.data() } as AnimeData;
    } else {
      console.warn(`⚠️ Document non trouvé dans ${CANONICAL_COLLECTION} pour l'ID: ${canonicalId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des détails de l'anime (${canonicalId}):`, error);
    return null;
  }
}