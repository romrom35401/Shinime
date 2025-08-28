import asyncio
import json
from anime_sama_api import AnimeSama
from pathlib import Path
from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn

BASE_URL = "https://anime-sama.fr/"
OUTPUT_FILE = Path("anime_full.json")


async def main():
    anime_sama = AnimeSama(BASE_URL)
    catalogues = await anime_sama.all_catalogues()
    all_data = []

    progress = Progress(
        TextColumn("[bold blue]{task.fields[anime]}"),
        BarColumn(),
        TimeRemainingColumn()
    )

    with progress:
        task = progress.add_task("Processing", total=len(catalogues), anime="")

        for catalogue in catalogues:
            progress.update(task, anime=catalogue.name)
            try:
                seasons_list = await catalogue.seasons()
                seasons_data = []

                for season in seasons_list:
                    try:
                        episodes_list = await season.episodes()
                        episodes_data = []

                        for ep in episodes_list:
                            episodes_data.append({
                                "name": ep.name,
                                "index": ep.index,
                                "season_name": ep.season_name,
                                "links": list(ep.consume_player(["VOSTFR", "VF"])),
                                "release_date": None  # plus de extra info
                            })

                        seasons_data.append({
                            "name": season.name,
                            "episodes": episodes_data
                        })

                    except Exception as e:
                        print(f"Error with season {season.name}: {e}")
                        continue

                catalogue_data = {
                    "name": catalogue.name,
                    "url": catalogue.url,
                    "image": catalogue.image_url,
                    "genres": catalogue.genres,
                    "categories": list(catalogue.categories),
                    "languages": list(catalogue.languages),
                    "synopsis": await catalogue.synopsis(),
                    "seasons": seasons_data
                }

                all_data.append(catalogue_data)

            except Exception as e:
                print(f"Error with catalogue {catalogue.name}: {e}")
            finally:
                progress.advance(task)

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"Done! Data saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
