import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { parseWikilink, personAggregationKey, toMediaPeople } from "../src/utils/wikilinks";

describe("Wikilinks und Personen", () => {
	const makeFile = (path: string): TFile => {
		const file = Object.create(TFile.prototype) as TFile;
		Object.assign(file, { path, basename: path.split("/").pop()!.replace(/\.[^.]+$/, ""), extension: "md" });
		return file;
	};
	it("trennt Ziel und Alias und verwendet sonst den Basename", () => {
		expect(parseWikilink("[[People/Frank Darabont|Frank]]")).toEqual({
			target: "People/Frank Darabont",
			display: "Frank",
			hasExplicitAlias: true,
		});
		expect(parseWikilink("[[People/Frank Darabont]]").display).toBe("Frank Darabont");
	});

	it("unterstützt Embeds", () => {
		expect(parseWikilink("![[Assets/Poster.jpg]]").target).toBe("Assets/Poster.jpg");
	});

	it("erhält Linkziel, Anzeige und aufgelösten Pfad", () => {
		const destination = makeFile("People/Frank Darabont.md");
		const app = {
			metadataCache: { getFirstLinkpathDest: () => destination },
		};
		const source = makeFile("Movies/Test.md");
		const people = toMediaPeople(app as never, source as never, "[[Frank Darabont|Frank]]");
		expect(people[0]).toEqual({
			target: "Frank Darabont",
			display: "Frank",
			resolvedPath: "People/Frank Darabont.md",
		});
		expect(personAggregationKey(people[0])).toBe("People/Frank Darabont.md");
	});
});
