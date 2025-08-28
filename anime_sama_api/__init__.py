import httpx
from .top_level import AnimeSama as _AnimeSama
from .catalogue import Catalogue
from .season import Season
from .episode import Episode, Languages, Players
from .langs import Lang, LangId, lang2ids, id2lang, flags

# Headers pour éviter les 403 Forbidden
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/114.0.0.0 Safari/537.36"
    ),
    "Referer": "https://anime-sama.fr/",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}

# Wrapper autour de AnimeSama qui force les headers
class AnimeSama(_AnimeSama):
    def __init__(self, base_url: str, client: httpx.AsyncClient = None):
        if client is None:
            client = httpx.AsyncClient(headers=DEFAULT_HEADERS)
        super().__init__(base_url, client=client)

try:
    from .cli.__main__ import main
    from .cli.downloader import download, multi_download
except ImportError:
    import sys

    def main() -> int:
        print(
            "This anime-sama_api function could not run because the required "
            "dependencies were not installed.\nMake sure you've installed "
            "everything with: pip install 'anime-sama_api[cli]'"
        )
        sys.exit(1)

    download = multi_download = main  # type: ignore

__all__ = [
    "AnimeSama",
    "Catalogue",
    "Season",
    "Players",
    "Languages",
    "Episode",
    "Lang",
    "LangId",
    "lang2ids",
    "id2lang",
    "flags",
    "download",
    "multi_download",
    "main",
]