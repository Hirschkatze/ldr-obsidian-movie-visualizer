import { afterEach, describe, expect, it, vi } from "vitest";
import { renderCatalog } from "../src/phase2/ui/CatalogView";
import { DEFAULT_CATALOG_FILTER, type CatalogDensity, type CatalogFilterState, type MediaSortState } from "../src/phase2/types";
import { movie, series } from "./phase2-fixtures";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<(event: any) => void>>();
	dataset: Record<string, string> = {};
	tabIndex = 0;
	value = "";
	selected = false;
	disabled = false;
	classList = {
		add: (name: string) => this.addClass(name),
		remove: (name: string) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); },
	};

	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	empty(): void { this.children = []; }
	remove(): void {}
	addClass(name: string): void {
		if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim();
	}
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	addEventListener(name: string, listener: (event: any) => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}
	trigger(name: string, event: any = {}): void {
		for (const listener of this.listeners.get(name) ?? []) listener(event);
	}
	createEl(tag: string, options: { cls?: string; text?: string; attr?: Record<string, string> } = {}): FakeElement {
		const child = Object.assign(new FakeElement(), {
			tagName: tag,
			className: options.cls ?? "",
			textContent: options.text ?? "",
		});
		for (const [name, value] of Object.entries(options.attr ?? {})) {
			child.setAttribute(name, value);
			if (name === "value") child.value = value;
		}
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
	vi.stubGlobal("document", {
		createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
	});
}

function descendants(root: FakeElement): FakeElement[] {
	return [root, ...root.children.flatMap(descendants)];
}

function classes(element: FakeElement): string[] {
	return `${element.className} ${element.attributes.get("class") ?? ""}`.split(/\s+/).filter(Boolean);
}

function fields(root: FakeElement): FakeElement[] {
	return descendants(root).filter((element) => classes(element).includes("nacv-field"));
}

function selectByLabel(root: FakeElement, label: string): FakeElement {
	const field = fields(root).find((candidate) => candidate.children.some((child) => child.textContent === label));
	const select = field?.children.find((child) => child.tagName === "select");
	if (!select) throw new Error(`Auswahlfeld nicht gefunden: ${label}`);
	return select;
}

function cardIds(root: FakeElement): string[] {
	return descendants(root)
		.filter((element) => classes(element).includes("nacv-media-card"))
		.map((element) => element.dataset.mediaId);
}

afterEach(() => vi.unstubAllGlobals());

