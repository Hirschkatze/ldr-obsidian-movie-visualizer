import { describe, expect, it } from "vitest";
import { mediaCardViewModel, mediaDetailViewModel } from "../src/phase2/viewmodels";
import { movie, series } from "./phase2-fixtures";

describe("Phase-2-Card-Viewmodels", () => {
	it("bildet einen Film vollständig ab", () => {
		const vm = mediaCardViewModel(movie({ genres: ["Drama", "Mystery", "Thriller", "Historie", "Krimi"] }));
		expect(vm.typeLabel).toBe("Film");
		expect(vm.specificFacts).toContain("2 h 22 min");
		expect(vm.personalRating).toBe(9);
		expect(vm.imdbRating).toBe(8.4);
		expect(vm.tmdbRating).toBe(8.1);
		expect(vm.cover).toEqual({ src: "https://images.example/movie.jpg", isPlaceholder: false });
		expect(vm.genres).toEqual(["Drama", "Mystery", "Thriller", "Historie", "Krimi"]);
		expect(vm.visibleGenres).toEqual(["Drama", "Mystery"]);
		expect(vm.hiddenGenreCount).toBe(3);
	});

	it("bildet eine Serie einschließlich neuer Staffel und lokal aufgelöstem Bild ab", () => {
		const vm = mediaCardViewModel(series({ continuationStatus: "scheduled", nextSeasonAirDate: "2027-03-15" }));
		expect(vm.typeLabel).toBe("Serie");
		expect(vm.specificFacts).toEqual(["3 Staffeln", "24 Episoden", "Gesehen bis Staffel 1"]);
		expect(vm.newSeasonAvailable).toBe(true);
		expect(vm.cover.src).toBe("app://vault/Assets/series-cover.jpg");
	});
});

describe("Phase-2-Detail-Viewmodels", () => {
	it("enthält Filmfelder, Stimmenzahlen und externe Links", () => {
		const vm = mediaDetailViewModel(movie());
		expect(vm.specificFacts).toContainEqual({ label: "Sichtungen", value: "2" });
		expect(vm.scores).toContainEqual({ label: "IMDb-Stimmen", value: "9.000" });
		expect(vm.scores).toContainEqual({ label: "TMDB-Stimmen", value: "1.200" });
		expect(vm.imdbUrl).toBe("https://www.imdb.com/title/tt0000100/");
		expect(vm.tmdbUrl).toBe("https://www.themoviedb.org/movie/100");
		expect(vm.backdrop.src).toBe("app://vault/Assets/movie-backdrop.jpg");
	});

	it("erzeugt externe Film- und Serienlinks ausschließlich aus validierten IDs", () => {
		const film = mediaDetailViewModel(movie({ imdbId: "tt0133093", tmdbId: "603", sourceUrl: "https://example.com/falsch" }));
		expect(film.imdbUrl).toBe("https://www.imdb.com/title/tt0133093/");
		expect(film.tmdbUrl).toBe("https://www.themoviedb.org/movie/603");

		const show = mediaDetailViewModel(series({ imdbId: "tt11280740", tmdbId: "95396" }));
		expect(show.imdbUrl).toBe("https://www.imdb.com/title/tt11280740/");
		expect(show.tmdbUrl).toBe("https://www.themoviedb.org/tv/95396");
		expect(show.tmdbUrl).not.toContain("/movie/");
	});

	it("lässt fehlende oder ungültige IDs unabhängig voneinander aus", () => {
		expect(mediaDetailViewModel(movie({ imdbId: "tt0133093", tmdbId: undefined })).tmdbUrl).toBeUndefined();
		expect(mediaDetailViewModel(movie({ imdbId: "tt0133093", tmdbId: undefined })).imdbUrl)
			.toBe("https://www.imdb.com/title/tt0133093/");
		expect(mediaDetailViewModel(movie({ imdbId: undefined, tmdbId: "603" })).imdbUrl).toBeUndefined();
		expect(mediaDetailViewModel(movie({ imdbId: undefined, tmdbId: "603" })).tmdbUrl)
			.toBe("https://www.themoviedb.org/movie/603");
		expect(mediaDetailViewModel(movie({ imdbId: undefined, tmdbId: undefined })))
			.toMatchObject({ imdbUrl: undefined, tmdbUrl: undefined });
		expect(mediaDetailViewModel(movie({ imdbId: "https://evil.example", tmdbId: "../603" })))
			.toMatchObject({ imdbUrl: undefined, tmdbUrl: undefined });
	});

	it("enthält Serienfelder und nutzt Cover als Backdrop-Fallback", () => {
		const vm = mediaDetailViewModel(series({
			continuationStatus: "scheduled",
			nextSeasonNumber: 4,
			nextSeasonAirDate: "2027-03-15",
		}));
		expect(vm.specificFacts).toContainEqual({ label: "Staffeln", value: "3" });
		expect(vm.specificFacts).toContainEqual({ label: "Episodenlaufzeit", value: "45 min" });
		expect(vm.newSeasonAvailable).toBe(true);
		expect(vm.specificFacts).toContainEqual({ label: "Fortsetzung", value: "Termin angekündigt" });
		expect(vm.specificFacts).toContainEqual({ label: "Nächste Staffel", value: "4" });
		expect(vm.specificFacts).toContainEqual({ label: "Ausstrahlung ab", value: "15.03.2027" });
		expect(vm.backdrop.src).toBe("app://vault/Assets/series-cover.jpg");
	});

	it("bildet mögliche und erfasste Fortsetzungen ab, aber none und unknown nicht prominent", () => {
		expect(mediaDetailViewModel(series({ continuationStatus: "possible" })).specificFacts)
			.toContainEqual({ label: "Fortsetzung", value: "möglich" });
		expect(mediaDetailViewModel(series({ continuationStatus: "recorded", nextSeasonNumber: 5 })).specificFacts)
			.toEqual(expect.arrayContaining([
				{ label: "Fortsetzung", value: "weitere Staffel erfasst" },
				{ label: "Nächste Staffel", value: "5" },
			]));
		for (const continuationStatus of ["none", "unknown"] as const) {
			expect(mediaDetailViewModel(series({ continuationStatus })).specificFacts.some((item) => item.label === "Fortsetzung")).toBe(false);
		}
	});

	it("lässt fehlende Bewertungen und Stimmenzahlen aus und erzeugt Bildplatzhalter", () => {
		const vm = mediaDetailViewModel(movie({
			cover: undefined,
			backdrop: undefined,
			personalRating: undefined,
			imdbRating: undefined,
			imdbVoteCount: undefined,
			tmdbRating: undefined,
			tmdbVoteCount: undefined,
		}));
		expect(vm.scores).toEqual([]);
		expect(vm.personalFacts.some((item) => item.label === "Meine Bewertung")).toBe(false);
		expect(vm.cover.isPlaceholder).toBe(true);
		expect(vm.backdrop.isPlaceholder).toBe(true);
	});
});
