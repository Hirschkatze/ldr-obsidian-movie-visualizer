import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TFile, type EventRef } from "obsidian";
import { PROPERTY_SCHEMA as P } from "../src/config/PropertySchema";
import { MediaDataService } from "../src/services/MediaDataService";

type Callback = (...args: any[]) => void;
type TestEventRef = EventRef & { event: string; callback: Callback };

class TestEmitter {
	private callbacks = new Map<string, Set<Callback>>();

	on(event: string, callback: Callback): EventRef {
		if (!this.callbacks.has(event)) this.callbacks.set(event, new Set());
		this.callbacks.get(event)!.add(callback);
		return { event, callback } as TestEventRef;
	}

	offref(ref: EventRef): void {
		const testRef = ref as TestEventRef;
		this.callbacks.get(testRef.event)?.delete(testRef.callback);
	}

	emit(event: string, ...args: unknown[]): void {
		for (const callback of this.callbacks.get(event) ?? []) callback(...args);
	}
}

function createTestApp(files: TFile[], records: Map<string, Record<string, unknown>>) {
	const vaultEvents = new TestEmitter();
	const metadataEvents = new TestEmitter();
	const writes: Array<{ file: TFile; before: Record<string, unknown>; after: Record<string, unknown> }> = [];
	const destinations = new Map<string, TFile>();

	const app = {
		vault: Object.assign(vaultEvents, {
			getMarkdownFiles: () => files,
			getResourcePath: (file: TFile) => `app://vault/${file.path}`,
		}),
		metadataCache: Object.assign(metadataEvents, {
			getFileCache: (file: TFile) => {
				const frontmatter = records.get(file.path);
				return frontmatter ? { frontmatter } : null;
			},
			getFirstLinkpathDest: (target: string) => destinations.get(target) ?? null,
		}),
		fileManager: {
			processFrontMatter: async (file: TFile, callback: (frontmatter: Record<string, unknown>) => void) => {
				const frontmatter = records.get(file.path) ?? {};
				const before = { ...frontmatter };
				callback(frontmatter);
				writes.push({ file, before, after: { ...frontmatter } });
			},
		},
	};

	return { app, vaultEvents, metadataEvents, writes, destinations };
}

