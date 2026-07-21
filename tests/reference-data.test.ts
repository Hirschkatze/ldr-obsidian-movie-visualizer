import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { PROPERTY_SCHEMA as P } from "../src/config/PropertySchema";
import { MediaDataService } from "../src/services/MediaDataService";

function parseScalar(value: string): unknown {
	const normalized = value.trim();
	if (!normalized) return undefined;
	if (normalized === "true") return true;
	if (normalized === "false") return false;
	if (/^-?\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
	return normalized.replace(/^"|"$/g, "");
}

function readFrontmatter(path: string): Record<string, unknown> {
	const content = readFileSync(path, "utf8");
	const block = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
	if (!block) throw new Error(`Frontmatter fehlt: ${path}`);
	const result: Record<string, unknown> = {};
	let listKey: string | undefined;
	for (const line of block.split(/\r?\n/)) {
		const item = line.match(/^\s+-\s+(.*)$/);
		if (item && listKey) {
			(result[listKey] as unknown[]).push(parseScalar(item[1]));
			continue;
		}
		const property = line.match(/^([^:]+):(?:\s*(.*))?$/);
		if (!property) continue;
		const key = property[1].trim();
		const raw = property[2] ?? "";
		if (!raw.trim()) {
			result[key] = undefined;
			listKey = key;
		} else {
			result[key] = parseScalar(raw);
			listKey = undefined;
		}
		if (listKey) result[listKey] = [];
	}
	return result;
}

function makeFile(path: string): TFile {
	const file = Object.create(TFile.prototype) as TFile;
	const name = path.split("/").pop()!;
	Object.assign(file, { path, basename: name.replace(/\.md$/, ""), extension: "md" });
	return file;
}

describe("verbindliche Referenznotizen", () => {
	it("indexiert alle vier Testdaten mit Film-/Serienmodell", async () => {
		const fixtures = [
			["Movies/Die Verurteilten (1994).md", "../test-data/Movies/Die Verurteilten (1994).md"],
			["Movies/Die Odyssee (2026).md", "../test-data/Movies/Die Odyssee (2026).md"],
			["Series/Dark (2017).md", "../test-data/Series/Dark (2017).md"],
			["Series/Severance (2022).md", "../test-data/Series/Severance (2022).md"],
		] as const;
		const files = fixtures.map(([vaultPath]) => makeFile(vaultPath));
		const records = new Map<string, Record<string, unknown>>(
			fixtures.map(([vaultPath, fixturePath]) => [vaultPath, readFrontmatter(resolve(process.cwd(), fixturePath))])
		);
		const callbacks = new Map<string, (...args: unknown[]) => void>();
		const events = {
			on: (name: string, callback: (...args: unknown[]) => void) => {
				callbacks.set(name, callback);
				return {};
			},
			offref: () => undefined,
		};
		const app = {
			vault: Object.assign({}, events, {
				getMarkdownFiles: () => files,
				getResourcePath: (file: TFile) => `app://vault/${file.path}`,
			}),
			metadataCache: Object.assign({}, events, {
				getFileCache: (file: TFile) => ({ frontmatter: records.get(file.path) }),
				getFirstLinkpathDest: () => null,
			}),
			fileManager: { processFrontMatter: async () => undefined },
		};

		const service = new MediaDataService(app as never);
		await service.init();
		expect(service.items).toHaveLength(4);
		expect(service.items.filter((item) => item.type === "movie")).toHaveLength(2);
		expect(service.items.filter((item) => item.type === "series")).toHaveLength(2);

		const shawshank = service.getById("Movies/Die Verurteilten (1994).md");
		expect(shawshank?.type === "movie" && shawshank.runtimeMinutes).toBe(142);
		expect(shawshank?.personalRating).toBeUndefined();

		const severance = service.getById("Series/Severance (2022).md");
		expect(severance?.type === "series" && severance.newSeasonAvailable).toBe(true);
		expect(records.get("Series/Severance (2022).md")?.[P.watchStatus]).toBe("watching");
	});
});
