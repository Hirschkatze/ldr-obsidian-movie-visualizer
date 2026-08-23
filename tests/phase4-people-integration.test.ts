import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase-4B-Anwendungsintegration", () => {
	it("ordnet Personen zwischen Übersicht und Katalog in die Hauptnavigation ein", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const dashboard = view.indexOf('{ route: "dashboard", label: "Übersicht" }');
		const people = view.indexOf('{ route: "people", label: "Personen" }');
		const catalog = view.indexOf('{ route: "catalog", label: "Katalog" }');
		const search = view.indexOf('{ route: "search", label: "Suche" }');
		expect(dashboard).toBeGreaterThan(-1);
		expect(dashboard).toBeLessThan(people);
		expect(people).toBeLessThan(catalog);
		expect(catalog).toBeLessThan(search);
	});

	it("bindet Übersicht und Detail an die aktive Anwendungshülle und den globalen Typfilter", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain('if (this.route === "people" || this.route === "person-detail")');
		expect(view).toContain("aggregatePeople(items, this.mediaType)");
		expect(view).toContain("renderPeople(viewHost");
		expect(view).toContain("renderPersonDetail(viewHost");
		expect(view).toContain("onOpenMedia: (media) => this.openDetail(media)");
	});

	it("bewahrt den Personen-UI-State über Detailnavigation und Zurückwege", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		for (const state of [
			'private peopleQuery = ""',
			'private peopleRole: PersonRoleFilter = "all"',
			'private peopleSort: PersonSort = "media-count"',
		]) expect(view).toContain(state);
		expect(view).toContain('this.route = "person-detail"');
		expect(view).toContain('onOpenPerson: (selected) => this.openPerson(selected, "people")');
		expect(view).toContain("this.route = this.personReturnRoute");
		expect(view).toContain("this.returnRoute = this.route === \"detail\" ? this.returnRoute : this.route");
		expect(view).toContain("this.route = this.returnRoute");
	});

	it("verwendet ausschließlich die vorhandene Service-Subscription für Reaktivität", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const peopleView = readFileSync(join(process.cwd(), "src", "phase4", "ui", "PeopleView.ts"), "utf8");
		expect(view).toContain("this.service.subscribe(() => this.renderApplication())");
		expect(peopleView).not.toContain("metadataCache.on");
		expect(peopleView).not.toContain("vault.on");
		expect(peopleView).not.toContain("setTimeout");
	});
});