describe("Fortsetzungsfilter und Terminsortierung im aktiven Katalog", () => {
	it("zeigt die deutschen Filteroptionen und aktualisiert die reale Kartenliste", () => {
		installDocument();
		const items = [
			movie({ id: "Movies/Film.md" }),
			series({ id: "Series/Possible.md", continuationStatus: "possible" }),
			series({ id: "Series/Recorded.md", continuationStatus: "recorded" }),
			series({ id: "Series/Scheduled.md", continuationStatus: "scheduled" }),
		];
		let filter: CatalogFilterState = { ...DEFAULT_CATALOG_FILTER };
		const render = (): FakeElement => {
			const root = new FakeElement();
			renderCatalog(root as never, {
				items,
				headingContainer: new FakeElement() as never,
				filter,
				sort: { key: "title", direction: "asc" },
				onFilterChange: (next) => { filter = next; },
				onSortChange: vi.fn(),
				onOpen: vi.fn(),
			});
			return root;
		};

		const initial = render();
		const continuation = selectByLabel(initial, "Fortsetzung");
		expect(continuation.children.map((option) => option.textContent)).toEqual([
			"Alle", "Möglich", "Staffel erfasst", "Termin angekündigt",
		]);
		continuation.value = "scheduled";
		continuation.trigger("change");
		expect(filter.continuation).toBe("scheduled");
		expect(cardIds(render())).toEqual(["Series/Scheduled.md"]);
	});

	it("bietet die neue Sortierung an und ordnet die tatsächlichen Katalogkarten nach Datum", () => {
		installDocument();
		const a = series({ id: "Series/A.md", title: "A", continuationStatus: "scheduled", nextSeasonAirDate: "2027-03-01" });
		const b = series({ id: "Series/B.md", title: "B", continuationStatus: "scheduled", nextSeasonAirDate: "2027-06-01" });
		const missing = series({ id: "Series/Ohne.md", title: "Ohne", continuationStatus: "recorded" });
		let sort: MediaSortState = { key: "next-season-air-date", direction: "asc" };
		const render = (): FakeElement => {
			const root = new FakeElement();
			renderCatalog(root as never, {
				items: [missing, b, a],
				headingContainer: new FakeElement() as never,
				filter: { ...DEFAULT_CATALOG_FILTER },
				sort,
				onFilterChange: vi.fn(),
				onSortChange: (next) => { sort = next; },
				onOpen: vi.fn(),
			});
			return root;
		};

		const ascending = render();
		expect(selectByLabel(ascending, "Sortierung").children.map((option) => option.textContent))
			.toContain("Nächster Ausstrahlungstermin");
		expect(cardIds(ascending)).toEqual(["Series/A.md", "Series/B.md", "Series/Ohne.md"]);
		sort = { ...sort, direction: "desc" };
		expect(cardIds(render())).toEqual(["Series/B.md", "Series/A.md", "Series/Ohne.md"]);
	});

	it("deaktiviert den nur für Serien sinnvollen Filter bei globalem Filmfilter", () => {
		installDocument();
		const root = new FakeElement();
		renderCatalog(root as never, {
			items: [movie()],
			headingContainer: new FakeElement() as never,
			filter: { ...DEFAULT_CATALOG_FILTER, mediaType: "movie", continuation: "scheduled" },
			sort: { key: "title", direction: "asc" },
			onFilterChange: vi.fn(),
			onSortChange: vi.fn(),
			onOpen: vi.fn(),
		});
		expect(selectByLabel(root, "Fortsetzung").disabled).toBe(true);
		expect(cardIds(root)).toHaveLength(1);
	});

	it("schaltet alle vier Dichten barrierearm um, ohne Filter, Sortierung oder Ergebnismenge zu verändern", () => {
		installDocument();
		const items = [movie({ id: "Movies/A.md", title: "A" }), movie({ id: "Movies/B.md", title: "B" })];
		const filter: CatalogFilterState = { ...DEFAULT_CATALOG_FILTER, genre: "Drama" };
		const sort: MediaSortState = { key: "title", direction: "desc" };
		let density: CatalogDensity | undefined;
		const onFilterChange = vi.fn();
		const onSortChange = vi.fn();
		const render = (): FakeElement => {
			const root = new FakeElement();
			renderCatalog(root as never, {
				items,
				headingContainer: new FakeElement() as never,
				filter,
				sort,
				...(density ? { density } : {}),
				onFilterChange,
				onSortChange,
				onDensityChange: (next) => { density = next; },
				onOpen: vi.fn(),
			});
			return root;
		};

		const initial = render();
		const initialIds = cardIds(initial);
		const group = descendants(initial).find((element) => classes(element).includes("nacv-density-control"))!;
		const buttons = group.children.filter((element) => element.tagName === "button");
		expect(buttons.map((button) => button.attributes.get("aria-label"))).toEqual(["Groß", "Standard", "Kompakt", "Posterwand"]);
		expect(buttons.map((button) => button.attributes.get("title"))).toEqual(["Groß", "Standard", "Kompakt", "Posterwand"]);
		expect(buttons[1].attributes.get("aria-pressed")).toBe("true");
		expect(buttons[0].textContent).toBe("");
		expect(buttons.slice(0, 2).map((button) => button.attributes.get("data-icon")))
			.toEqual(["gallery-horizontal-end", "layout-grid"]);
		expect(buttons.slice(2).map((button) => {
			const icon = button.children.find((child) => classes(child).includes("nacv-density-control__icon"));
			return icon?.children.length;
		})).toEqual([6, 9]);

		for (const [index, expected, label] of [
			[0, "large", "Groß"],
			[1, "standard", "Standard"],
			[2, "compact", "Kompakt"],
			[3, "poster", "Posterwand"],
		] as const) {
			buttons[index].trigger("click");
			expect(density).toBe(expected);
			const current = render();
			const active = descendants(current).find((element) => element.attributes.get("aria-pressed") === "true")!;
			expect(active.attributes.get("aria-label")).toBe(label);
			expect(cardIds(current)).toEqual(initialIds);
		}
		expect(onFilterChange).not.toHaveBeenCalled();
		expect(onSortChange).not.toHaveBeenCalled();
		const rerendered = render();
		expect(cardIds(rerendered)).toEqual(initialIds);
		const active = descendants(rerendered).find((element) => element.attributes.get("aria-pressed") === "true")!;
		expect(active.attributes.get("aria-label")).toBe("Posterwand");
	});
});
