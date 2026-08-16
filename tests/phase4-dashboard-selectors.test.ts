import { describe, expect, it } from "vitest";
import {
	selectDashboardHero,
	selectFavorites,
	selectPlanned,
	selectRecentlyWatched,
	selectTopRated,
} from "../src/phase4/dashboardSelectors";
import { movie, series } from "./phase2-fixtures";

function film(title: string, overrides: Parameters<typeof movie>[0] = {}) {
	return movie({ id: `Movies/${title}.md`, title, favorite: false, personalRating: undefined, lastWatched: undefined, ...overrides });
}

function show(title: string, overrides: Parameters<typeof series>[0] = {}) {
	return series({ id: `Series/${title}.md`, title, favorite: false, personalRating: undefined, lastWatched: undefined, ...overrides });
}

describe("Phase-4A-Dashboard-Selektoren", () => {
	it("bevorzugt im Hero den zuletzt gesehenen Favoriten", () => {
		const older = film("Älter", { favorite: true, lastWatched: "2026-01-01", personalRating: 10 });
		const newer = show("Neuer", { favorite: true, lastWatched: "2026-07-20", personalRating: 6 });
		expect(selectDashboardHero([older, newer, film("Nicht favorisiert", { lastWatched: "2026-08-01" })], "all")).toBe(newer);
	});

	it("verwendet zuletzt gesehen, Bewertung und stabile Titelsortierung als gestufte Hero-Fallbacks", () => {
		const watched = film("Gesehen", { lastWatched: "2026-03-04", personalRating: 2 });
		expect(selectDashboardHero([film("Hoch", { personalRating: 10 }), watched], "all")).toBe(watched);
		const highest = film("Hoch", { personalRating: 9 });
		expect(selectDashboardHero([film("Niedrig", { personalRating: 3 }), highest], "all")).toBe(highest);
		expect(selectDashboardHero([film("Zulu"), film("Alpha")], "all")?.title).toBe("Alpha");
	});

	it("berücksichtigt im Hero den Movie- und Series-Typfilter", () => {
		const favoriteMovie = film("Film", { favorite: true, lastWatched: "2026-08-01" });
		const favoriteSeries = show("Serie", { favorite: true, lastWatched: "2026-08-02" });
		expect(selectDashboardHero([favoriteMovie, favoriteSeries], "movie")?.type).toBe("movie");
		expect(selectDashboardHero([favoriteMovie, favoriteSeries], "series")?.type).toBe("series");
	});

	it("liefert zuletzt gesehene Medien neueste zuerst und höchstens zehn", () => {
		const items = Array.from({ length: 12 }, (_, index) => film(`Film ${index}`, {
			lastWatched: `2026-07-${String(index + 1).padStart(2, "0")}`,
		}));
		items.push(film("Ohne Datum"));
		const selected = selectRecentlyWatched(items, "all");
		expect(selected).toHaveLength(10);
		expect(selected[0].lastWatched).toBe("2026-07-12");
		expect(selected.every((item) => item.lastWatched !== undefined)).toBe(true);
	});

	it("sortiert Favoriten nach persönlicher Bewertung und Titel", () => {
		const selected = selectFavorites([
			film("Zulu", { favorite: true, personalRating: 8 }),
			film("Alpha", { favorite: true, personalRating: 8 }),
			film("Beste", { favorite: true, personalRating: 9 }),
			film("Kein Favorit", { favorite: false, personalRating: 10 }),
		], "all");
		expect(selected.map((item) => item.title)).toEqual(["Beste", "Alpha", "Zulu"]);
	});

	it("liefert nur bewertete Medien absteigend", () => {
		const selected = selectTopRated([
			film("Unbewertet"), film("Null", { personalRating: 0 }),
			film("Acht", { personalRating: 8 }), film("Neun", { personalRating: 9 }),
		], "all");
		expect(selected.map((item) => item.title)).toEqual(["Neun", "Acht"]);
		expect(selected.every((item) => (item.personalRating ?? 0) > 0)).toBe(true);
	});

	it("liefert geplante Medien alphabetisch und verändert die Eingabe nicht", () => {
		const items = [film("Zulu", { watchStatus: "planned" }), film("Alpha", { watchStatus: "planned" }), film("Fertig", { watchStatus: "completed" })];
		const originalOrder = items.map((item) => item.id);
		expect(selectPlanned(items, "all").map((item) => item.title)).toEqual(["Alpha", "Zulu"]);
		expect(items.map((item) => item.id)).toEqual(originalOrder);
	});
});
