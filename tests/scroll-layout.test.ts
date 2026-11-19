import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	forwardSplitLayoutWheel,
	observeScrollLayout,
	PRIMARY_SCROLL_ATTRIBUTE,
	SPLIT_SCROLL_LAYOUT_CLASS,
	SPLIT_SCROLL_MIN_CONTENT_HEIGHT,
	SPLIT_SCROLL_MIN_HEIGHT,
	SPLIT_SCROLL_MIN_WIDTH,
	updateScrollLayout,
} from "../src/ScrollLayout";
import { applyLayoutWidth, LAYOUT_WIDTH_MODES } from "../src/LayoutWidth";
import type { CatalogDensity } from "../src/phase2/types";

class FakeStyle {
	private readonly values = new Map<string, string>();
	setProperty(name: string, value: string): void { this.values.set(name, value); }
	getPropertyValue(name: string): string { return this.values.get(name) ?? ""; }
}

class FakeScrollElement {
	scrollTop = 0;
	clientHeight = 600;
	contains(): boolean { return false; }
}

class FakeRoot extends FakeScrollElement {
	dataset: Record<string, string> = {};
	style = new FakeStyle();
	classes = new Set<string>();
	primary = new FakeScrollElement();
	listeners = new Map<string, EventListener>();
	classList = {
		contains: (name: string) => this.classes.has(name),
		toggle: (name: string, force?: boolean) => {
			if (force) this.classes.add(name);
			else this.classes.delete(name);
			return Boolean(force);
		},
	};

	constructor(public clientWidth: number, height: number) {
		super();
		this.clientHeight = height;
	}

	querySelector(selector: string): FakeScrollElement | null {
		return selector === `[${PRIMARY_SCROLL_ATTRIBUTE}="true"]` ? this.primary : null;
	}

	addEventListener(name: string, listener: EventListener): void { this.listeners.set(name, listener); }
	removeEventListener(name: string): void { this.listeners.delete(name); }
}

class FakeHeader {
	constructor(public height: number) {}
	getBoundingClientRect(): Pick<DOMRect, "height"> { return { height: this.height }; }
}

afterEach(() => vi.unstubAllGlobals());