describe("MediaDataService", () => {
	const makeFile = (path: string): TFile => {
		const file = Object.create(TFile.prototype) as TFile;
		const name = path.split("/").pop()!;
		Object.assign(file, {
			path,
			basename: name.replace(/\.[^.]+$/, ""),
			extension: name.includes(".") ? name.split(".").pop()! : "",
		});
		return file;
	};
	let movieFile: TFile;
	let seriesFile: TFile;
	let ignoredFile: TFile;
	let records: Map<string, Record<string, unknown>>;

	beforeEach(() => {
		movieFile = makeFile("Movies/Gleich.md");
		seriesFile = makeFile("Series/Gleich.md");
		ignoredFile = makeFile("Other/Notiz.md");
		records = new Map([
			[movieFile.path, {
				[P.type]: "movie",
				[P.title]: "Film",
				[P.runtime]: "2:22",
				[P.personalRating]: 0,
				[P.directors]: "[[People/Regie|Regie-Alias]]",
				[P.favorite]: "true",
			}],
			[seriesFile.path, {
				[P.type]: "series",
				[P.title]: "Serie",
				[P.watchStatus]: "watching",
				[P.seasonCount]: 3,
				[P.watchedThroughSeason]: 1,
			}],
			[ignoredFile.path, { [P.categories]: ["Movies"], [P.title]: "Ignoriert" }],
		]);
	});

	afterEach(() => vi.useRealTimers());

	it("erkennt ausschließlich movie und series und verwendet file.path als ID", async () => {
		const { app } = createTestApp([movieFile, seriesFile, ignoredFile], records);
		const service = new MediaDataService(app as never);
		await service.init();

		expect(service.items).toHaveLength(2);
		expect(service.getById("Movies/Gleich.md")?.title).toBe("Film");
		expect(service.getById("Series/Gleich.md")?.title).toBe("Serie");
		expect(service.getById("Other/Notiz.md")).toBeUndefined();
	});

	it("parst Film, Bewertung 0, Personen und Serienhinweis korrekt", async () => {
		const { app, destinations } = createTestApp([movieFile, seriesFile], records);
		destinations.set("People/Regie", makeFile("People/Regie.md"));
		const service = new MediaDataService(app as never);
		await service.init();

		const movie = service.getById(movieFile.path);
		expect(movie?.type).toBe("movie");
		if (movie?.type !== "movie") throw new Error("Film erwartet");
		expect(movie.runtimeMinutes).toBe(142);
		expect(movie.personalRating).toBeUndefined();
		expect(movie.favorite).toBe(true);
		expect(movie.directors[0]).toEqual({
			target: "People/Regie",
			display: "Regie-Alias",
			resolvedPath: "People/Regie.md",
		});

		const series = service.getById(seriesFile.path);
		expect(series?.type === "series" && series.newSeasonAvailable).toBe(true);
	});

	it("pflegt den Index bei create, changed, delete und rename", async () => {
		vi.useFakeTimers();
		const { app, vaultEvents, metadataEvents } = createTestApp([movieFile], records);
		const service = new MediaDataService(app as never);
		await service.init();

		const created = makeFile("Series/Neu.md");
		records.set(created.path, { [P.type]: "series", [P.title]: "Neu" });
		vaultEvents.emit("create", created);
		expect(service.getById(created.path)?.title).toBe("Neu");

		records.get(created.path)![P.title] = "Geändert";
		metadataEvents.emit("changed", created);
		await vi.advanceTimersByTimeAsync(50);
		expect(service.getById(created.path)?.title).toBe("Geändert");

		const oldPath = created.path;
		const renamed = makeFile("Series/Umbenannt.md");
		records.set(renamed.path, records.get(oldPath)!);
		vaultEvents.emit("rename", renamed, oldPath);
		expect(service.getById(oldPath)).toBeUndefined();
		expect(service.getById(renamed.path)?.id).toBe(renamed.path);

		vaultEvents.emit("delete", renamed);
		expect(service.getById(renamed.path)).toBeUndefined();
	});

	it("schreibt nur freigegebene persönliche Felder und löscht lastWatched", async () => {
		records.get(movieFile.path)![P.lastWatched] = "2026-07-20";
		const { app, writes } = createTestApp([movieFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const movie = service.getById(movieFile.path);
		if (movie?.type !== "movie") throw new Error("Film erwartet");

		await service.updatePersonalFields(movie, {
			favorite: false,
			personalRating: 8.5,
			lastWatched: null,
			watchCount: 2,
		});
		expect(writes).toHaveLength(1);
		expect(writes[0].after[P.favorite]).toBe(false);
		expect(writes[0].after[P.personalRating]).toBe(8.5);
		expect(writes[0].after[P.watchCount]).toBe(2);
		expect(P.lastWatched in writes[0].after).toBe(false);
		expect(writes[0].after[P.title]).toBe("Film");
	});

	it("verweigert Importfelder und typfremde persönliche Felder", async () => {
		const { app, writes } = createTestApp([movieFile, seriesFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const movie = service.getById(movieFile.path)!;
		const series = service.getById(seriesFile.path)!;

		await expect(service.updatePersonalFields(movie as never, { title: "Manipuliert" } as never))
			.rejects.toThrow("nicht erlaubt");
		await expect(service.updatePersonalFields(series as never, { watchCount: 1 } as never))
			.rejects.toThrow("nicht erlaubt");
		await expect(service.updatePersonalFields(movie as never, { watchedThroughSeason: 1 } as never))
			.rejects.toThrow("nicht erlaubt");
		expect(writes).toHaveLength(0);
	});

	it("aktualisiert den internen Zustand erst nach erfolgreichem Schreiben unmittelbar", async () => {
		const { app } = createTestApp([movieFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const original = service.getById(movieFile.path);
		if (original?.type !== "movie") throw new Error("Film erwartet");
		await service.updatePersonalFields(original, { favorite: false, personalRating: 0, watchStatus: "completed", watchCount: 1 });
		const current = service.getById(movieFile.path);
		expect(current?.favorite).toBe(false);
		expect(current?.personalRating).toBeUndefined();
		expect(current?.watchStatus).toBe("completed");
		expect(current?.type === "movie" && current.watchCount).toBe(1);
	});

	it("validiert persönliche Werte vor dem einzigen Frontmatter-Aufruf", async () => {
		const { app, writes } = createTestApp([movieFile, seriesFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const movie = service.getById(movieFile.path)!;
		const series = service.getById(seriesFile.path)!;
		for (const updates of [
			{ personalRating: 8.3 }, { personalRating: 10.5 }, { favorite: "true" },
			{ watchStatus: "gesehen" }, { lastWatched: "2026-02-30" }, { watchCount: -1 },
		]) {
			await expect(service.updatePersonalFields(movie as never, updates as never)).rejects.toThrow();
		}
		for (const value of [-1, 1.5, 4]) {
			await expect(service.updatePersonalFields(series as never, { watchedThroughSeason: value } as never)).rejects.toThrow();
		}
		expect(writes).toHaveLength(0);
	});

	it("löscht Serienfortschritt und berechnet den Staffelhinweis nach Erfolg neu", async () => {
		const { app, writes } = createTestApp([seriesFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const series = service.getById(seriesFile.path);
		if (series?.type !== "series") throw new Error("Serie erwartet");
		await service.updatePersonalFields(series, { watchedThroughSeason: 3 });
		const afterProgress = service.getById(series.id);
		expect(afterProgress?.type === "series" && afterProgress.newSeasonAvailable).toBe(false);
		const updated = service.getById(series.id);
		if (updated?.type !== "series") throw new Error("Serie erwartet");
		await service.updatePersonalFields(updated, { watchedThroughSeason: null });
		expect(P.watchedThroughSeason in writes[1].after).toBe(false);
		expect(records.get(seriesFile.path)![P.watchStatus]).toBe("watching");
		expect(records.get(seriesFile.path)![P.lastWatched]).toBeUndefined();
	});

	it("schreibt den planned-Fallback nicht automatisch zurück", async () => {
		const { app, writes } = createTestApp([movieFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		expect(service.getById(movieFile.path)?.watchStatus).toBe("planned");
		expect(records.get(movieFile.path)![P.watchStatus]).toBeUndefined();
		expect(writes).toHaveLength(0);
	});

	it("bündelt externe Metadata-Änderungen und benachrichtigt Ansichten mit dem neuen Modell", async () => {
		vi.useFakeTimers();
		const { app, metadataEvents, writes } = createTestApp([movieFile], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const listener = vi.fn();
		service.subscribe(listener);
		records.get(movieFile.path)![P.genres] = ["Mystery", "Science-Fiction"];
		records.get(movieFile.path)![P.title] = "Extern geändert";
		metadataEvents.emit("changed", movieFile);
		metadataEvents.emit("changed", movieFile);
		expect(listener).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(50);
		expect(service.getById(movieFile.path)?.genres).toEqual(["Mystery", "Science-Fiction"]);
		expect(service.getById(movieFile.path)?.title).toBe("Extern geändert");
		expect(listener).toHaveBeenCalledOnce();
		expect(writes).toHaveLength(0);
	});
});
