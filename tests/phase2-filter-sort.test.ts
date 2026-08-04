import { describe, expect, it } from "vitest";
import type { MediaItem } from "../src/types";
import { filterMedia } from "../src/phase2/filter";
import { sortMedia } from "../src/phase2/sort";
import { DEFAULT_CATALOG_FILTER, type MediaSortKey } from "../src/phase2/types";
import { movie, series } from "./phase2-fixtures";

describe("Phase-2-Katalogfilter", () => {
	const items = [movie(), series()];

	it.each([
		["all", 2],
		["movie", 1],
		["series", 1],
	] as const)("filtert den Medientyp %s", (mediaType, count) => {
		expect(filterMedia(items, { ...DEFAULT_CATALOG_FILTER, mediaType })).toHaveLength(count);
	});

	it("kombiniert mehrere Filter", () => {
		const result = filterMedia(items, {
			...DEFAULT_CATALOG_FILTER,
			mediaType: "movie",
			genre: "Drama",
			watchStatus: "completed",
			favorite: "favorites",
			yearFrom: 2019,
			yearTo: 2021,
			personalRatingMin: 8.5,
			imdbRatingMin: 8,
			tmdbRatingMin: 8,
			runtime: "90to150",
			person: "Anna",
			cast: "Maria Müller",
			releaseStatus: "veröffentlicht",
		});
		expect(result.map((item) => item.id)).toEqual(["Movies/Ära.md"]);
	});

	it("trennt film- und serienspezifische Laufzeitfilter", () => {
		expect(filterMedia(items, { ...DEFAULT_CATALOG_FILTER, runtime: "90to150" })).toEqual([items[0]]);
	});

	it("filtert Regie beziehungsweise Serienschöpfer:innen", () => {
		expect(filterMedia(items, { ...DEFAULT_CATALOG_FILTER, person: "Sören" })).toEqual([items[1]]);
	});
});

describe("Phase-2-Sortierung", () => {
	const keys: MediaSortKey[] = [
		"title", "year", "personal-rating", "imdb-rating", "tmdb-rating", "runtime",
		"last-watched", "watch-count", "season-count", "episode-count", "created",
	];

	it.each(keys)("unterstützt %s auf- und absteigend", (key) => {
		const items: MediaItem[] = [movie(), series()];
		expect(sortMedia(items, { key, direction: "asc" })).toHaveLength(2);
		expect(sortMedia(items, { key, direction: "desc" })).toHaveLength(2);
	});

	it.each(["personal-rating", "runtime", "last-watched", "watch-count"] as MediaSortKey[])(
		"stellt fehlende oder nicht anwendbare Werte bei %s auch absteigend ans Ende",
		(key) => {
			const present = movie();
			const missing = series();
			expect(sortMedia([missing, present], { key, direction: "desc" })[1]).toBe(missing);
		}
	);

	it("stellt fehlende Serienwerte bei Seriensortierung ans Ende", () => {
		const present = series();
		const missing = series({ id: "Series/Leer.md", seasonCount: undefined, episodeCount: undefined });
		expect(sortMedia([missing, present], { key: "season-count", direction: "asc" })[1]).toBe(missing);
		expect(sortMedia([missing, present], { key: "episode-count", direction: "desc" })[1]).toBe(missing);
	});
});

