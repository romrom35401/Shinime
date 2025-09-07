// franchiseGrouper.js
// Fonction autonome pour regrouper une liste d'animes (format AniList GraphQL) par franchise
// Stratégie :
// 1) Construire un graphe non orienté à partir des relations (relations.edges[].node.id) pour les items
//    présents dans la liste (on n'essaie pas d'aller chercher des noeuds externes à la page AniList).
// 2) Trouver les composantes connexes (union-find). Chaque composante = une franchise potentielle.
// 3) Choisir un représentant pour la franchise selon un score heuristique (non-adult, format TV, année, popularité...)
// 4) Produire un tableau d'objets "franchise" minimal et compatible avec l'affichage (id, sourceId, title, images, count...)

export function groupByFranchiseUsingRelations(animeList = []) {
  if (!Array.isArray(animeList)) return [];
  // Map id -> anime
  const idMap = new Map();
  animeList.forEach(a => { if (a && a.id) idMap.set(Number(a.id), a); });

  // union-find (disjoint-set)
  const parent = Object.create(null);
  function find(x) {
    if (parent[x] == null) parent[x] = x;
    return parent[x] === x ? x : (parent[x] = find(parent[x]));
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    parent[rb] = ra;
  }

  // Build unions only for relations pointing to nodes that are present in the list
  animeList.forEach(a => {
    const edges = (a && a.relations && a.relations.edges) || [];
    for (const edge of edges) {
      const node = edge && edge.node;
      if (!node || typeof node.id === 'undefined') continue;
      const nid = Number(node.id);
      if (idMap.has(nid) && a.id !== nid) {
        union(Number(a.id), nid);
      }
    }
  });

  // For any unreachable singletons (no relations) ensure they have a representative
  animeList.forEach(a => { if (a && a.id) find(Number(a.id)); });

  // Group by root
  const groups = new Map();
  animeList.forEach(a => {
    if (!a || typeof a.id === 'undefined') return;
    const root = find(Number(a.id));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(a);
  });

  // Scoring function to pick the best representative in a group
  function scoreItem(item = {}) {
    let score = 0;
    // Prefer non-adult
    if (!item.isAdult) score += 5000;
    // Format preference (TV > TV_SHORT > ONA > MOVIE > OVA > SPECIAL)
    const pref = { TV: 3000, TV_SHORT: 2600, ONA: 2200, MOVIE: 2000, OVA: 1800, SPECIAL: 1600 };
    score += pref[item.format] || 0;
    // Average score and popularity
    score += (item.averageScore || 0) * 10;
    score += Math.min(item.popularity || 0, 10000) / 2;
    // Earliest seasonYear preferred (lower value -> earlier)
    const year = item.seasonYear || (item.startDate && item.startDate.year) || 9999;
    score += (2000 - Math.min(year, 2000)); // earlier years get slightly more
    return score;
  }

  // Helper to build a consistent small object for UI
  function buildRepresentative(rep, items) {
    const titleObj = rep && rep.title ? rep.title : {};
    const title = titleObj.english || titleObj.romaji || titleObj.native || (rep.name || 'Sans titre');
    const poster = (rep.coverImage && (rep.coverImage.extraLarge || rep.coverImage.large || rep.coverImage.medium)) || null;
    const banner = rep.bannerImage || poster || null;

    const normalizedKey = (title || '')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    return {
      id: `AL-${rep.id}-${normalizedKey}`,
      sourceId: rep.id,
      source: 'anilist',
      title: title,
      title_en: titleObj.english,
      title_romaji: titleObj.romaji,
      description: rep.description || '',
      posterImage: poster,
      bannerImage: banner,
      genres: rep.genres || [],
      averageScore: rep.averageScore,
      popularity: rep.popularity,
      franchiseCount: items.length,
      rawItems: items,
    };
  }

  // Build result array
  const result = [];
  for (const items of groups.values()) {
    // Filter unacceptable items optionally here if needed
    const sorted = items.slice().sort((a, b) => scoreItem(b) - scoreItem(a));
    const rep = sorted[0];
    result.push(buildRepresentative(rep, items));
  }

  // Sort franchises by popularity (desc) then by franchiseCount
  result.sort((a, b) => (b.popularity || 0) - (a.popularity || 0) || b.franchiseCount - a.franchiseCount);
  return result;
}

// Utility: simple parent-child filter (optionnel)
// Cette fonction suit l'idée que tu as proposée : si un item a une relation de type PREQUEL / PARENT / ADAPTATION
// vers un autre item, on considère cet item comme faisant partie d'une franchise et on peut le marquer pour exclusion.
export function filterKeepOnlyParents(animeList = []) {
  const idsToExclude = new Set();
  animeList.forEach(anime => {
    const edges = (anime && anime.relations && anime.relations.edges) || [];
    edges.forEach(rel => {
      const t = rel && rel.relationType;
      if (!t) return;
      if (["PREQUEL", "PARENT", "ADAPTATION"].includes(t)) {
        idsToExclude.add(anime.id);
      }
    });
  });
  return animeList.filter(a => !idsToExclude.has(a.id));
}

/*
  Integration notes (à lire) :
  1) Pour que cette méthode fonctionne, il faut demander le champ `relations` dans votre requête GraphQL AniList.
     Exemple (dans la même query que vos autres champs `media` -> ajoutez) :

     relations {
       edges {
         relationType
         node {
           id
           title { romaji english native }
           format
           seasonYear
           coverImage { extraLarge large medium }
           bannerImage
           popularity
           isAdult
         }
       }
     }

  2) Dans votre fetch (api.js), après avoir fait `const media = data?.data?.Page?.media || []`, vous pouvez faire :

     import { groupByFranchiseUsingRelations } from './franchiseGrouper';
     const grouped = media && media.length && media[0].relations ?
                     groupByFranchiseUsingRelations(media) :
                     groupAnimeByFranchiseClean(media); // fallback existant

  3) Cette implémentation ne va pas chercher des infos externes (pas de requêtes supplémentaires vers AniList). On ne regroupe
     que les éléments présents dans la `media` renvoyée par la query. Si vous voulez inclure des items liés absents de la page,
     il faudra faire des requêtes supplémentaires pour récupérer ces noeuds.

  4) Tests : j'ai inclus des cas robustes (singleton, items sans relations, relations vers items hors-liste), la fonction
     retourne toujours un tableau d'objets "franchise" prêt à être affiché.
*/
