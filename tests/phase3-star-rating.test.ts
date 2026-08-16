import { afterEach, describe, expect, it, vi } from "vitest";
import { Notice } from "obsidian";
import {
	createStarRating,
	formatPersonalRating,
	keyboardRating,
	starFillStates,
} from "../src/phase3/ui/StarRating";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	dataset: Record<string, string> = {};
	parentElement?: FakeElement;
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<(event: any) => void>>();
	classList = {
		add: (name: string) => { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); },
	};
	appendChild(child: FakeElement): FakeElement { child.parentElement = this; this.children.push(child); return child; }
	get firstElementChild(): FakeElement | undefined { return this.children[0]; }
	replaceChild(next: FakeElement, previous: FakeElement): FakeElement {
		const index = this.children.indexOf(previous);
		this.children[index] = next;
		return previous;
	}
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
}

function installDocument(): void {
	vi.stubGlobal("document", {
		createElement: (tag: string) => Object.assign(new FakeElement(), { tagName: tag }),
	});
}

function control(value: number | undefined, onCommit = vi.fn(), extra: { compact?: boolean; stopPropagation?: boolean } = {}) {
	installDocument();
	(Notice as unknown as { messages: string[] }).messages.length = 0;
	const root = createStarRating({ value, readonly: false, size: "lg", onChange: onCommit, stopPropagation: extra.stopPropagation }) as unknown as FakeElement;
	const stars = root;
	const output = root.children[10];
	return { root, stars, output, onCommit };
}

function pointerEvent(stars: FakeElement, value: number) {
	const target = stars.children[Math.ceil(value) - 1];
	return {
		target,
		clientX: value % 1 === 0.5 ? 25 : 75,
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
	(Notice as unknown as { messages: string[] }).messages.length = 0;
});

describe("Interaktive Sternbewertung", () => {
	it("bildet leere, halbe und volle Sterne korrekt ab", () => {
		expect(starFillStates(0).every((fill) => fill === "empty")).toBe(true);
		expect(starFillStates(7.5)).toEqual([
			"full", "full", "full", "full", "full", "full", "full", "half", "empty", "empty",
		]);
		expect(starFillStates(10).every((fill) => fill === "full")).toBe(true);
	});

	it("rendert genau zehn textbasierte Sterne ohne SVG und bildet den Halbstern per Klasse ab", () => {
		const { stars } = control(8.5);
		const visibleStars = stars.children.slice(0, 10);
		expect(visibleStars).toHaveLength(10);
		expect(visibleStars.every((star) => star.tagName === "span" && star.textContent === "★")).toBe(true);
		expect(visibleStars.some((star) => star.tagName === "svg")).toBe(false);
		expect(stars.children[7].className).toContain("nacv-star--full");
		expect(stars.children[8].className).toContain("nacv-star--half");
		expect(stars.children[9].className).toContain("nacv-star--empty");
		expect(visibleStars.every((star) => star.children.length === 0)).toBe(true);
		expect(visibleStars.map((star) => star.dataset.star)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
	});

	it("formatiert 0 als nicht bewertet und Dezimalwerte deutsch", () => {
		expect(formatPersonalRating(undefined)).toBe("Nicht bewertet");
		expect(formatPersonalRating(0)).toBe("Nicht bewertet");
		expect(formatPersonalRating(8.5)).toBe("8,5 / 10");
	});

	it("ordnet alle geforderten Sternhälften den exakten Zahlenwerten zu", () => {
		for (const value of [0.5, 1, 7.5, 8, 8.5, 9.5, 10]) {
			const { stars, onCommit } = control(0);
			const event = pointerEvent(stars, value);
			const closest = vi.spyOn(event.target, "closest");
			stars.trigger("click", event);
			expect(onCommit).toHaveBeenCalledOnce();
			expect(onCommit).toHaveBeenCalledWith(value);
			expect(event.preventDefault).toHaveBeenCalledOnce();
			expect(event.stopPropagation).toHaveBeenCalledOnce();
			expect(closest).toHaveBeenCalledWith(".nacv-star");
			expect((Notice as unknown as { messages: string[] }).messages).toHaveLength(0);
			expect(typeof onCommit.mock.calls[0][0]).toBe("number");
			vi.unstubAllGlobals();
			(Notice as unknown as { messages: string[] }).messages.length = 0;
		}
	});

	it("schreibt weder beim Rendern noch beim Hover und stellt danach den gespeicherten Wert dar", () => {
		const { root, stars, output, onCommit } = control(8);
		expect(onCommit).not.toHaveBeenCalled();
		root.trigger("pointermove", pointerEvent(stars, 9.5));
		expect(output.textContent).toBe("9,5 / 10");
		expect(onCommit).not.toHaveBeenCalled();
		expect((Notice as unknown as { messages: string[] }).messages).toHaveLength(0);
		root.trigger("pointerleave");
		expect(output.textContent).toBe("8 / 10");
	});

	it("verändert die Tastaturauswahl in 0,5-Schritten und bestätigt nur mit Enter oder Leertaste", () => {
		expect(keyboardRating(8, "ArrowRight")).toBe(8.5);
		expect(keyboardRating(8, "ArrowLeft")).toBe(7.5);
		const { root, output, onCommit } = control(8);
		const preventDefault = vi.fn();
		root.trigger("keydown", { key: "ArrowRight", preventDefault });
		expect(output.textContent).toBe("8,5 / 10");
		expect(onCommit).not.toHaveBeenCalled();
		root.trigger("keydown", { key: "Enter", preventDefault });
		expect(onCommit).toHaveBeenCalledWith(8.5);
	});

	it("unterstützt Home, End und Bestätigung per Leertaste", () => {
		const { root, output, onCommit } = control(4);
		const preventDefault = vi.fn();
		root.trigger("keydown", { key: "Home", preventDefault });
		expect(output.textContent).toBe("Nicht bewertet");
		root.trigger("keydown", { key: "End", preventDefault });
		expect(output.textContent).toBe("10 / 10");
		root.trigger("keydown", { key: " ", preventDefault });
		expect(onCommit).toHaveBeenCalledWith(10);
	});

	it("trennt die Detailbewertung per stopPropagation von übergeordneten Klickzielen", () => {
		const { root, stars, onCommit } = control(0, vi.fn(), { stopPropagation: true });
		const clickEvent = pointerEvent(stars, 7.5);
		root.trigger("click", clickEvent);
		expect(clickEvent.stopPropagation).toHaveBeenCalledOnce();
		expect(onCommit).toHaveBeenCalledWith(7.5);
		const keyStop = vi.fn();
		root.trigger("keydown", { key: "ArrowRight", preventDefault: vi.fn(), stopPropagation: keyStop });
		expect(keyStop).toHaveBeenCalledOnce();
	});
});
