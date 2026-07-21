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
	const destination = makeFile("Assets/poster.jpg");
	const app = {
		metadataCache: {
			getFirstLinkpathDest: (path: string) => path === "missing.jpg" ? null : destination,
		},
		vault: { getResourcePath: (file: TFile) => `app://vault/${file.path}` },
	};
	const resolver = new ImageResolver(app as never);

	it("übernimmt externe URLs ohne Netzwerkabruf", () => {
		expect(resolver.resolve("https://example.test/poster.jpg", source as never))
			.toBe("https://example.test/poster.jpg");
	});

	it.each(["Assets/poster.jpg", "[[Assets/poster.jpg]]", "![[Assets/poster.jpg]]"])(
		"löst lokale Bildform %s über die Obsidian-API auf",
		(value) => expect(resolver.resolve(value, source as never)).toBe("app://vault/Assets/poster.jpg")
	);

	it("liefert bei nicht auflösbaren Bildern undefined", () => {
		expect(resolver.resolve("missing.jpg", source as never)).toBeUndefined();
	});
});
