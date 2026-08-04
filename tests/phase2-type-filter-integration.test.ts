import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountApplicationContent } from "../src/phase2/ui/ApplicationShell";
import type { MediaTypeFilter } from "../src/phase2/types";

class FakeElement {
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	attributes = new Map<string, string>();
	listeners = new Map<string, Array<() => void>>();

	classList = {
		toggle: (name: string, force: boolean) => {
			const classes = new Set(this.className.split(/\s+/).filter(Boolean));
			if (force) classes.add(name); else classes.delete(name);
			this.className = [...classes].join(" ");
		},
	};

	appendChild(child: FakeElement): FakeElement {
		this.children.push(child);
		return child;
	}

	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value);
	}

	addEventListener(name: string, listener: () => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}

	click(): void {
		for (const listener of this.listeners.get("click") ?? []) listener();
	}

	empty(): void {
		this.children = [];
	}
}

function installFakeDocument(): void {
	vi.stubGlobal("document", {
		createElement: () => new FakeElement(),
	});
}

afterEach(() => vi.unstubAllGlobals());

describe("Einbindung des globalen Medientypfilters", () => {
	it("mountet Alle, Filme und Serien außerhalb des von Ansichten geleerten Containers", () => {
		installFakeDocument();
		const main = new FakeElement();
		const mount = mountApplicationContent(main as never, "all", vi.fn());
		const filter = mount.typeFilter as unknown as FakeElement;

		expect(main.children).toHaveLength(3);
		expect(main.children[0].className).toBe("nacv-heading-host");
		expect(main.children[1].className).toBe("nacv-global-toolbar");
		expect(main.children[2].className).toBe("nacv-view-host");
		expect(filter.children.map((button) => button.textContent)).toEqual(["Alle", "Filme", "Serien"]);
		expect(filter.children[0].className).toContain("nacv-type-filter__button--active");

		(mount.viewHost as unknown as FakeElement).empty();
		expect(main.children[1].children[0]).toBe(filter);
	});

	it("übernimmt die Auswahl beim erneuten Mounten nach einem Ansichtswechsel", () => {
		installFakeDocument();
		let selected: MediaTypeFilter = "all";
		const first = mountApplicationContent(new FakeElement() as never, selected, (value) => { selected = value; });
		const firstFilter = first.typeFilter as unknown as FakeElement;
		firstFilter.children[2].click();
		expect(selected).toBe("series");

		const second = mountApplicationContent(new FakeElement() as never, selected, (value) => { selected = value; });
		const secondFilter = second.typeFilter as unknown as FakeElement;
		expect(secondFilter.children[2].textContent).toBe("Serien");
		expect(secondFilter.children[2].className).toContain("nacv-type-filter__button--active");
	});

	it("richtet globale Toolbar und Reset-Button linksbündig aus", () => {
		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-global-toolbar\s*\{[^}]*justify-content:\s*flex-start;[^}]*flex-wrap:\s*wrap;/s);
		expect(css).toMatch(/\.nacv-filter-panel\s*>\s*\.nacv-button\s*\{[^}]*width:\s*100%;[^}]*text-align:\s*left;/s);
	});

	it("ordnet Trefferzahl, Sortierung und Richtung linksbündig in der Katalog-Steuerzeile an", () => {
		const source = readFileSync(join(process.cwd(), "src", "phase2", "ui", "CatalogView.ts"), "utf8");
		const count = source.indexOf('cls: "nacv-catalog-toolbar__count"');
		const sorting = source.indexOf('addSelect(toolbar, "Sortierung"');
		const direction = source.indexOf('addSelect(toolbar, "Richtung"');
		expect(count).toBeGreaterThan(-1);
		expect(count).toBeLessThan(sorting);
		expect(sorting).toBeLessThan(direction);

		const css = readFileSync(join(process.cwd(), "styles.css"), "utf8");
		expect(css).toMatch(/\.nacv-catalog-toolbar\s*\{[^}]*justify-content:\s*flex-start;[^}]*flex-wrap:\s*wrap;/s);
		expect(css).toMatch(/\.nacv-catalog-toolbar__count\s*\{[^}]*margin-right:\s*8px;/s);
	});
});
