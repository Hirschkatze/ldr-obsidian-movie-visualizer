import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStarRating } from "../src/phase3/ui/StarRating";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	dataset: Record<string, string> = {};
	attributes = new Map<string, string>();
	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
}

function installDocument(): void {
	vi.stubGlobal("document", {
		createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
	});
}

afterEach(() => vi.unstubAllGlobals());

describe("Wiederverwendbare textbasierte Sternanzeige", () => {
	it("erzeugt leere, halbe und volle Textsterne aus demselben Zeichen", () => {
		installDocument();
		const display = createStarRating({ value: 1.5, readonly: true, size: "sm" }) as unknown as FakeElement;
		const stars = display.children.slice(0, 10);
		expect(stars.every((star) => star.tagName === "span" && star.textContent === "★")).toBe(true);
		expect(stars[0].className).toContain("nacv-star--full");
		expect(stars[1].className).toContain("nacv-star--half");
		expect(stars[2].className).toContain("nacv-star--empty");
	});

	it("rendert auf Karten zehn kompakte Textsterne mit echtem Halbsternzustand bei 8,5", () => {
		installDocument();
		const display = createStarRating({ value: 8.5, readonly: true, size: "sm" }) as unknown as FakeElement;
		expect(display.children.slice(0, 10)).toHaveLength(10);
		expect(display.children[8].className).toContain("nacv-star--half");
		expect(display.children[9].className).toContain("nacv-star--empty");
		expect(display.children.slice(0, 10).every((star) => star.textContent === "★")).toBe(true);
		expect(display.children.slice(0, 10).every((star) => star.children.length === 0)).toBe(true);
		expect(display.children[10].textContent).toBe("8,5");
	});

	it("bindet die Kartenbewertung ausschließlich lesend ein", () => {
		const card = readFileSync(join(process.cwd(), "src", "phase2", "ui", "MediaCard.ts"), "utf8");
		expect(card).toContain("createStarRating");
		expect(card).toContain("readonly: true");
		expect(card).not.toContain("PersonalMediaActions");
		expect(card).not.toContain("setRating");
		expect(card).not.toContain("½");
		expect(card).not.toContain("updatePersonalFields");
	});

	it("rendert die feste kompakte Bewertungszone auch bei personalRating 0 oder fehlend", () => {
		const card = readFileSync(join(process.cwd(), "src", "phase2", "ui", "MediaCard.ts"), "utf8");
		expect(card).toContain('createStarRating({ value: vm.personalRating, readonly: true, size: "sm" })');
		expect(card).toContain("nacv-media-card__zone--rating");
		installDocument();
		const display = createStarRating({ value: 0, readonly: true, size: "sm" }) as unknown as FakeElement;
		expect(display.children.slice(0, 10).every((star) => star.className.includes("nacv-star--empty"))).toBe(true);
		expect(display.children[10].textContent).toBe("");
	});

	it("macht ausschließlich die sichtbaren Sterne zu Pointer-Zielen", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-star\s*\{[^}]*pointer-events:\s*auto;/s);
		expect(css).not.toContain(".nacv-star-zone");
		expect(css).toMatch(/\.nacv-star--half\s*\{[^}]*linear-gradient\(to right,[^}]*50%[^}]*var\(--text-faint\) 50%[^}]*background-clip:\s*text;/s);
		const control = readFileSync(join(process.cwd(), "src", "phase3", "ui", "StarRating.ts"), "utf8");
		expect(control).toContain('document.createElement("span")');
		expect(control).toContain('target.closest<HTMLElement>(".nacv-star")');
		expect(control).toContain("getBoundingClientRect()");
		expect(control).not.toContain("nacv-star-zone");
		expect(control).not.toContain('document.createElement("button")');
		expect(control).not.toContain("createElementNS");
	});
});
