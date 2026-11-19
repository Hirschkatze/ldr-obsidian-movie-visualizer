import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phase 6C – Ribbon-Konsolidierung", () => {
	it("behält den Öffnungs-Command des Cinema Visualizers ohne eigenes Ribbon", () => {
		const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");

		expect(main).toContain("id: COMMAND_ID");
		expect(main).toContain("callback: () => void this.activateView()");
		expect(main).not.toContain("addRibbonIcon(");
	});
});
