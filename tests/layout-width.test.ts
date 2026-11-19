import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
	applyLayoutWidth,
	LAYOUT_WIDTH_MODES,
	normalizeLayoutWidthMode,
	type LayoutWidthMode,
} from "../src/LayoutWidth";
import { CinemaVisualizerSettingsStore, parseSettings } from "../src/settings";
import type { CatalogDensity } from "../src/phase2/types";

class FakeStyle {
	private readonly values = new Map<string, string>();
	setProperty(name: string, value: string): void { this.values.set(name, value); }
	getPropertyValue(name: string): string { return this.values.get(name) ?? ""; }
}

class FakeRoot {
	dataset: Record<string, string> = {};
	style = new FakeStyle();
}

describe("Phase 6B.2: globale Darstellungsbreiten", () => {
	it("definiert ausschließlich Normal 1080 px, Breit 1400 px und Genuss mit verfügbarer Breite", () => {
		expect(LAYOUT_WIDTH_MODES).toEqual([
			{ id: "normal", label: "Normal", maxWidth: 1080 },
			{ id: "wide", label: "Breit", maxWidth: 1400 },
			{ id: "full", label: "Genuss", maxWidth: null },
		]);
	});

	it("normalisiert fehlende und ungültige Altwerte auf Normal", () => {
		for (const value of [undefined, null, "", "Genuss", "huge", 1400, {}, ["wide"]]) {
			expect(normalizeLayoutWidthMode(value)).toBe("normal");
		}
		for (const mode of LAYOUT_WIDTH_MODES) expect(normalizeLayoutWidthMode(mode.id)).toBe(mode.id);
	});

	it.each([
		["normal", "1080px"],
		["wide", "1400px"],
		["full", "100%"],
	] as const)("wendet %s zentral am Root an", (mode, width) => {
		const root = new FakeRoot();
		applyLayoutWidth(root as never, mode);
		expect(root.dataset.nacvWidthMode).toBe(mode);
		expect(root.style.getPropertyValue("--nacv-layout-max-width")).toBe(width);
	});

	it("lädt ohne neue Einstellung Normal, ohne data.json zu schreiben", () => {
		const save = vi.fn(async () => undefined);
		const store = new CinemaVisualizerSettingsStore(save);
		store.load({ catalogDensity: "compact" });
		expect(store.layoutWidth).toBe("normal");
		expect(store.catalogDensity).toBe("compact");
		expect(save).not.toHaveBeenCalled();
	});

	it("speichert und stellt jeden Modus wieder her", async () => {
		for (const mode of LAYOUT_WIDTH_MODES) {
			let persisted: Record<string, unknown> = { catalogDensity: "poster" };
			const store = new CinemaVisualizerSettingsStore(async (value) => { persisted = value; });
			store.load(persisted);
			await store.setLayoutWidth(mode.id);
			expect(persisted).toEqual({ catalogDensity: "poster", layoutWidth: mode.id });

			const restored = new CinemaVisualizerSettingsStore(async () => undefined);
			restored.load(persisted);
			expect(restored.layoutWidth).toBe(mode.id);
			expect(restored.catalogDensity).toBe("poster");
		}
	});

	it("erhält bestehende und unbekannte Einstellungen beim Breitenwechsel", async () => {
		const save = vi.fn(async () => undefined);
		const store = new CinemaVisualizerSettingsStore(save);
		store.load({ catalogDensity: "compact", futureSetting: { preserved: true } });
		await store.setLayoutWidth("wide");
		expect(save).toHaveBeenLastCalledWith({
			catalogDensity: "compact",
			futureSetting: { preserved: true },
			layoutWidth: "wide",
		});
	});

	it("kombiniert jede Darstellungsbreite unabhängig mit jeder Katalogdichte", () => {
		const densities: CatalogDensity[] = ["large", "standard", "compact", "poster"];
		for (const density of densities) {
			for (const mode of LAYOUT_WIDTH_MODES) {
				const parsed = parseSettings({ catalogDensity: density, layoutWidth: mode.id });
				expect(parsed).toEqual({ catalogDensity: density, layoutWidth: mode.id });
			}
		}
	});

	it("begrenzt die gesamte Shell einschließlich Navigation ohne horizontales Gesamtüberlaufen", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-root\s*\{[^}]*--nacv-layout-max-width:\s*1080px;/s);
		expect(css).toMatch(/\.nacv-shell\s*\{[^}]*grid-template-columns:\s*184px minmax\(0, 1fr\);[^}]*width:\s*100%;[^}]*max-width:\s*var\(--nacv-layout-max-width\);[^}]*margin-inline:\s*auto;/s);
		expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*?\.nacv-shell\s*\{[^}]*grid-template-columns:\s*1fr;/s);
	});

	it("positioniert den kompakten, umbrechbaren Umschalter rechts im gemeinsamen Kopf", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-shared-header\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s);
		expect(css).toMatch(/\.nacv-width-control\s*\{[^}]*display:\s*inline-flex;[^}]*flex-wrap:\s*wrap;[^}]*justify-self:\s*end;/s);
		expect(css).toMatch(/\.nacv-width-control__button--active\s*\{[^}]*border-color:\s*var\(--interactive-accent\);/s);
		expect(css).toMatch(/\.nacv-width-control__button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--interactive-accent\);/s);
		expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*?\.nacv-width-control\s*\{[^}]*justify-self:\s*start;/s);
	});

	it("verwendet genau einen gemeinsamen Umschalter für alle Hauptansichten und lässt Navigation sowie Phase 6B.1 bestehen", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const dashboard = readFileSync(join(process.cwd(), "src", "phase4", "ui", "DashboardView.ts"), "utf8");
		expect(view.match(/mountApplicationContent\(/g)).toHaveLength(1);
		const mount = view.indexOf("mountApplicationContent(");
		for (const route of ["dashboard", "people", "statistics", "search"]) {
			expect(mount).toBeLessThan(view.indexOf(`this.route === "${route}"`));
		}
		expect(mount).toBeLessThan(view.indexOf("renderCatalog(viewHost"));
		expect(view.indexOf("applyLayoutWidth(root, this.layoutWidth)")).toBeLessThan(view.indexOf('root.createDiv("nacv-shell")'));
		for (const label of ["Übersicht", "Personen", "Statistik", "Katalog", "Suche"])
			expect(view).toContain(`label: "${label}"`);
		expect(dashboard).toContain('title: "Importieren"');
		expect(dashboard).toContain('title: "Aktualisieren"');
	});

	it("verdrahtet Laden und Speichern über die bestehende Plugin-Konfiguration", () => {
		const main = readFileSync(join(process.cwd(), "main.ts"), "utf8");
		expect(main).toContain("this.settingsStore.load(await this.loadData())");
		expect(main).toContain('layoutWidth: this.settingsStore?.layoutWidth ?? "normal"');
		expect(main).toContain("onLayoutWidthChange: (layoutWidth) => this.settingsStore?.setLayoutWidth(layoutWidth)");
	});
});
