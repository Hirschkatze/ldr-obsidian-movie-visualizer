import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
	});
}

describe("Bereinigung des temporären Diagnose-Builds", () => {
	it("enthält weder sichtbare Diagnosemarker noch Diagnoseattribute oder -Notices", () => {
		const source = sourceFiles(join(process.cwd(), "src"))
			.map((path) => readFileSync(path, "utf8"))
			.join("\n");
		expect(source).not.toContain("DIAG BUILD 2026-08-16-A");
		expect(source).not.toContain("data-nacv-diagnostic-build");
		expect(source).not.toContain("DIAG: Kartenbewertung");
		expect(source).not.toContain("data-nacv-card-rating");
		expect(source).not.toContain("nacvCardRating");
	});
});
