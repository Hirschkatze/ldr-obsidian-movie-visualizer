import { describe, expect, it } from "vitest";
import {
	buildDurationStats,
	buildGenreStats,
	buildPersonalRatingStats,
	buildTopCastStats,
	buildTopDirectorStats,
	buildWatchStatusStats,
	buildDecadeStats,
	formatLongDuration,
} from "../src/phase4/statisticsSelectors";
import { movie, person, series } from "./phase2-fixtures";

describe("Phase-4C.1-Zeitformatierung", () => {
	it.each([
		[0, "0 Min."],
		[59, "59 Min."],
		[60, "1 Std."],
		[61, "1 Std. · 1 Min."],
		[24 * 60, "1 Tag"],
		[30 * 24 * 60, "1 Monat"],
		[365 * 24 * 60, "1 Jahr"],
		[365 * 24 * 60 + 3 * 30 * 24 * 60 + 23 * 24 * 60 + 7 * 60 + 35, "1 Jahr · 3 Monate · 23 Tage · 7 Std. · 35 Min."],
	])("formatiert %i Minuten mit festen Einheiten", (minutes, expected) => {
		expect(formatLongDuration(minutes)).toBe(expected);
	});

	it("lässt Null-Einheiten aus und verwendet korrekten deutschen Plural", () => {
		expect(formatLongDuration(2 * 365 * 24 * 60 + 2 * 30 * 24 * 60 + 2 * 24 * 60)).toBe("2 Jahre · 2 Monate · 2 Tage");
	});
});

describe("Phase-4C.1-Laufzeitstatistik", () => {
	it("summiert Filmlaufzeiten und zählt nur abgeschlossene Filme als gesehen", () => {
		const stats = buildDurationStats([
			movie({ id: "Movies/Gesehen.md", runtimeMinutes: 142, watchStatus: "completed" }),
			movie({ id: "Movies/Geplant.md", runtimeMinutes: 100, watchStatus: "planned" }),
			movie({ id: "Movies/Ohne.md", runtimeMinutes: undefined, watchStatus: "completed" }),
		], "movie");
		expect(stats.totalMinutes).toBe(242);
		expect(stats.watchedMinutes).toBe(142);
		expect(stats.includedCount).toBe(2);
		expect(stats.missingMovieCount).toBe(1);
		expect(stats.missingCount).toBe(1);
	});

	it("berechnet Seriengesamtzeit und anteilige Guckzeit anhand gesehener Staffeln", () => {
		const stats = buildDurationStats([
			series({ seasonCount: 4, episodeCount: 40, episodeRuntimeMinutes: 50, watchedThroughSeason: 3, watchStatus: "watching" }),
		], "series");
		expect(stats.totalMinutes).toBe(2000);
		expect(stats.watchedMinutes).toBe(1500);
	});

	it("begrenzt den Serienfortschritt auf seasonCount und behandelt 0 ausdrücklich als ungesehen", () => {
		const over = buildDurationStats([
			series({ seasonCount: 4, episodeCount: 40, episodeRuntimeMinutes: 50, watchedThroughSeason: 8, watchStatus: "watching" }),
		], "series");
		const zero = buildDurationStats([
			series({ seasonCount: 4, episodeCount: 40, episodeRuntimeMinutes: 50, watchedThroughSeason: 0, watchStatus: "completed" }),
		], "series");
		expect(over.watchedMinutes).toBe(2000);
		expect(zero.watchedMinutes).toBe(0);
	});

	it("ignoriert unvollständige Seriendaten und teilt bei seasonCount 0 nicht durch Null", () => {
		const incomplete = buildDurationStats([
			series({ id: "Series/NoEpisodes.md", episodeCount: undefined, episodeRuntimeMinutes: 50 }),
			series({ id: "Series/NoRuntime.md", episodeCount: 40, episodeRuntimeMinutes: undefined }),
		], "series");
		const noSeasons = buildDurationStats([
			series({ seasonCount: 0, episodeCount: 40, episodeRuntimeMinutes: 50, watchedThroughSeason: 2, watchStatus: "watching" }),
		], "series");
		expect(incomplete.totalMinutes).toBe(0);
		expect(incomplete.missingSeriesCount).toBe(2);
		expect(noSeasons.totalMinutes).toBe(2000);
		expect(noSeasons.watchedMinutes).toBe(0);
	});

	it("verwendet für vollständig gesehene Serien ohne Fortschrittswert den kanonischen Status-Fallback", () => {
		const stats = buildDurationStats([
			series({ seasonCount: 4, episodeCount: 40, episodeRuntimeMinutes: 50, watchedThroughSeason: undefined, watchStatus: "completed" }),
		], "series");
		expect(stats.totalMinutes).toBe(2000);
		expect(stats.watchedMinutes).toBe(2000);
	});
});

