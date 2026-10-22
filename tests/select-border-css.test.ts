import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Geschlossene Select-Rahmen", () => {
	const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");

	it("normalisiert alle nacv-Selects mit vollständigem themenabhängigem Rahmen", () => {
		expect(css).toMatch(/\.nacv-root select\.nacv-select\s*\{[^}]*box-sizing:\s*border-box;[^}]*overflow:\s*visible;[^}]*border:\s*1px solid var\(--background-modifier-border\);[^}]*border-bottom:\s*1px solid var\(--background-modifier-border\);[^}]*background-clip:\s*padding-box;[^}]*box-shadow:\s*none;[^}]*line-height:\s*normal;/s);
	});

	it("hält den Rahmen in Hover, Fokus und Disabled vollständig geschlossen", () => {
		expect(css).toMatch(/\.nacv-root select\.nacv-select:hover:not\(:disabled\)\s*\{[^}]*border-color:\s*var\(--background-modifier-border-hover,[^;]+;[^}]*border-bottom-color:\s*var\(--background-modifier-border-hover,/s);
		expect(css).toMatch(/\.nacv-root select\.nacv-select:focus,[\s\S]*?\.nacv-root select\.nacv-select:focus-visible\s*\{[^}]*border-color:\s*var\(--interactive-accent\);[^}]*border-bottom-color:\s*var\(--interactive-accent\);[^}]*box-shadow:\s*0 0 0 2px var\(--background-modifier-border-focus\);/s);
		expect(css).toMatch(/\.nacv-root select\.nacv-select:disabled\s*\{[^}]*border-color:\s*var\(--background-modifier-border\);[^}]*border-bottom-color:\s*var\(--background-modifier-border\);[^}]*box-shadow:\s*none;/s);
	});

	it("verwendet für Filter, Sortierung, Richtung und Fortsetzung dieselbe Select-Klasse", () => {
		const catalog = readFileSync(join(process.cwd(), "src", "phase2", "ui", "CatalogView.ts"), "utf8");
		expect(catalog).toContain('const select = field.createEl("select", { cls: "nacv-select" });');
		for (const label of ["Genre", "Sortierung", "Richtung", "Fortsetzung"]) {
			expect(catalog).toContain(`"${label}"`);
		}
	});
});
