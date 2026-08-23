import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderStatistics } from "../src/phase4/ui/StatisticsView";
import { movie, person, series } from "./phase2-fixtures";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<(event: any) => void>>();
	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	empty(): void { this.children = []; }
	addClass(name: string): void { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); }
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	addEventListener(name: string, listener: (event: any) => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}
	trigger(name: string, event: any = {}): void { for (const listener of this.listeners.get(name) ?? []) listener(event); }
	createEl(tag: string, options: { cls?: string; text?: string; attr?: Record<string, string> } = {}): FakeElement {
		const child = Object.assign(new FakeElement(), { tagName: tag, className: options.cls ?? "", textContent: options.text ?? "" });
		for (const [name, value] of Object.entries(options.attr ?? {})) child.setAttribute(name, value);
		return this.appendChild(child);
	}
	createDiv(options?: string | { cls?: string; text?: string; attr?: Record<string, string> }): FakeElement {
		return this.createEl("div", typeof options === "string" ? { cls: options } : options);
	}
	createSpan(options?: { cls?: string; text?: string; attr?: Record<string, string> }): FakeElement {
		return this.createEl("span", options);
	}
}

function installDocument(): void {
	vi.stubGlobal("document", { createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }) });
}

function classes(element: FakeElement): string[] {
	return `${element.className} ${element.attributes.get("class") ?? ""}`.split(/\s+/).filter(Boolean);
}

function findAll(root: FakeElement, className: string): FakeElement[] {
	return [classes(root).includes(className) ? [root] : [], ...root.children.map((child) => findAll(child, className))].flat();
}

function findTags(root: FakeElement, tagName: string): FakeElement[] {
	return [root.tagName === tagName ? [root] : [], ...root.children.map((child) => findTags(child, tagName))].flat();
}

function allText(root: FakeElement): string[] {
	return [root.textContent, ...root.children.flatMap(allText)].filter(Boolean);
}

afterEach(() => vi.unstubAllGlobals());

