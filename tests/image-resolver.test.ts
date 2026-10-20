import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { ImageResolver } from "../src/services/ImageResolver";

describe("ImageResolver", () => {
	const makeFile = (path: string): TFile => {
		const file = Object.create(TFile.prototype) as TFile;
		Object.assign(file, { path, basename: path.split("/").pop()!.replace(/\.[^.]+$/, ""), extension: path.split(".").pop()! });
		return file;
	};
	const source = makeFile("Movies/Test.md");
	const poster = makeFile("Atlas/Sources/Movies/Images/Test (2026).jpg");
	const backdrop = makeFile("Atlas/Sources/Movies/Images/Test (2026)-backdrop.jpg");
	const app = {
		metadataCache: {
			getFirstLinkpathDest: (path: string) => {
				if (path === poster.path) return poster;
				if (path === backdrop.path) return backdrop;
				return null;
			},
		},
		vault: { getResourcePath: (file: TFile) => `app://vault/${file.path}` },
	};
	const resolver = new ImageResolver(app as never);

	it("übernimmt externe URLs ohne Netzwerkabruf", () => {
		expect(resolver.resolve("https://example.test/poster.jpg", source as never))
			.toBe("https://example.test/poster.jpg");
	});

	it.each([
		poster.path,
		`[[${poster.path}]]`,
		`![[${poster.path}]]`,
	])(
		"löst lokale Bildform %s über die Obsidian-API auf",
		(value) => expect(resolver.resolve(value, source as never)).toBe(`app://vault/${poster.path}`)
	);

	it("löst lokale Vault-Pfade für Cover und Backdrop unabhängig voneinander auf", () => {
		expect(resolver.resolve(poster.path, source as never)).toBe(`app://vault/${poster.path}`);
		expect(resolver.resolve(backdrop.path, source as never)).toBe(`app://vault/${backdrop.path}`);
	});

	it.each([undefined, "", "missing-cover.jpg", "missing-backdrop.jpg"])(
		"liefert für fehlendes oder nicht auflösbares Bild %s undefined",
		(value) => expect(resolver.resolve(value, source as never)).toBeUndefined()
	);
});
