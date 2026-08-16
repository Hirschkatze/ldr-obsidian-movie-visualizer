import { afterEach, describe, expect, it, vi } from "vitest";
import { Notice } from "obsidian";
import { renderMediaDetail } from "../src/phase2/ui/MediaDetailView";
import { movie } from "./phase2-fixtures";

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

function renderDetail(personalRating = 8): { root: FakeElement; personalActions: ReturnType<typeof actions> } {
	installDocument();
	(Notice as unknown as { messages: string[] }).messages.length = 0;
	const root = new FakeElement();
	const personalActions = actions();
	renderMediaDetail(root as never, {
		app: { workspace: { getLeaf: vi.fn(), openLinkText: vi.fn() } } as never,
		media: movie({
			personalRating, cover: undefined, backdrop: undefined, sourceUrl: undefined, imdbId: undefined,
			trailer: undefined, directors: [], writers: [], cast: [], categories: [], collections: [],
		}),
		personalActions: personalActions as never,
		onPersonalActionSettled: vi.fn(),
		onBack: vi.fn(),
	});
	return { root, personalActions };
}

afterEach(() => {
	vi.unstubAllGlobals();
	(Notice as unknown as { messages: string[] }).messages.length = 0;
});

describe("Aktive Detailansicht: persönliche Sternbewertung", () => {
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
