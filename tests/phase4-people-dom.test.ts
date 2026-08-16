import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aggregatePeople } from "../src/phase4/peopleSelectors";
import { renderPeople } from "../src/phase4/ui/PeopleView";
import { renderPersonDetail } from "../src/phase4/ui/PersonDetailView";
import { movie, person, series } from "./phase2-fixtures";

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	value = "";
	children: FakeElement[] = [];
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<(event: any) => void>>();
	dataset: Record<string, string> = {};
	tabIndex = 0;
	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	empty(): void { this.children = []; }
	remove(): void {}
	addClass(name: string): void { if (!this.className.split(/\s+/).includes(name)) this.className = `${this.className} ${name}`.trim(); }
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
	contains(element: FakeElement): boolean { return this === element || this.children.some((child) => child.contains(element)); }
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

function allText(root: FakeElement): string[] {
	return [root.textContent, ...root.children.flatMap(allText)].filter(Boolean);
}

afterEach(() => vi.unstubAllGlobals());

describe("Tatsächlich gerenderte Phase-4B-Personenansichten", () => {
	const shared = person("People/Alex", "Alex", "People/Alex.md");
	const items = [
		movie({ id: "Movies/A.md", title: "Film A", directors: [shared], writers: [], cast: [], personalRating: 8.5 }),
		series({ id: "Series/A.md", title: "Serie A", creators: [], cast: [shared] }),
		movie({ id: "Movies/B.md", title: "Film B", directors: [person("People/Berta", "Berta")], writers: [], cast: [] }),
	];

	it("kennzeichnet ausschließlich aufgelöste Personennoten dezent und lässt den Kartenklick intern", () => {
		installDocument();
		const container = new FakeElement();
		const onOpenPerson = vi.fn();
		renderPeople(container as never, {
			items, headingContainer: new FakeElement() as never, mediaType: "all", query: "", role: "all", sort: "name",
			onQueryChange: vi.fn(), onRoleChange: vi.fn(), onSortChange: vi.fn(), onOpenPerson,
		});
		const cards = findAll(container, "nacv-person-card");
		const resolved = cards.find((card) => allText(card).includes("Alex"))!;
		const unresolved = cards.find((card) => allText(card).includes("Berta"))!;
		expect(classes(resolved)).toContain("nacv-person-card--has-note");
		const badges = findAll(resolved, "nacv-person-card__note-badge");
		expect(badges).toHaveLength(1);
		expect(badges[0].attributes.get("title")).toBe("Personennote vorhanden");
		expect(badges[0].attributes.get("data-icon")).toBe("file-text");
		expect(classes(unresolved)).not.toContain("nacv-person-card--has-note");
		expect(findAll(unresolved, "nacv-person-card__note-badge")).toHaveLength(0);

		resolved.trigger("click");
		expect(onOpenPerson).toHaveBeenCalledOnce();
		const peopleView = readFileSync(join(process.cwd(), "src", "phase4", "ui", "PeopleView.ts"), "utf8");
		expect(peopleView).not.toContain("openPersonNote");
		expect(peopleView).not.toContain("openLinkText");
	});

	it("rendert Personen, Live-Suche, Rollenfilter, beide Sortierungen und öffnet eine Person", () => {
		installDocument();
		const container = new FakeElement();
		const onOpenPerson = vi.fn();
		const onQueryChange = vi.fn();
		const onRoleChange = vi.fn();
		const onSortChange = vi.fn();
		renderPeople(container as never, {
			items, headingContainer: new FakeElement() as never, mediaType: "all", query: "", role: "all", sort: "media-count",
			onQueryChange, onRoleChange, onSortChange, onOpenPerson,
		});
		let cards = findAll(container, "nacv-person-card");
		expect(cards[0].dataset.personId).toContain("Alex.md");
		expect(allText(cards[0])).toContain("2 Medien · 1 Film · 1 Serie");

		const search = findAll(container, "nacv-input")[0];
		search.value = "berta";
		search.trigger("input");
		expect(onQueryChange).toHaveBeenCalledWith("berta");
		expect(findAll(container, "nacv-person-card")).toHaveLength(1);
		expect(allText(container)).toContain("Berta");

		search.value = "";
		search.trigger("input");
		const selects = findAll(container, "nacv-select");
		selects[0].value = "cast";
		selects[0].trigger("change");
		expect(onRoleChange).toHaveBeenCalledWith("cast");
		expect(findAll(container, "nacv-person-card")).toHaveLength(1);

		selects[0].value = "all";
		selects[0].trigger("change");
		selects[1].value = "name";
		selects[1].trigger("change");
		expect(onSortChange).toHaveBeenCalledWith("name");
		cards = findAll(container, "nacv-person-card");
		expect(allText(cards[0])).toContain("Alex");
		cards[0].trigger("click");
		expect(onOpenPerson).toHaveBeenCalledOnce();
	});

	it("rendert das Personendetail nach vorhandenen Rollen mit readonly-Filmografie und Notizaktion", () => {
		installDocument();
		const selected = aggregatePeople(items, "all").find((item) => item.display === "Alex")!;
		const container = new FakeElement();
		const openLinkText = vi.fn();
		const onOpenMedia = vi.fn();
		const onBack = vi.fn();
		renderPersonDetail(container as never, {
			app: { workspace: { openLinkText } } as never,
			person: selected,
			headingContainer: new FakeElement() as never,
			onBack,
			onOpenMedia,
		});
		expect(allText(container)).toContain("Regie");
		expect(allText(container)).toContain("Cast");
		expect(allText(container)).not.toContain("Drehbuch");
		expect(allText(container)).not.toContain("Serienschöpfer:innen");
		expect(findAll(container, "nacv-dashboard-card")).toHaveLength(2);
		expect(allText(container)).toContain("Film");
		expect(allText(container)).toContain("Serie");
		findAll(container, "nacv-dashboard-card")[0].trigger("click");
		expect(onOpenMedia).toHaveBeenCalledOnce();
		findAll(container, "nacv-person-detail__note")[0].trigger("click", { stopPropagation: vi.fn() });
		expect(openLinkText).toHaveBeenCalledWith("People/Alex.md", expect.any(String), false);
		findAll(container, "nacv-person-detail__back")[0].trigger("click");
		expect(onBack).toHaveBeenCalledOnce();
		for (const rating of findAll(container, "nacv-stars--readonly")) {
			expect(rating.listeners.has("click")).toBe(false);
			expect(rating.listeners.has("pointermove")).toBe(false);
		}
	});

	it("zeigt ohne resolvedPath keine Aktion zum Öffnen einer Personennote", () => {
		installDocument();
		const selected = aggregatePeople([
			movie({ directors: [person("People/Unresolved", "Unresolved")], writers: [], cast: [] }),
		], "all").find((item) => item.display === "Unresolved")!;
		const container = new FakeElement();
		renderPersonDetail(container as never, {
			app: { workspace: { openLinkText: vi.fn() } } as never, person: selected,
			headingContainer: new FakeElement() as never, onBack: vi.fn(), onOpenMedia: vi.fn(),
		});
		expect(findAll(container, "nacv-person-detail__note")).toHaveLength(0);
	});

	it("spiegelt externe Personendatenänderungen beim erneuten Rendern wider und bleibt schreibfrei", () => {
		installDocument();
		const container = new FakeElement();
		const base = movie({ directors: [person("People/Alt", "Alt")], writers: [], cast: [] });
		const options = {
			headingContainer: new FakeElement() as never, mediaType: "movie" as const, query: "", role: "all" as const,
			sort: "media-count" as const, onQueryChange: vi.fn(), onRoleChange: vi.fn(), onSortChange: vi.fn(), onOpenPerson: vi.fn(),
		};
		renderPeople(container as never, { ...options, items: [base] });
		expect(allText(container)).toContain("Alt");
		renderPeople(container as never, { ...options, items: [{ ...base, directors: [person("People/Neu", "Neu")] }] });
		expect(allText(container)).toContain("Neu");
		expect(allText(container)).not.toContain("Alt");

		const phase4 = ["peopleSelectors.ts", join("ui", "PeopleView.ts"), join("ui", "PersonDetailView.ts")]
			.map((path) => readFileSync(join(process.cwd(), "src", "phase4", path), "utf8")).join("\n");
		for (const forbidden of ["PersonalMediaActions", "updatePersonalFields", "processFrontMatter", "setRating", "fetch("])
			expect(phase4).not.toContain(forbidden);
	});
});
