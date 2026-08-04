import { describe, expect, it } from "vitest";
import { mediaCardViewModel, mediaDetailViewModel } from "../src/phase2/viewmodels";
import { movie, series } from "./phase2-fixtures";

describe("Phase-2-Card-Viewmodels", () => {
	it("bildet einen Film vollständig ab", () => {
		const vm = mediaCardViewModel(movie());
		expect(vm.typeLabel).toBe("Film");
		expect(vm.specificFacts).toContain("2 h 22 min");
		expect(vm.personalRating).toBe(9);
		expect(vm.imdbRating).toBe(8.4);
		expect(vm.tmdbRating).toBe(8.1);
		expect(vm.cover).toEqual({ src: "https://images.example/movie.jpg", isPlaceholder: false });
	});

	it("bildet eine Serie einschließlich neuer Staffel und lokal aufgelöstem Bild ab", () => {
		const vm = mediaCardViewModel(series());
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
		expect(vm.backdrop.src).toBe("app://vault/Assets/movie-backdrop.jpg");
	});

	it("enthält Serienfelder und nutzt Cover als Backdrop-Fallback", () => {
		const vm = mediaDetailViewModel(series());
		expect(vm.specificFacts).toContainEqual({ label: "Staffeln", value: "3" });
		expect(vm.specificFacts).toContainEqual({ label: "Episodenlaufzeit", value: "45 min" });
		expect(vm.newSeasonAvailable).toBe(true);
		expect(vm.backdrop.src).toBe("app://vault/Assets/series-cover.jpg");
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

