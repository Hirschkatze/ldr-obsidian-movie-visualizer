import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase-4A-Anwendungsintegration", () => {
	it("macht Übersicht zur Standardroute und ordnet die Navigation vor Katalog und Suche ein", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain('private route: Route = "dashboard"');
		expect(view).toContain('private returnRoute: Exclude<Route, "detail"> = "dashboard"');
		const dashboard = view.indexOf('{ route: "dashboard", label: "Übersicht" }');
		const catalog = view.indexOf('{ route: "catalog", label: "Katalog" }');
		const search = view.indexOf('{ route: "search", label: "Suche" }');
		expect(dashboard).toBeGreaterThan(-1);
		expect(dashboard).toBeLessThan(catalog);
		expect(catalog).toBeLessThan(search);
	});

	it("reicht den persistenten globalen Typfilter an die Übersicht weiter und kehrt aus Details zurück", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain("renderDashboard(viewHost");
		expect(view).toContain("mediaType: this.mediaType");
		expect(view).toContain("this.returnRoute = this.route === \"detail\" ? this.returnRoute : this.route");
		expect(view).toContain("this.route = this.returnRoute");
	});

	it("nutzt die bestehende Service-Reaktivität und ausschließlich bereits aufgelöste Bildwerte", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const dashboard = readFileSync(join(process.cwd(), "src", "phase4", "ui", "DashboardView.ts"), "utf8");
		expect(view).toContain("this.service.subscribe(() => this.renderApplication())");
		expect(dashboard).toContain("media.backdrop ?? media.cover");
		expect(dashboard).not.toContain("ImageResolver");
		expect(dashboard).not.toContain("fetch(");
	});

	it("setzt horizontale CSS-Reihen und einen responsiven Hero ohne Karussellbibliothek um", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-dashboard-row\s*\{[^}]*grid-auto-flow:\s*column;[^}]*overflow-x:\s*auto;/s);
		expect(css).toMatch(/\.nacv-dashboard-hero\s*\{[^}]*min-height:\s*clamp\(/s);
		expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.nacv-dashboard-hero__content\s*\{[^}]*width:\s*100%;/s);
	});
});
