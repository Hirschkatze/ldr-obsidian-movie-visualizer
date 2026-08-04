import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
	});
}

describe("Phase-2-Lesegrenze", () => {
	it("enthält in Katalog, Suche und Detailansicht keinerlei Frontmatter-Schreibzugriff", () => {
		const root = join(process.cwd(), "src", "phase2");
		const content = sourceFiles(root).map((path) => readFileSync(path, "utf8")).join("\n");
		expect(content).not.toContain("processFrontMatter");
		expect(content).not.toContain("updatePersonalFields");
		expect(content).not.toContain("PROPERTY_SCHEMA");
	});
});
