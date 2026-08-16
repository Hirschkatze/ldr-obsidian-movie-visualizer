import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderDashboard } from "../src/phase4/ui/DashboardView";
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
	classList = {
		add: (name: string) => this.addClass(name),
		remove: (name: string) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); },
	};

	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	empty(): void { this.children = []; }
	remove(): void {}
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

function allText(root: FakeElement): string[] {
	return [root.textContent, ...root.children.flatMap(allText)].filter(Boolean);
}

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
	});
}

afterEach(() => vi.unstubAllGlobals());

describe("Tatsächlich gerenderte Phase-4A-Übersicht", () => {
	it("rendert Hero und alle passenden Dashboard-Sektionen", () => {
		installDocument();
		const container = new FakeElement();
		const heading = new FakeElement();
		const favorite = movie({ id: "Movies/Favorit.md", title: "Favorit", favorite: true, lastWatched: "2026-08-01", personalRating: 9 });
		renderDashboard(container as never, {
			items: [
				favorite,
				series({ id: "Series/Gesehen.md", title: "Gesehen", lastWatched: "2026-07-01", favorite: false }),
				movie({ id: "Movies/Top.md", title: "Top", favorite: false, personalRating: 10, lastWatched: undefined }),
				series({ id: "Series/Geplant.md", title: "Geplant", favorite: false, personalRating: undefined, watchStatus: "planned", lastWatched: undefined }),
			],
			headingContainer: heading as never, mediaType: "all", onOpen: vi.fn(),
		});
		expect(findAll(container, "nacv-dashboard-hero")).toHaveLength(1);
		expect(findAll(container, "nacv-dashboard-hero")[0].dataset.mediaId).toBe(favorite.id);
		for (const title of ["Zuletzt gesehen", "Meine Favoriten", "Am besten bewertet", "Noch nicht gesehen"])
			expect(allText(container)).toContain(title);
	});

	it("rendert keine leeren Reihen und zeigt bei vollständig leerem Dashboard einen zentralen Empty State", () => {
		installDocument();
		const single = movie({ favorite: false, personalRating: undefined, lastWatched: undefined, watchStatus: "completed" });
		const container = new FakeElement();
		renderDashboard(container as never, { items: [single], headingContainer: new FakeElement() as never, mediaType: "all", onOpen: vi.fn() });
		expect(findAll(container, "nacv-dashboard-section")).toHaveLength(0);
		expect(allText(container)).not.toContain("Meine Favoriten");

		const empty = new FakeElement();
		renderDashboard(empty as never, { items: [], headingContainer: new FakeElement() as never, mediaType: "all", onOpen: vi.fn() });
		expect(findAll(empty, "nacv-dashboard-empty")).toHaveLength(1);
		expect(findAll(empty, "nacv-dashboard-hero")).toHaveLength(0);
	});

	it("öffnet über Details und DashboardMediaCard ausschließlich die vorhandene Detailroute", () => {
		installDocument();
		const onOpen = vi.fn();
		const item = movie({ favorite: true, lastWatched: "2026-08-01" });
		const container = new FakeElement();
		renderDashboard(container as never, { items: [item], headingContainer: new FakeElement() as never, mediaType: "all", onOpen });
		const details = findAll(container, "nacv-button--primary")[0];
		details.trigger("click");
		expect(onOpen).toHaveBeenCalledWith(item);
		onOpen.mockClear();
		findAll(container, "nacv-dashboard-card")[0].trigger("click");
		expect(onOpen).toHaveBeenCalledOnce();
		expect(onOpen).toHaveBeenCalledWith(item);
	});

	it("wendet den globalen Typfilter auf Hero und alle Reihen an", () => {
		installDocument();
		const film = movie({ id: "Movies/Film.md", favorite: true, lastWatched: "2026-08-01" });
		const show = series({ id: "Series/Serie.md", favorite: true, lastWatched: "2026-08-02" });
		const container = new FakeElement();
		renderDashboard(container as never, { items: [film, show], headingContainer: new FakeElement() as never, mediaType: "movie", onOpen: vi.fn() });
		expect(findAll(container, "nacv-dashboard-hero")[0].dataset.mediaId).toBe(film.id);
		expect(findAll(container, "nacv-dashboard-card").every((card) => card.dataset.mediaId === film.id)).toBe(true);
	});

	it("verwendet auf Karten nur readonly-Sterne und enthält keinerlei Schreibzugriff", () => {
		installDocument();
		const container = new FakeElement();
		renderDashboard(container as never, {
			items: [movie({ favorite: true, personalRating: 8.5 })], headingContainer: new FakeElement() as never,
			mediaType: "all", onOpen: vi.fn(),
		});
		for (const rating of findAll(container, "nacv-stars--readonly")) {
			expect(findAll(rating, "nacv-star")).toHaveLength(10);
			expect(rating.listeners.has("click")).toBe(false);
			expect(rating.listeners.has("pointermove")).toBe(false);
		}
		const phase4 = sourceFiles(join(process.cwd(), "src", "phase4")).map((path) => readFileSync(path, "utf8")).join("\n");
		for (const forbidden of ["PersonalMediaActions", "updatePersonalFields", "processFrontMatter", "setRating", "setFavorite", "setWatchStatus"])
			expect(phase4).not.toContain(forbidden);
	});

	it("rendert externe Datenänderungen mit erhaltenem Typfilter in dieselbe Übersicht neu", () => {
		installDocument();
		const container = new FakeElement();
		const heading = new FakeElement();
		const initial = series({ favorite: false, personalRating: undefined, lastWatched: undefined, watchStatus: "completed" });
		const options = { items: [initial], headingContainer: heading as never, mediaType: "series" as const, onOpen: vi.fn() };
		renderDashboard(container as never, options);
		expect(allText(container)).not.toContain("Meine Favoriten");
		renderDashboard(container as never, { ...options, items: [{ ...initial, favorite: true }] });
		expect(allText(container)).toContain("Meine Favoriten");
		expect(findAll(container, "nacv-dashboard-card").every((card) => card.dataset.mediaId.startsWith("Series/"))).toBe(true);
	});
});
