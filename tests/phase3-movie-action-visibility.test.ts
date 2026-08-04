import { afterEach, describe, expect, it, vi } from "vitest";
import { movieActionVisibility } from "../src/phase3/movieActionVisibility";
import { createPersonalEntryControls } from "../src/phase3/ui/PersonalEntryControls";
import { movie } from "./phase2-fixtures";

class FakeElement {
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	disabled = false;
	checked = false;
	selected = false;
	value = "";

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
	addEventListener(): void {}
}

function labels(root: FakeElement): string[] {
	return [root.textContent, ...root.children.flatMap(labels)].filter(Boolean);
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
		vi.stubGlobal("document", { createElement: () => new FakeElement() });
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
		vi.stubGlobal("document", { createElement: () => new FakeElement() });
		const actions = actionMocks();
		createPersonalEntryControls({ media: movie({ watchCount: 0 }), actions: actions as never, onSettled: vi.fn() });
		for (const [name, mock] of Object.entries(actions)) if (name !== "isPending") expect(mock).not.toHaveBeenCalled();
	});
});
