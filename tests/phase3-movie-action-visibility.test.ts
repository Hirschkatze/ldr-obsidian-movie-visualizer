import { afterEach, describe, expect, it, vi } from "vitest";
import { movieActionVisibility } from "../src/phase3/movieActionVisibility";
import { createPersonalEntryControls } from "../src/phase3/ui/PersonalEntryControls";
import { movie } from "./phase2-fixtures";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	dataset: Record<string, string> = {};
	parentElement?: FakeElement;
	disabled = false;
	checked = false;
	selected = false;
	value = "";
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<(event: unknown) => void>>();
	classList = {
		add: (name: string) => { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); },
		remove: (name: string) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); },
	};

	createEl(_tag: string, options: { cls?: string; text?: string; attr?: Record<string, string> } = {}): FakeElement {
		const child = new FakeElement();
		child.className = options.cls ?? "";
		child.textContent = options.text ?? "";
		child.value = options.attr?.value ?? "";
		this.children.push(child);
		return child;
	}
	createSpan(options: { text?: string } = {}): FakeElement { return this.createEl("span", options); }
	createDiv(value?: string | { cls?: string; text?: string }): FakeElement {
		return this.createEl("div", typeof value === "string" ? { cls: value } : value);
	}
	appendChild(child: FakeElement): FakeElement { child.parentElement = this; this.children.push(child); return child; }
	get firstElementChild(): FakeElement | undefined { return this.children[0]; }
	replaceChild(next: FakeElement, previous: FakeElement): FakeElement {
		const index = this.children.indexOf(previous);
		this.children[index] = next;
		return previous;
	}
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
	addEventListener(name: string, listener: (event: unknown) => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}
	trigger(name: string, event: unknown = {}): void {
		for (const listener of this.listeners.get(name) ?? []) listener(event);
	}
	closest(selector: string): FakeElement | null {
		if (selector === ".nacv-star" && this.className.split(/\s+/).includes("nacv-star")) return this;
		return this.parentElement?.closest(selector) ?? null;
	}
	contains(element: FakeElement): boolean { return this === element || this.children.some((child) => child.contains(element)); }
	getBoundingClientRect(): { left: number; width: number } { return { left: 0, width: 100 }; }
}

function labels(root: FakeElement): string[] {
	return [root.textContent, ...root.children.flatMap(labels)].filter(Boolean);
}

function findAll(root: FakeElement, className: string): FakeElement[] {
	const own = root.className.split(/\s+/).includes(className) ? [root] : [];
	return [own, ...root.children.map((child) => findAll(child, className))].flat();
}

function actionMocks() {
	return {
		isPending: vi.fn(() => false), setRating: vi.fn(), setFavorite: vi.fn(), setWatchStatus: vi.fn(),
		setLastWatched: vi.fn(), setLastWatchedToday: vi.fn(), markWatched: vi.fn(), rewatch: vi.fn(),
		correctUnwatched: vi.fn(), setSeriesProgress: vi.fn(),
	};
}

afterEach(() => vi.unstubAllGlobals());

describe("Sichtbarkeit der Filmaktionen", () => {
	it("zeigt bei fehlendem oder auf 0 normalisiertem watchCount nur Als gesehen markieren", () => {
		expect(movieActionVisibility(undefined)).toEqual({ showMarkWatched: true, showRewatch: false, showCorrectUnwatched: false });
		expect(movieActionVisibility(0)).toEqual({ showMarkWatched: true, showRewatch: false, showCorrectUnwatched: false });
	});

	it("zeigt bei watchCount 1 und größer als 1 nur die Aktionen für gesehene Filme", () => {
		const expected = { showMarkWatched: false, showRewatch: true, showCorrectUnwatched: true };
		expect(movieActionVisibility(1)).toEqual(expected);
		expect(movieActionVisibility(4)).toEqual(expected);
	});

	it("ignoriert bei inkonsistentem completed-Zustand Status und Datum", () => {
		expect(movieActionVisibility(movie({ watchStatus: "completed", lastWatched: "2026-08-04", watchCount: 0 }).watchCount))
			.toEqual({ showMarkWatched: true, showRewatch: false, showCorrectUnwatched: false });
	});

	it("wechselt nach aktualisiertem watchCount beim erneuten Rendern die sichtbaren Schaltflächen", () => {
		vi.stubGlobal("document", {
			createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
		});
		const actions = actionMocks();
		const first = createPersonalEntryControls({ media: movie({ watchCount: 0 }), actions: actions as never, onSettled: vi.fn() }) as unknown as FakeElement;
		expect(labels(first)).toContain("Als gesehen markieren");
		expect(labels(first)).not.toContain("Erneut gesehen");
		const second = createPersonalEntryControls({ media: movie({ watchCount: 1 }), actions: actions as never, onSettled: vi.fn() }) as unknown as FakeElement;
		expect(labels(second)).not.toContain("Als gesehen markieren");
		expect(labels(second)).toContain("Erneut gesehen");
		expect(labels(second)).toContain("Als ungesehen korrigieren");
	});

	it("löst durch das reine Rendern keine Schreibaktion aus", () => {
		vi.stubGlobal("document", {
			createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
		});
		const actions = actionMocks();
		createPersonalEntryControls({ media: movie({ watchCount: 0 }), actions: actions as never, onSettled: vi.fn() });
		for (const [name, mock] of Object.entries(actions)) if (name !== "isPending") expect(mock).not.toHaveBeenCalled();
	});

	it("schreibt beim doppelten Klick auf dieselbe Sternhälfte exakt einmal", async () => {
		vi.stubGlobal("document", {
			createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
		});
		const actions = actionMocks();
		const item = movie({ personalRating: undefined });
		const controls = createPersonalEntryControls({ media: item, actions: actions as never, onSettled: vi.fn() }) as unknown as FakeElement;
		const rating = findAll(controls, "nacv-stars")[0];
		const firstStar = findAll(rating, "nacv-star")[0];
		const stopPropagation = vi.fn();
		const preventDefault = vi.fn();
		const event = { target: firstStar, clientX: 25, preventDefault, stopPropagation };
		rating.trigger("click", event);
		rating.trigger("click", event);
		expect(stopPropagation).toHaveBeenCalledTimes(2);
		expect(actions.setRating).toHaveBeenCalledOnce();
		expect(actions.setRating).toHaveBeenCalledWith(item, 0.5);
		await Promise.resolve();
	});

	it("behält Bewertung entfernen als getrennte Aktion mit exakt 0 bei", () => {
		vi.stubGlobal("document", {
			createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
		});
		const actions = actionMocks();
		const item = movie({ personalRating: 8.5 });
		const controls = createPersonalEntryControls({ media: item, actions: actions as never, onSettled: vi.fn() }) as unknown as FakeElement;
		const remove = findAll(controls, "nacv-button").find((element) => element.textContent === "Bewertung entfernen")!;
		remove.trigger("click");
		expect(actions.setRating).toHaveBeenCalledOnce();
		expect(actions.setRating).toHaveBeenCalledWith(item, 0);
	});
});
