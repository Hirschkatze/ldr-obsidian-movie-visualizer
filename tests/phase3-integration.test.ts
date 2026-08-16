import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase-3-Integration", () => {
	it("bindet sämtliche Schreibaktionen ausschließlich in die Detailansicht ein", () => {
		const detail = readFileSync(join(process.cwd(), "src", "phase2", "ui", "MediaDetailView.ts"), "utf8");
		const card = readFileSync(join(process.cwd(), "src", "phase2", "ui", "MediaCard.ts"), "utf8");
		const catalog = readFileSync(join(process.cwd(), "src", "phase2", "ui", "CatalogView.ts"), "utf8");
		const search = readFileSync(join(process.cwd(), "src", "phase2", "ui", "SearchView.ts"), "utf8");
		expect(detail).toContain("createPersonalEntryControls");
		expect(card).toContain("createStarRating");
		expect(card).toContain("readonly: true");
		const personalEntry = readFileSync(join(process.cwd(), "src", "phase3", "ui", "PersonalEntryControls.ts"), "utf8");
		expect(personalEntry).toContain("createStarRating");
		expect(personalEntry).toContain("readonly: false");
		for (const forbidden of ["PersonalMediaActions", "setRating", "setFavorite", "setWatchStatus", "setLastWatched", "markWatched", "rewatch", "correctUnwatched", "setSeriesProgress"])
			expect(card).not.toContain(forbidden);
		for (const source of [card, catalog, search]) {
			expect(source).not.toContain("updatePersonalFields");
			expect(source).not.toContain("PersonalMediaActions");
		}
	});

	it("verwendet ausschließlich die kontrollierte Schreib-API", () => {
		const actionSource = readFileSync(join(process.cwd(), "src", "phase3", "PersonalMediaActions.ts"), "utf8");
		const uiSource = readFileSync(join(process.cwd(), "src", "phase3", "ui", "PersonalEntryControls.ts"), "utf8");
		expect(actionSource).not.toContain("processFrontMatter");
		expect(actionSource).toContain("updatePersonalFields");
		expect(uiSource).not.toContain("processFrontMatter");
		expect(uiSource).not.toContain("PROPERTY_SCHEMA");
	});

	it("zeigt deutsche Statusbezeichnungen bei englischen Schemawerten", () => {
		const ui = readFileSync(join(process.cwd(), "src", "phase3", "ui", "PersonalEntryControls.ts"), "utf8");
		for (const pair of [["planned", "Geplant"], ["watching", "Wird angesehen"], ["completed", "Abgeschlossen"], ["paused", "Pausiert"], ["dropped", "Abgebrochen"]]) {
			expect(ui).toContain(`value: "${pair[0]}", label: "${pair[1]}"`);
		}
	});
});
