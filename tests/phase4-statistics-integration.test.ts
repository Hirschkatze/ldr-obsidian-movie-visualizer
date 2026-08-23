import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase-4C-Anwendungsintegration", () => {
	it("ordnet Statistik zwischen Personen und Katalog in die Hauptnavigation ein", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const dashboard = view.indexOf('{ route: "dashboard", label: "Übersicht" }');
		const people = view.indexOf('{ route: "people", label: "Personen" }');
		const statistics = view.indexOf('{ route: "statistics", label: "Statistik" }');
		const catalog = view.indexOf('{ route: "catalog", label: "Katalog" }');
		const search = view.indexOf('{ route: "search", label: "Suche" }');
		expect(dashboard).toBeLessThan(people);
		expect(people).toBeLessThan(statistics);
		expect(statistics).toBeLessThan(catalog);
		expect(catalog).toBeLessThan(search);
	});

	it("rendert die Statistik in der aktiven Anwendungshülle mit persistentem Typfilter", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain('if (this.route === "statistics")');
		expect(view).toContain("renderStatistics(viewHost");
		expect(view).toContain("mediaType: this.mediaType");
		expect(view).toContain("mountApplicationContent(main, this.mediaType");
		expect(view).toContain('onOpenPerson: (person) => this.openPerson(person, "statistics")');
	});

	it("kehrt aus einem Ranking-Personendetail zur Statistik zurück", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain('private personReturnRoute: MainRoute = "people"');
		expect(view).toContain("this.route = this.personReturnRoute");
		expect(view).toContain("this.personReturnRoute = returnRoute");
		expect(view).toContain('returnRoute: "people" | "statistics"');
	});

	it("nutzt ausschließlich die bestehende MediaDataService-Subscription für Reaktivität", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const statistics = readFileSync(join(process.cwd(), "src", "phase4", "ui", "StatisticsView.ts"), "utf8");
		expect(view).toContain("this.service.subscribe(() => this.renderApplication())");
		expect(statistics).not.toContain("metadataCache.on");
		expect(statistics).not.toContain("vault.on");
		expect(statistics).not.toContain("setTimeout");
	});

	it("strukturiert Statistik editorial ohne gleichförmige verschachtelte Karten", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		const view = readFileSync(join(process.cwd(), "src", "phase4", "ui", "StatisticsView.ts"), "utf8");
		expect(view).toContain('nacv-statistics-ratings__columns');
		expect(view).toContain('nacv-statistics-panel--distribution');
		expect(view).toContain('nacv-statistics-people');
		expect(view).toContain('nacv-statistics-ranking__row--top');
		expect(css).toMatch(/\.nacv-statistics-summary\s*\{[^}]*border-bottom:/s);
		expect(css).toMatch(/\.nacv-statistics-panel--distribution\s*\{[^}]*border-top:/s);
		expect(css).toMatch(/\.nacv-statistics-time__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
		expect(css).toMatch(/\.nacv-statistics-metric--featured\s*\{[^}]*border-left:\s*3px solid var\(--interactive-accent\)/s);
		expect(css).toMatch(/\.nacv-statistics-ratings__columns\s*\{[^}]*grid-template-columns:/s);
		expect(css).toMatch(/\.nacv-statistics-people\s*\{[^}]*display:\s*block;/s);
		expect(css).toMatch(/\.nacv-statistics-rankings\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
		expect(css).toMatch(/\.nacv-statistics-ranking__row\s*\{[^}]*border-bottom:/s);
		expect(css).toMatch(/\.nacv-statistics \.nacv-statistics-ranking__person\s*\{[^}]*padding:\s*0 !important;[^}]*border:\s*0 !important;[^}]*background:\s*none !important;[^}]*box-shadow:\s*none !important;/s);
		expect(css).toMatch(/\.nacv-statistics \.nacv-statistics-ranking__person:hover\s*\{[^}]*text-decoration:\s*underline;/s);
		expect(css).toMatch(/\.nacv-statistics \.nacv-statistics-ranking__person:focus-visible\s*\{[^}]*outline:/s);
		expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.nacv-statistics-ratings__columns\s*\{[^}]*grid-template-columns:\s*1fr;/s);
	});
});
