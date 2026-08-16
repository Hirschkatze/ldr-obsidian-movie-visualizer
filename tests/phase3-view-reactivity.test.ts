import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Reaktive aktive Ansicht", () => {
	it("rendert bei jeder Service-Benachrichtigung die aktuelle Ansicht neu", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		expect(view).toContain("this.service.subscribe(() => this.renderApplication())");
	});

	it("hält Filter, Sortierung, Suchtext, Route und Detail-ID als persistenten View-Zustand", () => {
		const view = readFileSync(join(process.cwd(), "src", "MovieVisualizerView.ts"), "utf8");
		for (const field of ["mediaType", "catalogFilter", "catalogSort", "searchQuery", "route", "detailId"])
			expect(view).toMatch(new RegExp(`private ${field}`));
		expect(view).toContain("this.service?.getById(this.detailId)");
		expect(view).toContain("this.route = this.returnRoute");
	});

	it("bündelt Cache-Ereignisse ohne Frontmatter-Schreibzugriff", () => {
		const service = readFileSync(join(process.cwd(), "src", "services", "MediaDataService.ts"), "utf8");
		expect(service).toContain("queueMetadataRefresh(file)");
		expect(service).toContain("setTimeout");
		const refreshMethod = service.slice(service.indexOf("private queueMetadataRefresh"));
		expect(refreshMethod).not.toContain("processFrontMatter");
	});
});