describe("Tatsächlich gerenderte Phase-4C-Statistikansicht", () => {
	const items = [
		movie({ id: "Movies/A.md", genres: ["Drama", "Sci-Fi"], year: 1994, personalRating: 8.5, imdbRating: 8, tmdbRating: 7.5, favorite: true, watchStatus: "completed" }),
		series({ id: "Series/A.md", genres: ["Mystery", "Drama"], year: 2026, personalRating: 6, imdbRating: 7, tmdbRating: 8, watchStatus: "planned" }),
	];

	it("rendert Kennzahlen und sämtliche geforderten Statistiksektionen mit DOM-Balken", () => {
		installDocument();
		const container = new FakeElement();
		const heading = new FakeElement();
		const onOpenPerson = vi.fn();
		renderStatistics(container as never, { items, headingContainer: heading as never, mediaType: "all", onOpenPerson });
		for (const title of ["Zeit", "Genres", "Erscheinungszeiträume", "Meine Bewertungen", "Externe Bewertungen", "Sichtungsstatus", "Häufigste Darsteller:innen", "Häufigste Regie"])
			expect(allText(container)).toContain(title);
		for (const metric of ["Medien", "Filme", "Serien", "Favoriten", "Gesehen", "Geplant", "Persönlich bewertet", "Ø persönliche Bewertung"])
			expect(allText(container)).toContain(metric);
		expect(allText(container)).toContain("Drama");
		expect(allText(container)).toContain("1990er");
		expect(allText(container)).toContain("2020er");
		expect(findAll(container, "nacv-statistics-bar__fill").length).toBeGreaterThan(0);
		expect(findAll(container, "nacv-statistics-bar__fill")[0].attributes.get("style")).toContain("--nacv-bar-width:");
		expect(allText(container)).toContain("Gesamtlaufzeit");
		expect(allText(container)).toContain("Gesehene Zeit");
		const ratingGroup = findAll(container, "nacv-statistics-ratings");
		expect(ratingGroup).toHaveLength(1);
		expect(allText(ratingGroup[0])).toContain("Meine Bewertungen");
		expect(allText(ratingGroup[0])).toContain("Externe Bewertungen");
		expect(findAll(container, "nacv-statistics-panel--status")).toHaveLength(1);
		const info = findAll(container, "nacv-statistics-metric__info")[0];
		expect(info.attributes.get("title")).toContain("näherungsweise berechnet");
		expect(findAll(container, "nacv-statistics-ranking__rank")[0].textContent).toBe("01");
		expect(classes(findAll(container, "nacv-statistics-ranking__row")[0])).toContain("nacv-statistics-ranking__row--top");
		const rankingButton = findAll(container, "nacv-statistics-ranking__person")[0];
		rankingButton.trigger("click");
		expect(onOpenPerson).toHaveBeenCalledOnce();
		const source = readFileSync(join(process.cwd(), "src", "phase4", "ui", "StatisticsView.ts"), "utf8");
		expect(source).not.toContain("openPersonNote");
		expect(source).not.toContain("openLinkText");
	});

	it("wendet den globalen Typfilter vor allen sichtbaren Auswertungen an", () => {
		installDocument();
		const container = new FakeElement();
		renderStatistics(container as never, { items, headingContainer: new FakeElement() as never, mediaType: "movie", onOpenPerson: vi.fn() });
		expect(allText(container)).toContain("Sci-Fi");
		expect(allText(container)).not.toContain("Mystery");
		expect(allText(container)).not.toContain("Serien");
		expect(allText(container)).not.toContain("2020er");
	});

	it("rendert beide echten Personen-Rankings mit mehreren Zeilen und öffnet das interne Personendetail", () => {
		installDocument();
		const alex = person("People/Alex", "Alex");
		const berta = person("People/Berta", "Berta");
		const clara = person("People/Clara", "Clara");
		const dora = person("People/Dora", "Dora");
		const itemsWithPeople = [
			movie({ id: "Movies/One.md", cast: [alex, berta], directors: [clara, dora] }),
			movie({ id: "Movies/Two.md", cast: [alex, berta], directors: [clara] }),
			series({ id: "Series/Three.md", cast: [alex] }),
		];
		const container = new FakeElement();
		const onOpenPerson = vi.fn();

		renderStatistics(container as never, {
			items: itemsWithPeople,
			headingContainer: new FakeElement() as never,
			mediaType: "all",
			onOpenPerson,
		});

		expect(findAll(container, "nacv-statistics-people")).toHaveLength(1);
		expect(findAll(container, "nacv-statistics-ranking")).toHaveLength(2);
		expect(allText(container)).toContain("Häufigste Darsteller:innen");
		expect(allText(container)).toContain("Häufigste Regie");
		const statistics = findAll(container, "nacv-statistics")[0];
		const peopleIndex = statistics.children.findIndex((child) => classes(child).includes("nacv-statistics-people"));
		const ratingsIndex = statistics.children.findIndex((child) => classes(child).includes("nacv-statistics-ratings"));
		expect(peopleIndex).toBeGreaterThan(-1);
		expect(peopleIndex).toBeLessThan(ratingsIndex);
		const buttons = findAll(container, "nacv-statistics-ranking__person");
		expect(buttons.map((button) => button.textContent)).toEqual(["Alex", "Berta", "Clara", "Dora"]);
		buttons[2].trigger("click");
		expect(onOpenPerson).toHaveBeenCalledOnce();
		expect(onOpenPerson.mock.calls[0][0]).toMatchObject({ display: "Clara", roles: ["director"] });
	});

	it("rendert einen leeren Datenbestand ohne Schreib- oder Änderungsbuttons sauber", () => {
		installDocument();
		const container = new FakeElement();
		renderStatistics(container as never, { items: [], headingContainer: new FakeElement() as never, mediaType: "all", onOpenPerson: vi.fn() });
		expect(allText(container)).toContain("Keine Genres vorhanden.");
		expect(allText(container)).toContain("Keine Erscheinungsjahre vorhanden.");
		expect(allText(container)).toContain("Keine persönlichen Bewertungen vorhanden.");
		expect(allText(container)).toContain("Keine Sichtungsstatus vorhanden.");
		expect(findAll(container, "nacv-statistics-people")).toHaveLength(0);
		expect(findTags(container, "button")).toHaveLength(0);
		const source = readFileSync(join(process.cwd(), "src", "phase4", "ui", "StatisticsView.ts"), "utf8");
		for (const forbidden of ["PersonalMediaActions", "updatePersonalFields", "processFrontMatter", "setRating", "fetch("])
			expect(source).not.toContain(forbidden);
	});

	it("spiegelt neue Service-Daten beim erneuten Rendern ohne eigenen Eventpfad wider", () => {
		installDocument();
		const container = new FakeElement();
		const heading = new FakeElement();
		renderStatistics(container as never, { items: [items[0]], headingContainer: heading as never, mediaType: "all", onOpenPerson: vi.fn() });
		expect(allText(container)).not.toContain("Komödie");
		renderStatistics(container as never, {
			items: [{ ...items[0], genres: ["Komödie"], personalRating: 10 }],
			headingContainer: heading as never,
			mediaType: "all",
			onOpenPerson: vi.fn(),
		});
		expect(allText(container)).toContain("Komödie");
		expect(allText(container)).toContain("10,0");
	});
});
