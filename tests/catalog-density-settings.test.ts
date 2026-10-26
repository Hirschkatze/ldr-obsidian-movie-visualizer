import { describe, expect, it, vi } from "vitest";
import { CinemaVisualizerSettingsStore, parseSettings } from "../src/settings";

describe("Persistenz der Katalogdichte", () => {
	it("verwendet ohne oder bei ungültiger Einstellung standard", () => {
		expect(parseSettings(undefined).catalogDensity).toBe("standard");
		expect(parseSettings({ catalogDensity: "riesig" }).catalogDensity).toBe("standard");
	});

	it("lädt eine gespeicherte Posterwand", () => {
		expect(parseSettings({ catalogDensity: "poster" }).catalogDensity).toBe("poster");
	});

	it("speichert den Wechsel auf compact", async () => {
		const save = vi.fn(async () => undefined);
		const store = new CinemaVisualizerSettingsStore(save);
		store.load(undefined);
		await store.setCatalogDensity("compact");
		expect(store.catalogDensity).toBe("compact");
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith({ catalogDensity: "compact" });
	});
});
