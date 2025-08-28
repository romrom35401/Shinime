// src/providers/DemoProvider.js
// Exemple de provider LÉGAL de démonstration :
// - recherche par titre
// - renvoie une liste d'épisodes normalisés avec plusieurs qualités HLS
// - sous-titres (externe, VTT) en option


const ORANGE = "#f47521";


function minutes(n) { return Math.max(1, Math.floor(Number(n) || 0)); }


export async function searchByTitle(title) {
// Ici, à la place d'un scraper, fais appel à TON backend ou à ta base de données
// qui te renvoie un identifiant d'œuvre et la liste d'épisodes autorisés.
// Pour la démo, on se contente de générer des épisodes mockés.


const poster = 'https://via.placeholder.com/600x900/111/fff?text=' + encodeURIComponent(title);


const episodes = Array.from({ length: 12 }, (_, i) => ({
id: i + 1,
number: i + 1,
title: `${title} — Épisode ${i + 1}`,
duration: minutes(24) * 60, // 24 min
thumbnail: poster,
date: Date.now() - i * 86400000,
streams: {
// Remplace par tes propres URLs HLS autorisées
auto: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
'1080p': 'https://test-streams.mux.dev/pts_shift/master.m3u8',
'720p': 'https://test-streams.mux.dev/tears_of_steel/playlist.m3u8',
},
subtitles: [
{ lang: 'fr', label: 'Français', type: 'text/vtt', uri: 'https://example.com/subs/ep' + (i + 1) + '.fr.vtt' },
],
}));


return {
id: 'demo:' + title.toLowerCase().replace(/\s+/g, '-'),
title,
episodes,
poster,
};
}


export default { searchByTitle };