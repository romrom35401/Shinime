# Refactor is not a bad idea

from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any

import httpx

from ..episode import Episode
from ..catalogue import Catalogue
from .utils import normalize


@dataclass(frozen=True)
class EpisodeWithExtraInfo:
    warpped: Episode
    release_date: datetime | None = None

    def release_year_parentheses(self) -> str:
        if self.release_date is None:
            return ""
        return f" ({self.release_date.year})"


def convert_with_extra_info(
    episode: Episode, serie: Catalogue | None = None
) -> EpisodeWithExtraInfo:
    release_date = get_serie_release_date(serie) if serie is not None else None
    return EpisodeWithExtraInfo(warpped=episode, release_date=release_date)


en2fr_genre = {
    "Comedy": "Comédie",
    "Gourmet": "Gastronomie",
    "Drama": "Drame",
    "Adventure": "Aventure",
    "Mystery": "Mystère",
    "Sci-Fi": "Science-fiction",
    "Sports": "Tournois",
    "Supernatural": "Surnaturel",
    "Girls Love": "Yuri",
    "Horror": "Horreur",
    "Fantasy": "Fantastique",
}


def get_serie_release_date(serie: Catalogue) -> datetime | None:
    try:
        anime = _get_mal_listing(serie)
        if anime is None:
            return None

        iso_date = anime.get("aired", {}).get("from")
        if iso_date is None:
            return None

        return datetime.fromisoformat(iso_date)
    except httpx.HTTPStatusError:
        return None


@lru_cache(maxsize=128)
def _get_mal_listing(serie: Catalogue) -> None | Any:
    if not serie.is_anime:
        return None

    for name in [serie.name] + list(serie.alternative_names):
        i = 0
        while True:
            response = httpx.get(f"https://api.jikan.moe/v4/anime?q={name}&limit=5")
            i += 1
            if response.status_code != 429 or i > 9:
                break

        response.raise_for_status()
        animes = response.json().get("data", [])

        for anime in animes:
            for title in anime.get("titles"):
                name = normalize(name)
                title = normalize(title.get("title"))
                anime_genres = [genre.get("name") for genre in anime.get("genres")]
                if name == title:
                    # Also guess work but eliminate edge case like fate
                    if len(anime_genres) == 0 and len(serie.genres) != 0:
                        continue

                    return anime
                if name in title or title in name:
                    # Because this condition is not a guarantee, we do an additionnal screenning base on corresponding genres
                    not_corresponding_genres = [
                        genre
                        for genre in anime_genres
                        if genre not in serie.genres
                        and en2fr_genre.get(genre) not in serie.genres
                    ]

                    # Very scientific formula. I'm joking it just guess work
                    if len(not_corresponding_genres) / len(anime_genres) < 0.35 and (
                        len(anime_genres) != 0 or len(serie.genres) == 0
                    ):
                        return anime

    return None
