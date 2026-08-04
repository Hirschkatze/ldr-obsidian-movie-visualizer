import { describe, expect, it, vi } from "vitest";
import { PersonalMediaActions } from "../src/phase3/PersonalMediaActions";
import { movie, series } from "./phase2-fixtures";

function setup(today = "2026-08-04") {
	const updatePersonalFields = vi.fn(async (_media: unknown, _updates: Record<string, unknown>) => undefined);
	return { actions: new PersonalMediaActions({ updatePersonalFields } as never, () => today), updatePersonalFields };
}

describe("Persönliche Phase-3-Aktionen", () => {
	it("schreibt Bewertung, Boolean, englischen Status und Datum jeweils gezielt", async () => {
		const { actions, updatePersonalFields } = setup();
		const item = movie();
		await actions.setRating(item, 8.5);
		await actions.setRating(item, 0);
		await actions.setFavorite(item, true);
		await actions.setWatchStatus(item, "paused");
		await actions.setLastWatchedToday(item);
		await actions.setLastWatched(item, null);
		expect(updatePersonalFields.mock.calls.map((call) => call[1])).toEqual([
			{ personalRating: 8.5 }, { personalRating: 0 }, { favorite: true },
			{ watchStatus: "paused" }, { lastWatched: "2026-08-04" }, { lastWatched: null },
		]);
	});

	it("markiert einen Film atomar als gesehen, ohne positive Sichtungszahl zu reduzieren", async () => {
		const { actions, updatePersonalFields } = setup();
		await actions.markWatched(movie({ watchCount: 0 }));
		await actions.markWatched(movie({ watchCount: 4 }));
		expect(updatePersonalFields.mock.calls[0][1]).toEqual({ watchStatus: "completed", lastWatched: "2026-08-04", watchCount: 1 });
		expect(updatePersonalFields.mock.calls[1][1]).toEqual({ watchStatus: "completed", lastWatched: "2026-08-04", watchCount: 4 });
	});

	it("erhöht bei erneutem Sehen exakt einmal und behandelt 0 robust", async () => {
		const { actions, updatePersonalFields } = setup();
		await actions.rewatch(movie({ watchCount: 2 }));
		await actions.rewatch(movie({ watchCount: 0 }));
		expect(updatePersonalFields.mock.calls[0][1].watchCount).toBe(3);
		expect(updatePersonalFields.mock.calls[1][1].watchCount).toBe(1);
	});

	it("korrigiert nur nach Bestätigung atomar als ungesehen", async () => {
		const { actions, updatePersonalFields } = setup();
		expect(await actions.correctUnwatched(movie(), false)).toBe(false);
		expect(updatePersonalFields).not.toHaveBeenCalled();
		await actions.correctUnwatched(movie(), true);
		expect(updatePersonalFields).toHaveBeenCalledOnce();
		expect(updatePersonalFields.mock.calls[0][1]).toEqual({ watchStatus: "planned", lastWatched: null, watchCount: 0 });
	});

	it("schreibt und entfernt Serienfortschritt ohne Status oder Datum", async () => {
		const { actions, updatePersonalFields } = setup();
		const item = series();
		await actions.setSeriesProgress(item, 2);
		await actions.setSeriesProgress(item, null);
		expect(updatePersonalFields.mock.calls.map((call) => call[1])).toEqual([
			{ watchedThroughSeason: 2 }, { watchedThroughSeason: null },
		]);
	});

	it("blockiert parallele Schreibvorgänge derselben Datei", async () => {
		let release!: () => void;
		const pending = new Promise<void>((resolve) => { release = resolve; });
		const updatePersonalFields = vi.fn((_media: unknown, _updates: Record<string, unknown>) => pending);
		const actions = new PersonalMediaActions({ updatePersonalFields } as never);
		const item = movie();
		const first = actions.rewatch(item);
		expect(actions.isPending(item.id)).toBe(true);
		expect(await actions.rewatch(item)).toBe(false);
		expect(updatePersonalFields).toHaveBeenCalledOnce();
		release();
		expect(await first).toBe(true);
		expect(actions.isPending(item.id)).toBe(false);
	});

	it("gibt nach Schreibfehlern die Sperre frei und verändert das Modell nicht vorauseilend", async () => {
		const item = movie({ favorite: false });
		const updatePersonalFields = vi.fn(async (_media: unknown, _updates: Record<string, unknown>) => { throw new Error("Schreibfehler"); });
		const actions = new PersonalMediaActions({ updatePersonalFields } as never);
		await expect(actions.setFavorite(item, true)).rejects.toThrow("Schreibfehler");
		expect(item.favorite).toBe(false);
		expect(actions.isPending(item.id)).toBe(false);
	});
});
