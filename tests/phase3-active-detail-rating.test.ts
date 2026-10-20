import { afterEach, describe, expect, it, vi } from "vitest";
import { Notice } from "obsidian";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderMediaDetail } from "../src/phase2/ui/MediaDetailView";
import { backdropDisplayMode, LANDSCAPE_BACKDROP_MIN_ASPECT_RATIO } from "../src/phase2/ui/BackdropDisplay";
import type { MediaItem } from "../src/types";
import { movie, series } from "./phase2-fixtures";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	dataset: Record<string, string> = {};
	parentElement?: FakeElement;
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<(event: any) => void>>();
	disabled = false;
	checked = false;
	selected = false;
	value = "";
	complete = false;
	naturalWidth = 0;
	naturalHeight = 0;
	classList = {
		add: (name: string) => this.addClass(name),
		remove: (name: string) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); },
	};

	appendChild(child: FakeElement): FakeElement { child.parentElement = this; this.children.push(child); return child; }
	empty(): void { this.children = []; }
	addClass(name: string): void { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); }
	replaceWith(): void {}
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
	addEventListener(name: string, listener: (event: any) => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}
	trigger(name: string, event: any = {}): void { for (const listener of this.listeners.get(name) ?? []) listener(event); }
	closest(selector: string): FakeElement | null {
		if (selector === ".nacv-star" && this.className.split(/\s+/).includes("nacv-star")) return this;
		return this.parentElement?.closest(selector) ?? null;
	}
	contains(element: FakeElement): boolean { return this === element || this.children.some((child) => child.contains(element)); }
	getBoundingClientRect(): { left: number; width: number } { return { left: 0, width: 100 }; }
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

function classes(element: FakeElement): string[] {
	return `${element.className} ${element.attributes.get("class") ?? ""}`.split(/\s+/).filter(Boolean);
}

function findAll(root: FakeElement, className: string): FakeElement[] {
	return [classes(root).includes(className) ? [root] : [], ...root.children.map((child) => findAll(child, className))].flat();
}

function descendants(root: FakeElement): FakeElement[] {
	return [root, ...root.children.flatMap(descendants)];
}

function actions() {
	return {
		isPending: vi.fn(() => false), setRating: vi.fn(async () => true), setFavorite: vi.fn(async () => true),
		setWatchStatus: vi.fn(async () => true), setLastWatched: vi.fn(async () => true),
		setLastWatchedToday: vi.fn(async () => true), markWatched: vi.fn(async () => true),
		rewatch: vi.fn(async () => true), correctUnwatched: vi.fn(async () => true),
		setSeriesProgress: vi.fn(async () => true),
	};
}

function renderItem(media: MediaItem): {
	root: FakeElement;
	personalActions: ReturnType<typeof actions>;
	openFile: ReturnType<typeof vi.fn>;
	openLinkText: ReturnType<typeof vi.fn>;
} {
	installDocument();
	(Notice as unknown as { messages: string[] }).messages.length = 0;
	const root = new FakeElement();
	const personalActions = actions();
	const openFile = vi.fn();
	const openLinkText = vi.fn();
	renderMediaDetail(root as never, {
		app: { workspace: { getLeaf: vi.fn(() => ({ openFile })), openLinkText } } as never,
		media,
		personalActions: personalActions as never,
		onPersonalActionSettled: vi.fn(),
		onBack: vi.fn(),
	});
	return { root, personalActions, openFile, openLinkText };
}

function renderDetail(personalRating = 8): ReturnType<typeof renderItem> {
	return renderItem(movie({
		personalRating, cover: undefined, backdrop: undefined, sourceUrl: undefined, imdbId: undefined,
		trailer: undefined, directors: [], writers: [], cast: [], categories: [], collections: [],
	}));
}

afterEach(() => {
	vi.unstubAllGlobals();
	(Notice as unknown as { messages: string[] }).messages.length = 0;
});

