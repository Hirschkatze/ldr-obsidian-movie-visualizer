import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
	executeMediaPluginCommand,
	MEDIA_PLUGIN_COMMAND_IDS,
	type MediaPluginAction,
} from "../src/integration/MediaPluginCommands";

const actions: MediaPluginAction[] = ["import-movie", "import-series", "update-series", "update-movie-imdb"];

describe("Phase 6B.1: geprüfte Command-Integration", () => {
	it("verwendet exakt die registrierten Commands von Media Importer und Media Updater", () => {
		expect(MEDIA_PLUGIN_COMMAND_IDS).toEqual({
			"import-movie": "new-almanach-media-importer:import-movie",
			"import-series": "new-almanach-media-importer:import-series",
			"update-series": "new-almanach-media-updater:check-series-updates",
			"update-movie-imdb": "new-almanach-media-updater:update-movie-imdb-ratings",
		});
	});

	it("stimmt mit den tatsächlich registrierten Commands der beiden Nachbar-Plugins überein", () => {
		const root = join(process.cwd(), "..");
		const importerManifest = JSON.parse(readFileSync(join(root, "media-importer", "manifest.json"), "utf8")) as { id: string };
		const importerIdentity = readFileSync(join(root, "media-importer", "src", "config", "PluginIdentity.ts"), "utf8");
		const importerMain = readFileSync(join(root, "media-importer", "main.ts"), "utf8");
		const updaterManifest = JSON.parse(readFileSync(join(root, "media-updater", "manifest.json"), "utf8")) as { id: string };
		const updaterMain = readFileSync(join(root, "media-updater", "main.ts"), "utf8");

		expect(importerManifest.id).toBe("new-almanach-media-importer");
		expect(importerIdentity).toContain('importMovie: "import-movie"');
		expect(importerIdentity).toContain('importSeries: "import-series"');
		expect(importerMain).toContain("id: COMMAND_IDS.importMovie");
		expect(importerMain).toContain("id: COMMAND_IDS.importSeries");
		expect(updaterManifest.id).toBe("new-almanach-media-updater");
		expect(updaterMain).toContain('id: "check-series-updates"');
		expect(updaterMain).toContain('id: "update-movie-imdb-ratings"');
	});

	it.each(actions)("führt %s ausschließlich über den Command-Dispatcher aus", (action) => {
		const executeCommandById = vi.fn(() => true);
		expect(executeMediaPluginCommand({ executeCommandById }, action)).toEqual({ status: "opened" });
		expect(executeCommandById).toHaveBeenCalledExactlyOnceWith(MEDIA_PLUGIN_COMMAND_IDS[action]);
	});

	it.each([
		["import-movie", "Media Importer"],
		["import-series", "Media Importer"],
		["update-series", "Media Updater"],
		["update-movie-imdb", "Media Updater"],
	] as const)("meldet einen fehlenden Command für %s verständlich", (action, pluginName) => {
		const result = executeMediaPluginCommand({ executeCommandById: () => false }, action);
		expect(result.status).toBe("unavailable");
		expect(result.message).toContain(pluginName);
		expect(result.message).toContain("nicht installiert oder nicht aktiviert");
	});

	it("behandelt fehlenden Dispatcher und Command-Fehler ohne Ausfall des Visualizers", () => {
		expect(executeMediaPluginCommand(undefined, "import-movie").status).toBe("unavailable");
		expect(executeMediaPluginCommand({ executeCommandById: () => { throw new Error("Plugin deaktiviert"); } }, "update-series").status)
			.toBe("unavailable");
	});

	it("enthält selbst keine Vault-, Frontmatter- oder Datei-Schreiblogik", () => {
		const source = readFileSync(join(process.cwd(), "src", "integration", "MediaPluginCommands.ts"), "utf8");
		for (const forbidden of ["app.vault", "fileManager", "processFrontMatter", "create(", "modify(", "trashFile"])
			expect(source).not.toContain(forbidden);
	});
});