describe("Phase 6B.3d: strukturelle Scrollarchitektur", () => {
	it("aktiviert die getrennte Scrollarchitektur nur bei ausreichender Leaf- und Inhaltshöhe", () => {
		const root = new FakeRoot(SPLIT_SCROLL_MIN_WIDTH, SPLIT_SCROLL_MIN_HEIGHT);
		const header = new FakeHeader(SPLIT_SCROLL_MIN_HEIGHT - SPLIT_SCROLL_MIN_CONTENT_HEIGHT);
		updateScrollLayout(root as never, header as never);
		expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(true);

		root.clientWidth = SPLIT_SCROLL_MIN_WIDTH - 1;
		updateScrollLayout(root as never, header as never);
		expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(false);
		root.clientWidth = SPLIT_SCROLL_MIN_WIDTH;
		root.clientHeight = SPLIT_SCROLL_MIN_HEIGHT - 1;
		updateScrollLayout(root as never, header as never);
		expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(false);

		root.clientHeight = 800;
		header.height = 561;
		updateScrollLayout(root as never, header as never);
		expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(false);
	});

	it("überträgt die Scrollposition beim Wechsel zwischen Dokumentfluss und primärem Inhalts-Scrollport", () => {
		const root = new FakeRoot(1000, 800);
		const header = new FakeHeader(180);
		root.scrollTop = 137;
		updateScrollLayout(root as never, header as never);
		expect(root.primary.scrollTop).toBe(137);
		expect(root.scrollTop).toBe(0);

		root.primary.scrollTop = 284;
		root.clientWidth = SPLIT_SCROLL_MIN_WIDTH - 1;
		updateScrollLayout(root as never, header as never);
		expect(root.scrollTop).toBe(284);
		expect(root.primary.scrollTop).toBe(0);
	});

	it("leitet vertikales Mausrad über feststehenden Bedienbereichen an den primären Inhalt weiter", () => {
		const root = new FakeRoot(1000, 800);
		root.classes.add(SPLIT_SCROLL_LAYOUT_CLASS);
		const preventDefault = vi.fn();
		forwardSplitLayoutWheel(root as never, {
			deltaX: 0,
			deltaY: 48,
			deltaMode: 0,
			defaultPrevented: false,
			ctrlKey: false,
			target: { closest: () => null },
			preventDefault,
		} as unknown as WheelEvent);
		expect(root.primary.scrollTop).toBe(48);
		expect(preventDefault).toHaveBeenCalledOnce();
	});

	it("beobachtet Root und Bedienkopf reaktiv und trennt den Observer beim Schließen", () => {
		let callback: ResizeObserverCallback | undefined;
		const observe = vi.fn();
		const unobserve = vi.fn();
		const disconnect = vi.fn();
		class FakeResizeObserver {
			constructor(next: ResizeObserverCallback) { callback = next; }
			observe = observe;
			unobserve = unobserve;
			disconnect = disconnect;
		}
		vi.stubGlobal("ResizeObserver", FakeResizeObserver);

		const root = new FakeRoot(1000, 700);
		const observation = observeScrollLayout(root as never);
		expect(observe).toHaveBeenCalledWith(root);
		const header = new FakeHeader(180);
		observation.observeHeader(header as never);
		expect(observe).toHaveBeenCalledWith(header);
		expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(true);

		root.clientHeight = 400;
		callback?.([], {} as ResizeObserver);
		expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(false);
		observation.observeHeader(undefined);
		expect(unobserve).toHaveBeenCalledWith(header);
		observation.disconnect();
		expect(disconnect).toHaveBeenCalledOnce();
	});

	it("hält Navigation und Bedienkopf außerhalb genau eines primären Ansichts-Scrollports", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		const nacvCss = css.slice(0, css.indexOf("/* ── Custom properties"));
		expect(css).toMatch(/\.nacv-root\s*\{[^}]*height:\s*100%;[^}]*padding:\s*0;[^}]*overflow:\s*auto;/s);
		expect(css).toMatch(/\.nacv-root--split-scroll-layout\s*\{[^}]*overflow:\s*hidden;/s);
		expect(css).toMatch(/\.nacv-root--split-scroll-layout \.nacv-main\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);[^}]*overflow:\s*hidden;/s);
		expect(css).toMatch(/\.nacv-root--split-scroll-layout \.nacv-view-host\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/s);
		expect(css).toMatch(/\.nacv-root--split-scroll-layout \.nacv-view-host--catalog\s*\{[^}]*overflow:\s*hidden;/s);
		expect(nacvCss).not.toMatch(/position:\s*(?:sticky|fixed)/);
	});

	it("trennt im Katalog Filterpanel und Ergebnis-Scrollport und lässt nur das überhohe Filterpanel intern scrollen", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-root--split-scroll-layout \.nacv-catalog-layout\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s);
		expect(css).toMatch(/\.nacv-root--split-scroll-layout \.nacv-filter-panel\s*\{[^}]*max-height:\s*100%;[^}]*overflow-y:\s*auto;/s);
		expect(css).toMatch(/\.nacv-root--split-scroll-layout \.nacv-catalog-content\s*\{[^}]*overflow-y:\s*auto;/s);
		const catalog = readFileSync(join(process.cwd(), "src", "phase2", "ui", "CatalogView.ts"), "utf8");
		expect(catalog).toContain('container.setAttribute(PRIMARY_SCROLL_ATTRIBUTE, "false")');
		expect(catalog).toContain('content.setAttribute(PRIMARY_SCROLL_ATTRIBUTE, "true")');
	});

	it("definiert die Einfrierpunkte aller fünf Hauptansichten über denselben Bedienkopf", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		const catalog = readFileSync(join(process.cwd(), "src", "phase2", "ui", "CatalogView.ts"), "utf8");
		const search = readFileSync(join(process.cwd(), "src", "phase2", "ui", "SearchView.ts"), "utf8");
		const people = readFileSync(join(process.cwd(), "src", "phase4", "ui", "PeopleView.ts"), "utf8");
		const dashboard = readFileSync(join(process.cwd(), "src", "phase4", "ui", "DashboardView.ts"), "utf8");
		expect(view.match(/controlsContainer: controlHost/g)).toHaveLength(4);
		expect(view.indexOf("renderStatistics(viewHost")).toBeGreaterThan(view.indexOf("observeHeader(controlHeader)"));
		expect(catalog).toContain('controls.createDiv("nacv-catalog-freeze-layout")');
		expect(search).toContain('const resultCount = controls.createDiv("nacv-result-count")');
		expect(people).toContain('const resultCount = controlHost.createDiv("nacv-result-count")');
		expect(dashboard).toContain("renderDashboardActions(controls, options.onExternalAction)");
	});

	it("verwendet dieselbe Scrollstruktur unabhängig von Breitenmodus und Katalogdichte", () => {
		const densities: CatalogDensity[] = ["large", "standard", "compact", "poster"];
		for (const width of LAYOUT_WIDTH_MODES) {
			const root = new FakeRoot(1500, 900);
			applyLayoutWidth(root as never, width.id);
			updateScrollLayout(root as never);
			for (const density of densities) {
				expect(density).toMatch(/^(large|standard|compact|poster)$/);
				expect(root.dataset.nacvWidthMode).toBe(width.id);
				expect(root.classes.has(SPLIT_SCROLL_LAYOUT_CLASS)).toBe(true);
			}
		}
	});

	it("fällt bei schmalen oder niedrigen Leafs auf den normalen Root-Dokumentfluss zurück", () => {
		const source = readFileSync(join(process.cwd(), "src", "ScrollLayout.ts"), "utf8");
		expect(source).toContain("width >= SPLIT_SCROLL_MIN_WIDTH");
		expect(source).toContain("height >= SPLIT_SCROLL_MIN_HEIGHT");
		expect(source).toContain("height - headerHeight >= SPLIT_SCROLL_MIN_CONTENT_HEIGHT");
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*?\.nacv-shell\s*\{[^}]*grid-template-columns:\s*1fr;/s);
		expect(css).toMatch(/@media \(max-width:\s*720px\)[\s\S]*?\.nacv-navigation\s*\{[^}]*min-height:\s*auto;/s);
	});

	it("bewahrt Scrollpositionen bei Re-Render und Rücknavigation ansichtsbezogen", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain("this.service.subscribe(() => this.rerenderPreservingScroll())");
		expect(view).toContain("private readonly scrollPositions = new Map<string, number>()");
		expect(view).toContain("private navigateAndRender(updateRoute: () => void)");
		expect(view).toContain("this.scrollPositions.get(this.scrollPositionKey()) ?? 0");
	});
});