describe("Aktive Detailansicht: persönliche Sternbewertung", () => {
	it.each([
		[1920, 1080, "landscape"],
		[1280, 720, "landscape"],
		[1000, 1000, "background"],
		[800, 1200, "background"],
	] as const)("ordnet ein Backdrop mit %i × %i dem Modus %s zu", (width, height, expected) => {
		expect(LANDSCAPE_BACKDROP_MIN_ASPECT_RATIO).toBe(1.45);
		expect(backdropDisplayMode(width, height)).toBe(expected);
	});

	it.each([
		["Film", movie()],
		["Serie", series()],
	] as const)("rendert das kompakte V1.2-Hero-Gerüst für %s und erhält Interaktionen", (_label, media) => {
		const { root, openFile, openLinkText } = renderItem(media);
		const hero = findAll(root, "nacv-detail__hero");
		const backdrop = findAll(root, "nacv-detail__backdrop");
		const poster = findAll(root, "nacv-detail__poster");
		const infoCard = findAll(root, "nacv-detail__info-card");
		expect(hero).toHaveLength(1);
		expect(backdrop).toHaveLength(1);
		expect(poster).toHaveLength(1);
		expect(infoCard).toHaveLength(1);
		expect(classes(infoCard[0])).toContain("nacv-detail__heading");
		expect(infoCard[0].parentElement).toBe(findAll(root, "nacv-detail__header")[0]);
		expect(findAll(infoCard[0], "nacv-detail__hero-summary")).toHaveLength(0);
		expect(findAll(infoCard[0], "nacv-detail__hero-plot")).toHaveLength(0);
		const title = descendants(infoCard[0]).find((element) => element.tagName === "h1");
		expect(title?.textContent).toBe(media.title);
		expect(findAll(root, "nacv-stars")).toHaveLength(1);
		expect(findAll(root, "nacv-person-links").length).toBeGreaterThan(0);
		const detailActions = findAll(infoCard[0], "nacv-detail__actions");
		expect(detailActions).toHaveLength(1);
		const noteButton = descendants(detailActions[0]).find((element) => element.textContent === "Notiz öffnen")!;
		noteButton.trigger("click");
		expect(openFile).toHaveBeenCalledOnce();
		const personButton = findAll(root, "nacv-person-link")[0];
		personButton.trigger("click", { stopPropagation: vi.fn() });
		expect(openLinkText).toHaveBeenCalledOnce();
	});

	it("aktiviert für ein Portrait-Backdrop ausschließlich den atmosphärischen Background-Modus", () => {
		const source = "app://vault/Assets/portrait-backdrop.jpg";
		const { root } = renderItem(movie({ backdrop: source }));
		const hero = findAll(root, "nacv-detail__hero")[0];
		const image = findAll(root, "nacv-detail__backdrop-image")[0];
		const poster = findAll(root, "nacv-detail__poster")[0];
		const infoCard = findAll(root, "nacv-detail__info-card")[0];
		image.naturalWidth = 800;
		image.naturalHeight = 1200;
		image.trigger("load");
		expect(classes(hero)).toContain("nacv-detail__hero--background");
		expect(classes(hero)).not.toContain("nacv-detail__hero--landscape");
		expect(image.getAttribute("src")).toBe(source);
		expect(findAll(root, "nacv-detail__backdrop-fill")).toHaveLength(0);
		expect(poster.parentElement).toBe(findAll(root, "nacv-detail__header")[0]);
		expect(infoCard.parentElement).toBe(findAll(root, "nacv-detail__header")[0]);
	});

	it("behält für ein breites Backdrop den Landscape-Modus ohne zusätzliche Füllebene", () => {
		const { root } = renderItem(movie({ backdrop: "app://vault/Assets/wide-backdrop.jpg" }));
		const hero = findAll(root, "nacv-detail__hero")[0];
		const image = findAll(root, "nacv-detail__backdrop-image")[0];
		image.naturalWidth = 1920;
		image.naturalHeight = 1080;
		image.trigger("load");
		expect(classes(hero)).toContain("nacv-detail__hero--landscape");
		expect(classes(hero)).not.toContain("nacv-detail__hero--background");
		expect(findAll(root, "nacv-detail__backdrop-fill")).toHaveLength(0);
	});

	it("führt das Backdrop hinter der containerbreitenabhängigen, unten ausgerichteten Hero-Gruppe weiter", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-detail\s*\{[^}]*container-name:\s*nacv-detail;[^}]*container-type:\s*inline-size;/s);
		expect(css).toMatch(/\.nacv-detail__hero\s*\{[^}]*position:\s*relative;[^}]*height:\s*clamp\([^)]*cqw[^)]*\);[^}]*overflow:\s*hidden;/s);
		expect(css).toContain("height: clamp(480px, 56cqw, 820px);");
		expect(css).toMatch(/\.nacv-detail__backdrop\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*height:\s*100%;/s);
		expect(css).toMatch(/\.nacv-detail__backdrop::after\s*\{[^}]*linear-gradient\([^}]*var\(--background-secondary\) 100%/s);
		expect(css).toMatch(/\.nacv-detail__hero--landscape \.nacv-detail__backdrop-image\s*\{[^}]*object-fit:\s*cover;/s);
		expect(css).toMatch(/\.nacv-detail__hero--background \.nacv-detail__backdrop-image\s*\{[^}]*object-fit:\s*cover;[^}]*filter:\s*blur\([^}]*brightness\(/s);
		expect(css).not.toMatch(/\.nacv-detail__hero--background \.nacv-detail__backdrop-image\s*\{[^}]*object-fit:\s*contain;/s);
		expect(css).toMatch(/\.nacv-detail__info-card\s*\{[^}]*height:\s*auto;[^}]*max-width:\s*min\(480px, 100%\);[^}]*padding:\s*8px 10px;/s);
		expect(css).toMatch(/\.nacv-detail__heading h1\s*\{[^}]*font-size:\s*24px;[^}]*line-height:\s*1;/s);
		expect(css).toMatch(/\.nacv-detail__info-card \.nacv-fact-list\s*\{[^}]*grid-template-columns:\s*max-content minmax\(0, 1fr\);[^}]*gap:\s*1px 8px;/s);
		expect(css).toMatch(/\.nacv-detail__info-card \.nacv-fact-list dd\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s);
		expect(css).toMatch(/@container nacv-detail \(max-width: 780px\)[\s\S]*?\.nacv-detail__info-card \.nacv-fact-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s);
		expect(css).toMatch(/@container nacv-detail \(max-width: 620px\)[\s\S]*?\.nacv-detail \.nacv-detail__header\s*\{[^}]*grid-template-columns:\s*1fr;/s);
		const infoCardRule = css.match(/\.nacv-detail__info-card\s*\{([^}]*)\}/s)?.[1] ?? "";
		expect(infoCardRule).not.toMatch(/\b(?:transform|zoom|overflow)\s*:/);
		expect(css).toMatch(/\.nacv-detail__header\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*grid-template-columns:[^}]*align-items:\s*end;[^}]*align-content:\s*end;[^}]*padding:\s*0 24px clamp\([^)]*cqw[^)]*\);/s);
		expect(css).toMatch(/@media \(max-width: 460px\)[\s\S]*?\.nacv-detail__header\s*\{[^}]*grid-template-columns:\s*1fr;/s);
		expect(css).toContain("min-height: clamp(760px, 185cqw, 900px);");
		expect(css).not.toMatch(/\.nacv-detail__header\s*\{[^}]*margin-top:\s*-/s);
	});

	it("rendert in Mein Eintrag zehn direkt adressierbare Textsterne ohne Trefferflächen oder SVG", () => {
		const { root } = renderDetail();
		const personalEntry = findAll(root, "nacv-personal-entry")[0];
		const stars = findAll(personalEntry, "nacv-star");
		expect(stars).toHaveLength(10);
		expect(stars.every((star) => star.tagName === "span" && star.textContent === "★")).toBe(true);
		expect(stars.map((star) => star.dataset.star)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
		expect(stars.every((star) => star.children.length === 0)).toBe(true);
		expect(findAll(personalEntry, "nacv-star-zone")).toHaveLength(0);
		expect(descendants(personalEntry).some((element) => element.tagName === "svg")).toBe(false);
	});

	it.each([
		["left", 0, 0.5], ["right", 0, 1], ["left", 7, 7.5],
		["right", 7, 8], ["left", 9, 9.5], ["right", 9, 10],
	] as const)("schreibt bei Sternhälfte %s/%i exakt den Wert %s", (side, index, expected) => {
		const { root, personalActions } = renderDetail();
		const rating = findAll(root, "nacv-stars")[0];
		const star = findAll(rating, "nacv-star")[index];
		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();
		const closest = vi.spyOn(star, "closest");
		rating.trigger("click", { target: star, clientX: side === "left" ? 25 : 75, preventDefault, stopPropagation });
		expect(preventDefault).toHaveBeenCalledOnce();
		expect(stopPropagation).toHaveBeenCalledOnce();
		expect(personalActions.setRating).toHaveBeenCalledOnce();
		expect(personalActions.setRating).toHaveBeenCalledWith(expect.objectContaining({ type: "movie" }), expected);
		expect(closest).toHaveBeenCalledWith(".nacv-star");
		expect((Notice as unknown as { messages: string[] }).messages).toHaveLength(0);
	});

	it("zeigt beim Hover nur eine Vorschau und stellt beim Verlassen den gespeicherten Wert wieder her", () => {
		const { root, personalActions } = renderDetail(8);
		const rating = findAll(root, "nacv-stars")[0];
		const output = findAll(rating, "nacv-stars__value")[0];
		const seventhStar = findAll(rating, "nacv-star")[6];
		rating.trigger("pointermove", { target: seventhStar, clientX: 25 });
		expect(output.textContent).toBe("6,5 / 10");
		expect(personalActions.setRating).not.toHaveBeenCalled();
		rating.trigger("pointerleave");
		expect(output.textContent).toBe("8 / 10");
		expect(personalActions.setRating).not.toHaveBeenCalled();
	});

	it("verwendet ohne sichtbaren Tooltip weiterhin eine vollständige ARIA-Beschriftung", () => {
		const { root } = renderDetail();
		const rating = findAll(root, "nacv-stars")[0];
		const stars = findAll(rating, "nacv-star");
		expect(rating.attributes.has("title")).toBe(false);
		expect(stars.every((star) => !star.attributes.has("title"))).toBe(true);
		const labelId = rating.attributes.get("aria-labelledby");
		expect(labelId).toMatch(/^nacv-personal-rating-label-/);
		expect(descendants(root).some((element) => element.attributes.get("id") === labelId && element.textContent === "Persönliche Bewertung")).toBe(true);
		expect(rating.attributes.get("aria-valuemin")).toBe("0");
		expect(rating.attributes.get("aria-valuemax")).toBe("10");
		expect(rating.attributes.get("aria-valuenow")).toBe("8");
		expect(rating.attributes.get("aria-valuetext")).toBe("8 / 10");
	});
});
