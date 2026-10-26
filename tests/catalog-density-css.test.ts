import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");

describe("Responsive Katalogdichten", () => {
	it("staffelt die Raster ohne feste Spaltenzahl von Groß bis Posterwand", () => {
		expect(css).toMatch(/\.nacv-media-grid--large\s*\{[^}]*repeat\(auto-fill,\s*minmax\(min\(100%,\s*250px\),\s*1fr\)\)/s);
		expect(css).toMatch(/\.nacv-media-grid--compact\s*\{[^}]*repeat\(auto-fill,\s*minmax\(min\(100%,\s*124px\),\s*1fr\)\)/s);
		expect(css).toMatch(/\.nacv-media-grid--poster\s*\{[^}]*repeat\(auto-fill,\s*minmax\(min\(100%,\s*78px\),\s*1fr\)\)/s);
	});

	it("bewahrt die Dichteabstufung auch am schmalen Katalog-Breakpoint", () => {
		const responsive = css.slice(css.indexOf("@media (max-width: 720px)"), css.indexOf("@media (max-width: 460px)"));
		expect(responsive).toContain("min(100%, 200px)");
		expect(responsive).toContain("min(100%, 104px)");
		expect(responsive).toContain("min(100%, 70px)");
	});

	it("zeichnet die Fallback-Piktogramme als sichtbare Grid-Zellen", () => {
		expect(css).toMatch(/\.nacv-density-control__icon\s*\{[^}]*display:\s*grid;[^}]*width:\s*16px;[^}]*height:\s*16px;/s);
		expect(css).toMatch(/\.nacv-density-control__icon--compact\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\);/s);
		expect(css).toMatch(/\.nacv-density-control__icon--poster\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\);/s);
		expect(css).toMatch(/\.nacv-density-control__icon\s*>\s*span\s*\{[^}]*border:\s*1px solid currentColor;/s);
	});

	it("verwendet für die Dichten weder scale noch zoom", () => {
		expect(css).not.toMatch(/\.nacv-media-(?:grid|card)--(?:large|compact|poster)[^{]*\{[^}]*(?:transform\s*:\s*scale|zoom\s*:)/s);
	});
});
