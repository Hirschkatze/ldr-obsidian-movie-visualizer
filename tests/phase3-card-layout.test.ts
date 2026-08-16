import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Feste Kartenbereiche", () => {
	it("rendert alle sieben Zonen in verbindlicher Reihenfolge", () => {
		const card = readFileSync(join(process.cwd(), "src", "phase2", "ui", "MediaCard.ts"), "utf8");
		const zones = ["zone--title", "zone--original", "zone--meta", "zone--status", "zone--genres", "zone--scores", "zone--rating"];
		let previous = -1;
		for (const zone of zones) {
			const position = card.indexOf(zone);
			expect(position).toBeGreaterThan(previous);
			previous = position;
		}
	});

	it("begrenzt Titel und Genres und hält die Bewertung als feste unterste Zeile", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-media-card__title\s*\{[^}]*-webkit-line-clamp:\s*2;/s);
		expect(css).toMatch(/\.nacv-media-card__zone--genres\s*\{[^}]*max-height:\s*48px;[^}]*overflow:\s*hidden;/s);
		expect(css).toMatch(/\.nacv-media-card__zone--rating\s*\{[^}]*min-height:\s*28px;[^}]*max-height:\s*28px;[^}]*margin-top:\s*auto;/s);
		expect(css).not.toMatch(/\.nacv-media-card__zone--scores\s*\{[^}]*margin-top:\s*auto;/s);
	});

	it("zeigt bei Genreüberlauf +n und macht alle Genres per Tooltip zugänglich", () => {
		const card = readFileSync(join(process.cwd(), "src", "phase2", "ui", "MediaCard.ts"), "utf8");
		expect(card).toContain("vm.hiddenGenreCount");
		expect(card).toContain("`+${vm.hiddenGenreCount}`");
		expect(card).toContain('title: vm.genres.join(", ")');
	});

	it("verwendet in Suche und Katalog identisch dieselbe rein lesende Karte", () => {
		for (const file of ["CatalogView.ts", "SearchView.ts"]) {
			const source = readFileSync(join(process.cwd(), "src", "phase2", "ui", file), "utf8");
			expect(source).toContain("createMediaCard(media, options.onOpen)");
			expect(source).not.toContain("PersonalMediaActions");
		}
	});
});
