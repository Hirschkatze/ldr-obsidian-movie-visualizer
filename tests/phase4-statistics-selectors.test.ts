import { describe, expect, it } from "vitest";
import {
	buildDecadeStats,
	buildExternalRatingStats,
	buildGenreStats,
	buildPersonalRatingStats,
	buildStatsSummary,
	buildWatchStatusStats,
} from "../src/phase4/statisticsSelectors";
import { movie, series } from "./phase2-fixtures";

describe("Phase-4C-Statistik-Selectoren", () => {
	it("berechnet die Kennzahlen und ignoriert Nullbewertungen im Durchschnitt", () => {
		const items = [
			movie({ id: "Movies/A.md", favorite: true, watchStatus: "completed", personalRating: 8 }),
			movie({ id: "Movies/B.md", favorite: false, watchStatus: "planned", personalRating: 0 }),
			series({ id: "Series/A.md", favorite: true, watchStatus: "watching", personalRating: 6 }),
		];
		expect(buildStatsSummary(items, "all")).toEqual({
			totalCount: 3, movieCount: 2, seriesCount: 1, favoriteCount: 2,
			completedCount: 1, plannedCount: 1, ratedCount: 2, averagePersonalRating: 7,
		});
		const movies = buildStatsSummary(items, "movie");
		expect(movies.totalCount).toBe(2);
		expect(movies.movieCount).toBe(2);
		expect(movies.seriesCount).toBe(0);
		expect(movies.averagePersonalRating).toBe(8);
	});

	it("behandelt einen leeren Datenbestand ohne künstliche Durchschnittswerte", () => {
		const summary = buildStatsSummary([], "all");
		expect(summary.totalCount).toBe(0);
		expect(summary.ratedCount).toBe(0);
		expect(summary.averagePersonalRating).toBeUndefined();
	});

	it("zählt ein Genre je Medium höchstens einmal und berechnet Anteil sowie relative Balkenlänge", () => {
		const stats = buildGenreStats([
			movie({ id: "Movies/A.md", genres: ["Drama", "Drama", "Sci-Fi"] }),
			series({ id: "Series/A.md", genres: ["Drama"] }),
		], "all");
		expect(stats.map(({ label, count }) => ({ label, count }))).toEqual([
			{ label: "Drama", count: 2 },
			{ label: "Sci-Fi", count: 1 },
		]);
		expect(stats[0].sharePercent).toBe(100);
		expect(stats[0].barPercent).toBe(100);
		expect(stats[1].sharePercent).toBe(50);
		expect(stats[1].barPercent).toBe(50);
	});

	it("sortiert Genre-Gleichstände alphabetisch und begrenzt auf zehn Einträge", () => {
		const genres = Array.from({ length: 12 }, (_, index) => `Genre ${String.fromCharCode(65 + index)}`);
		const stats = buildGenreStats([movie({ genres: [...genres].reverse() })], "all");
		expect(stats).toHaveLength(10);
		expect(stats.map((entry) => entry.label)).toEqual(genres.slice(0, 10));
	});

	it("aggregiert gültige Jahre chronologisch nach Jahrzehnt und trennt fehlende oder ungültige Jahre", () => {
		const stats = buildDecadeStats([
			movie({ id: "Movies/1994.md", year: 1994 }),
			movie({ id: "Movies/2000.md", year: 2000 }),
			series({ id: "Series/2026.md", year: 2026 }),
			movie({ id: "Movies/Ohne.md", year: undefined }),
			series({ id: "Series/Ungueltig.md", year: Number.NaN }),
		], "all");
		expect(stats.entries.map((entry) => entry.label)).toEqual(["1990er", "2000er", "2020er"]);
		expect(stats.withoutYearCount).toBe(2);
		expect(stats.withoutYear?.label).toBe("Ohne Jahr");
	});

	it("gruppiert die geforderten Bewertungsgrenzen und schließt Null aus", () => {
		const values = [0, 0.5, 2, 2.5, 8.5, 10];
		const stats = buildPersonalRatingStats(values.map((personalRating, index) => movie({ id: `Movies/${index}.md`, personalRating })), "all");
		expect(stats.count).toBe(5);
		expect(stats.buckets.map((bucket) => bucket.count)).toEqual([2, 1, 0, 0, 2]);
		expect(stats.minimum).toBe(0.5);
		expect(stats.maximum).toBe(10);
		expect(stats.median).toBe(2.5);
		expect(stats.average).toBeCloseTo(4.7);
	});

	it("berechnet den Median für eine gerade und eine ungerade Anzahl deterministisch", () => {
		const even = buildPersonalRatingStats([1, 2, 8, 9].map((personalRating, index) => movie({ id: `Movies/E${index}.md`, personalRating })), "all");
		const odd = buildPersonalRatingStats([1, 5, 10].map((personalRating, index) => movie({ id: `Movies/O${index}.md`, personalRating })), "all");
		expect(even.median).toBe(5);
		expect(odd.median).toBe(5);
	});

	it("ignoriert fehlende und Nullwerte bei externen Durchschnitten und zählt gültige Werte", () => {
		const stats = buildExternalRatingStats([
			movie({ id: "Movies/A.md", personalRating: 8, imdbRating: 7, tmdbRating: undefined }),
			movie({ id: "Movies/B.md", personalRating: 0, imdbRating: 0, tmdbRating: 6 }),
			series({ id: "Series/A.md", personalRating: 6, imdbRating: undefined, tmdbRating: 8 }),
		], "all");
		expect(stats.personal).toEqual({ count: 2, average: 7 });
		expect(stats.imdb).toEqual({ count: 1, average: 7 });
		expect(stats.tmdb).toEqual({ count: 2, average: 7 });
	});

	it("ordnet vorhandene Sichtungsstatus nach der kanonischen Reihenfolge", () => {
		const stats = buildWatchStatusStats([
			movie({ id: "Movies/Dropped.md", watchStatus: "dropped" }),
			movie({ id: "Movies/Completed.md", watchStatus: "completed" }),
			series({ id: "Series/Planned.md", watchStatus: "planned" }),
		], "all");
		expect(stats.map((entry) => entry.status)).toEqual(["planned", "completed", "dropped"]);
		for (const entry of stats) expect(entry.sharePercent).toBeCloseTo(100 / 3);
	});
});