describe("Phase-4C.1-Personenrankings", () => {
	it("zählt Cast pro Medium einmal, sortiert deterministisch und beachtet den Typfilter", () => {
		const alex = person("People/Alex", "Alex", "People/Alex.md");
		const berta = person("People/Berta", "Berta");
		const items = [
			movie({ id: "Movies/A.md", directors: [], writers: [], cast: [alex, alex, berta] }),
			movie({ id: "Movies/B.md", directors: [], writers: [], cast: [alex] }),
			series({ id: "Series/A.md", creators: [], cast: [berta] }),
		];
		const all = buildTopCastStats(items, "all");
		expect(all.map((entry) => [entry.person.display, entry.mediaCount])).toEqual([["Alex", 2], ["Berta", 2]]);
		expect(all[0].barPercent).toBe(100);
		expect(buildTopCastStats(items, "movie").map((entry) => [entry.person.display, entry.mediaCount])).toEqual([["Alex", 2], ["Berta", 1]]);
		expect(buildTopCastStats(items, "series").map((entry) => [entry.person.display, entry.mediaCount])).toEqual([["Berta", 1]]);
	});

	it("begrenzt Cast auf zehn Personen", () => {
		const cast = Array.from({ length: 12 }, (_, index) => person(`People/${index}`, `Person ${String(index).padStart(2, "0")}`));
		expect(buildTopCastStats([movie({ directors: [], writers: [], cast })], "all")).toHaveLength(10);
	});

	it("wertet für Regie ausschließlich directors aus und mischt creators nicht hinein", () => {
		const director = person("People/Director", "Director");
		const creator = person("People/Creator", "Creator");
		const rankings = buildTopDirectorStats([
			movie({ id: "Movies/A.md", directors: [director], writers: [], cast: [] }),
			movie({ id: "Movies/B.md", directors: [director], writers: [], cast: [] }),
			series({ creators: [creator], cast: [] }),
		], "all");
		expect(rankings.map((entry) => [entry.person.display, entry.mediaCount])).toEqual([["Director", 2]]);
		expect(buildTopDirectorStats([series({ creators: [creator], cast: [] })], "series")).toEqual([]);
	});

	it("begrenzt Regie auf zehn und verwendet Namen als Tie-Breaker", () => {
		const directors = Array.from({ length: 12 }, (_, index) => person(`People/${index}`, `Regie ${String.fromCharCode(76 - index)}`));
		const rankings = buildTopDirectorStats([movie({ directors, writers: [], cast: [] })], "all");
		expect(rankings).toHaveLength(10);
		expect(rankings[0].person.display.localeCompare(rankings[1].person.display, "de-DE")).toBeLessThan(0);
	});
});

describe("Phase-4C.1-Balkenbedeutung", () => {
	it("verwendet für Genres, Jahrzehnte und Status echte Anteile", () => {
		const items = [
			movie({ id: "Movies/1.md", genres: ["A", "B", "C"], year: 2020, watchStatus: "planned" }),
			movie({ id: "Movies/2.md", genres: ["A", "B"], year: 2021, watchStatus: "planned" }),
			movie({ id: "Movies/3.md", genres: ["A"], year: 2022, watchStatus: "planned" }),
			movie({ id: "Movies/4.md", genres: [], year: 1990, watchStatus: "planned" }),
			movie({ id: "Movies/5.md", genres: [], year: 1991, watchStatus: "planned" }),
		];
		const genres = buildGenreStats(items, "all");
		expect(genres.map((entry) => entry.barPercent)).toEqual([60, 40, 20]);
		const decades = buildDecadeStats(items, "all");
		expect(decades.entries.find((entry) => entry.label === "2020er")?.barPercent).toBe(60);
		expect(buildWatchStatusStats(items, "all")[0].barPercent).toBe(100);
	});

	it("skaliert persönliche Bewertungsbereiche weiterhin relativ zur häufigsten Klasse", () => {
		const stats = buildPersonalRatingStats([
			movie({ id: "Movies/1.md", personalRating: 1 }),
			movie({ id: "Movies/2.md", personalRating: 2 }),
			movie({ id: "Movies/3.md", personalRating: 3 }),
		], "all");
		expect(stats.buckets[0].barPercent).toBe(100);
		expect(stats.buckets[1].barPercent).toBe(50);
		expect(buildPersonalRatingStats([], "all").buckets.every((entry) => entry.barPercent === 0)).toBe(true);
	});
});

