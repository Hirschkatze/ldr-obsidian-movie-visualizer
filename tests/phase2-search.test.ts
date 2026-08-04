import { describe, expect, it } from "vitest";
import { matchesSearch, searchMedia } from "../src/phase2/search";
import { movie, series } from "./phase2-fixtures";

describe("Phase-2-Suche", () => {
	const film = movie();
	const show = series();
	const items = [film, show];

	it.each([
		"ÄRA", "Film Era", "Anna", "Ömer", "M. Müller", "People/Maria Müller",
		"Drama", "Freundschaft", "Zeitreise", "Lieblingsfilme",
	])("findet Film über %s", (query) => {
		expect(matchesSearch(film, query)).toBe(true);
	});

	it("behandelt deutsche Sonderzeichen und Groß-/Kleinschreibung korrekt", () => {
		expect(matchesSearch(show, "ÜBERBLICK")).toBe(true);
		expect(matchesSearch(show, "küstenstadt")).toBe(true);
	});

	it("kombiniert Suche und globalen Typfilter", () => {
		expect(searchMedia(items, "", "all")).toHaveLength(2);
		expect(searchMedia(items, "", "movie")).toEqual([film]);
		expect(searchMedia(items, "", "series")).toEqual([show]);
	});

	it("erzeugt bei leerer Suche keinen Fehler und liefert den Typbestand", () => {
		expect(() => searchMedia(items, "   ", "all")).not.toThrow();
		expect(searchMedia(items, "   ", "all")).toHaveLength(2);
	});
});

