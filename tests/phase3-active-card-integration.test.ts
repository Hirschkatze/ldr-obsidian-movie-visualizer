import { afterEach, describe, expect, it, vi } from "vitest";
import { renderCatalog } from "../src/phase2/ui/CatalogView";
import { renderSearch } from "../src/phase2/ui/SearchView";
import { DEFAULT_CATALOG_FILTER } from "../src/phase2/types";
import type { CatalogDensity } from "../src/phase2/types";
import { movie } from "./phase2-fixtures";

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
	checked = false;
	disabled = false;
	classList = {
		add: (name: string) => this.addClass(name),
		remove: (name: string) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); },
	};

	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	get firstElementChild(): FakeElement | undefined { return this.children[0]; }
	replaceChild(next: FakeElement, previous: FakeElement): FakeElement {
		this.children[this.children.indexOf(previous)] = next;
		return previous;
	}
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	addEventListener(name: string, listener: (event: any) => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}
	trigger(name: string, event: any = {}): void { for (const listener of this.listeners.get(name) ?? []) listener(event); }
	empty(): void { this.children = []; }
	remove(): void {}
	addClass(name: string): void { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); }
	toggleClass(name: string, force: boolean): void { force ? this.addClass(name) : this.classList.remove(name); }
	createEl(tag: string, options: { cls?: string; text?: string; attr?: Record<string, string> } = {}): FakeElement {
		const child = Object.assign(new FakeElement(), { tagName: tag, className: options.cls ?? "", textContent: options.text ?? "" });
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

function find(root: FakeElement, className: string): FakeElement | undefined {
	if (classes(root).includes(className)) return root;
	for (const child of root.children) {
		const match = find(child, className);
		if (match) return match;
	}
	return undefined;
}

function findAll(root: FakeElement, className: string): FakeElement[] {
	return [classes(root).includes(className) ? [root] : [], ...root.children.map((child) => findAll(child, className))].flat();
}

function classes(element: FakeElement): string[] {
	return `${element.className} ${element.attributes.get("class") ?? ""}`.split(/\s+/).filter(Boolean);
}

function descendants(root: FakeElement): FakeElement[] {
	return [root, ...root.children.flatMap(descendants)];
}

afterEach(() => vi.unstubAllGlobals());

describe("Aktive Karten-Renderkette", () => {
	it.each(["Katalog", "Suche"])("rendert die echte MediaCard in %s mit rein lesender Textbewertung", (view) => {
		installDocument();
		const container = new FakeElement();
		const heading = new FakeElement();
		const onOpen = vi.fn();
		const item = movie({ personalRating: 8.5, genres: ["Drama", "Mystery", "Thriller", "Krimi", "Historie"] });
		if (view === "Katalog") {
			renderCatalog(container as never, {
				items: [item], headingContainer: heading as never, filter: { ...DEFAULT_CATALOG_FILTER },
				sort: { key: "title", direction: "asc" }, onFilterChange: vi.fn(), onSortChange: vi.fn(),
				onOpen,
			});
		} else {
			renderSearch(container as never, {
				items: [item], headingContainer: heading as never, query: "", mediaType: "all",
				onQueryChange: vi.fn(), onOpen,
			});
		}
		const card = find(container, "nacv-media-card")!;
		expect(card.dataset.nacvCardRating).toBeUndefined();
		const rating = find(card, "nacv-stars--sm")!;
		expect(findAll(rating, "nacv-star")).toHaveLength(10);
		expect(findAll(rating, "nacv-star--full")).toHaveLength(8);
		expect(findAll(rating, "nacv-star--half")).toHaveLength(1);
		expect(findAll(rating, "nacv-star--empty")).toHaveLength(1);
		expect(find(rating, "nacv-stars__value")?.textContent).toBe("8,5");
		expect(find(card, "nacv-media-card__zone--genres")?.textContent).not.toContain("½");
		expect(find(card, "nacv-chip--overflow")?.textContent).toBe("+3");
		expect(findAll(rating, "nacv-star-zone")).toHaveLength(0);
		expect(rating.listeners.has("click")).toBe(false);
		expect(rating.listeners.has("pointermove")).toBe(false);
		expect(rating.listeners.has("pointerleave")).toBe(false);
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("zeigt bei fehlender Bewertung zehn leere Kartensterne ohne Nullwert", () => {
		installDocument();
		const container = new FakeElement();
		renderSearch(container as never, {
			items: [movie({ personalRating: undefined })], headingContainer: new FakeElement() as never,
			query: "", mediaType: "all", onQueryChange: vi.fn(), onOpen: vi.fn(),
		});
		const rating = find(container, "nacv-stars--sm")!;
		expect(findAll(rating, "nacv-star--empty")).toHaveLength(10);
		expect(find(rating, "nacv-stars__value")?.textContent).toBe("");
		expect(rating.textContent).not.toContain("0");
	});

	it("unterstützt Mehrfachauswahl, Demarkieren, Aufheben und deaktiviertes Löschen ohne Detailnavigation", () => {
		installDocument();
		const container = new FakeElement();
		const heading = new FakeElement();
		const selectedIds = new Set<string>();
		const onOpen = vi.fn();
		const first = movie({ id: "Atlas/Sources/Movies/A.md", title: "A" });
		const second = movie({ id: "Atlas/Sources/Movies/B.md", title: "B" });
		const render = () => renderCatalog(container as never, {
			items: [first, second], headingContainer: heading as never, filter: { ...DEFAULT_CATALOG_FILTER },
			sort: { key: "title", direction: "asc" }, onFilterChange: vi.fn(), onSortChange: vi.fn(), onOpen,
			selection: {
				active: true,
				selectedIds,
				onStart: vi.fn(),
				onExit: vi.fn(),
				onClear: () => selectedIds.clear(),
				onToggle: (media) => selectedIds.has(media.id) ? selectedIds.delete(media.id) : selectedIds.add(media.id),
				onDelete: vi.fn(),
			},
		});

		render();
		const initialDelete = descendants(container).find((element) => element.textContent === "Auswahl löschen")!;
		expect(initialDelete.disabled).toBe(true);
		let cards = findAll(container, "nacv-media-card");
		cards[0].trigger("click");
		expect(selectedIds).toEqual(new Set([first.id]));
		expect(onOpen).not.toHaveBeenCalled();
		render();
		cards = findAll(container, "nacv-media-card");
		expect(classes(cards[0])).toContain("nacv-media-card--selected");
		cards[1].trigger("click");
		expect(selectedIds.size).toBe(2);
		cards[0].trigger("click");
		expect(selectedIds).toEqual(new Set([second.id]));
		const clear = descendants(container).find((element) => element.textContent === "Auswahl aufheben")!;
		clear.trigger("click");
		expect(selectedIds.size).toBe(0);
	});

	it("öffnet nach Verlassen des Auswahlmodus Karten wieder normal", () => {
		installDocument();
		const container = new FakeElement();
		const onOpen = vi.fn();
		renderCatalog(container as never, {
			items: [movie()], headingContainer: new FakeElement() as never, filter: { ...DEFAULT_CATALOG_FILTER },
			sort: { key: "title", direction: "asc" }, onFilterChange: vi.fn(), onSortChange: vi.fn(), onOpen,
			selection: {
				active: false, selectedIds: new Set(), onStart: vi.fn(), onExit: vi.fn(), onClear: vi.fn(),
				onToggle: vi.fn(), onDelete: vi.fn(),
			},
		});
		find(container, "nacv-media-card")!.trigger("click");
		expect(onOpen).toHaveBeenCalledOnce();
	});

	it.each(["large", "standard", "compact", "poster"] as CatalogDensity[])(
		"behält in der Dichte %s Navigation und Auswahl als gemeinsames Interaktionsprinzip",
		(density) => {
			installDocument();
			const item = movie();
			const normalRoot = new FakeElement();
			const onOpen = vi.fn();
			renderCatalog(normalRoot as never, {
				items: [item], headingContainer: new FakeElement() as never, filter: { ...DEFAULT_CATALOG_FILTER },
				sort: { key: "title", direction: "asc" }, density,
				onFilterChange: vi.fn(), onSortChange: vi.fn(), onDensityChange: vi.fn(), onOpen,
			});
			find(normalRoot, "nacv-media-card")!.trigger("click");
			expect(onOpen).toHaveBeenCalledOnce();

			const selectionRoot = new FakeElement();
			const onToggle = vi.fn();
			const selectionOpen = vi.fn();
			renderCatalog(selectionRoot as never, {
				items: [item], headingContainer: new FakeElement() as never, filter: { ...DEFAULT_CATALOG_FILTER },
				sort: { key: "title", direction: "asc" }, density,
				onFilterChange: vi.fn(), onSortChange: vi.fn(), onDensityChange: vi.fn(), onOpen: selectionOpen,
				selection: {
					active: true, selectedIds: new Set([item.id]), onStart: vi.fn(), onExit: vi.fn(), onClear: vi.fn(),
					onToggle, onDelete: vi.fn(),
				},
			});
			const selectedCard = find(selectionRoot, "nacv-media-card")!;
			expect(classes(selectedCard)).toContain("nacv-media-card--selected");
			expect(selectedCard.attributes.get("aria-selected")).toBe("true");
			expect(find(selectedCard, "nacv-media-card__selection--selected")).toBeDefined();
			selectedCard.trigger("click");
			expect(onToggle).toHaveBeenCalledWith(item);
			expect(selectionOpen).not.toHaveBeenCalled();
		},
	);

	it("rendert je Dichte ausschließlich den vorgesehenen Karteninhalt", () => {
		installDocument();
		const item = movie();
		const renderDensity = (density: CatalogDensity): FakeElement => {
			const root = new FakeElement();
			renderCatalog(root as never, {
				items: [item], headingContainer: new FakeElement() as never, filter: { ...DEFAULT_CATALOG_FILTER },
				sort: { key: "title", direction: "asc" }, density,
				onFilterChange: vi.fn(), onSortChange: vi.fn(), onDensityChange: vi.fn(), onOpen: vi.fn(),
			});
			return find(root, "nacv-media-card")!;
		};

		const standard = renderDensity("standard");
		expect(find(standard, "nacv-media-card__original")).toBeDefined();
		expect(find(standard, "nacv-media-card__zone--genres")).toBeDefined();
		expect(find(standard, "nacv-media-card__zone--status")).toBeDefined();
		expect(find(standard, "nacv-media-card__zone--rating")).toBeDefined();

		const large = renderDensity("large");
		expect(classes(large)).toContain("nacv-media-card--large");
		expect(find(large, "nacv-media-card__original")).toBeDefined();
		expect(find(large, "nacv-media-card__zone--genres")).toBeDefined();

		const compact = renderDensity("compact");
		expect(classes(compact)).toContain("nacv-media-card--compact");
		expect(find(compact, "nacv-media-card__visual")).toBeDefined();
		expect(find(compact, "nacv-media-card__title")).toBeDefined();
		expect(find(compact, "nacv-media-card__compact-year")?.textContent).toBe("2020");
		const compactScores = find(compact, "nacv-media-card__zone--scores")!;
		expect(compactScores.children.map((child) => child.textContent)).toEqual(["IMDb: 8.4", "TMDB: 8.1"]);
		expect(classes(compactScores)).toContain("nacv-media-card__compact-scores");
		expect(compactScores.children.map((child) => child.textContent).join("")).not.toContain("·");
		expect(find(compact, "nacv-media-card__zone--rating")).toBeDefined();
		expect(find(compact, "nacv-media-card__original")).toBeUndefined();
		expect(find(compact, "nacv-media-card__zone--genres")).toBeUndefined();

		const poster = renderDensity("poster");
		expect(classes(poster)).toContain("nacv-media-card--poster");
		expect(find(poster, "nacv-media-card__visual")).toBeDefined();
		expect(poster.children).toHaveLength(1);
		expect(find(poster, "nacv-media-card__body")).toBeUndefined();
		expect(find(poster, "nacv-media-card__poster-fallback-title")).toBeUndefined();
		expect(poster.attributes.get("title")).toBe(item.title);
		expect(poster.attributes.get("aria-label")).toBe(item.title);
		expect(find(poster, "nacv-media-card__original")).toBeUndefined();
		expect(find(poster, "nacv-media-card__zone--genres")).toBeUndefined();
		expect(find(poster, "nacv-media-card__zone--scores")).toBeUndefined();
		expect(find(poster, "nacv-media-card__zone--status")).toBeUndefined();
	});

	it("rendert Compact-Scores einzeln und nur bei vorhandenem Wert", () => {
		installDocument();
		const renderScores = (imdbRating: number | undefined, tmdbRating: number | undefined): string[] => {
			const root = new FakeElement();
			renderCatalog(root as never, {
				items: [movie({ imdbRating, tmdbRating })], headingContainer: new FakeElement() as never,
				filter: { ...DEFAULT_CATALOG_FILTER }, sort: { key: "title", direction: "asc" }, density: "compact",
				onFilterChange: vi.fn(), onSortChange: vi.fn(), onDensityChange: vi.fn(), onOpen: vi.fn(),
			});
			return find(root, "nacv-media-card__compact-scores")!.children.map((child) => child.textContent);
		};

		expect(renderScores(7.5, 8)).toEqual(["IMDb: 7.5", "TMDB: 8.0"]);
		expect(renderScores(7.5, undefined)).toEqual(["IMDb: 7.5"]);
		expect(renderScores(undefined, 8)).toEqual(["TMDB: 8.0"]);
		expect(renderScores(undefined, undefined)).toEqual([]);
	});

	it("zeigt in der Posterwand nur bei fehlendem oder fehlerhaftem Bild den Titel", () => {
		installDocument();
		const renderPoster = (cover: string | undefined): FakeElement => {
			const root = new FakeElement();
			renderCatalog(root as never, {
				items: [movie({ cover })], headingContainer: new FakeElement() as never,
				filter: { ...DEFAULT_CATALOG_FILTER }, sort: { key: "title", direction: "asc" }, density: "poster",
				onFilterChange: vi.fn(), onSortChange: vi.fn(), onDensityChange: vi.fn(), onOpen: vi.fn(),
			});
			return find(root, "nacv-media-card")!;
		};

		const missing = renderPoster(undefined);
		const missingVisual = find(missing, "nacv-image-placeholder")!;
		expect(missing.children).toHaveLength(1);
		expect(find(missing, "nacv-media-card__body")).toBeUndefined();
		expect(find(missingVisual, "nacv-media-card__poster-fallback-label")?.textContent).toBe("Kein Bild");
		expect(find(missingVisual, "nacv-media-card__poster-fallback-title")?.textContent).toBe("Ära des Films");
		expect(missing.attributes.get("title")).toBe("Ära des Films");
		expect(missing.attributes.get("aria-label")).toBe("Ära des Films");

		const broken = renderPoster("https://images.example/broken.jpg");
		const image = find(broken, "nacv-media-card__image")!;
		image.trigger("error");
		const brokenVisual = find(broken, "nacv-image-placeholder")!;
		expect(find(broken, "nacv-media-card__body")).toBeUndefined();
		expect(find(brokenVisual, "nacv-media-card__poster-fallback-title")?.textContent).toBe("Ära des Films");
	});
});
