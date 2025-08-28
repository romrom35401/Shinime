import scraper from '../utils/scraper.js';

(async () => {
  const slug = await scraper.findAnimeSamaSlugByTitle("Attack on Titan");
  console.log("Slug trouvé:", slug);

  if (slug) {
    const synopsis = await scraper.fetchAnimeSamaSynopsis(slug);
    console.log("Synopsis VF:", synopsis);

    const details = await scraper.getAnimeDetailsFromAnimeSama(slug, { fetchEpisodeThumbs: true });
    console.log("Détails saisons/épisodes:", details);
  }
})();
