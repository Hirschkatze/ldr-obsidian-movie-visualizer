import { beforeEach, describe, expect, it, vi } from "vitest";
import { TFile, type EventRef } from "obsidian";
import { PROPERTY_SCHEMA as P } from "../src/config/PropertySchema";
import { MediaDataService } from "../src/services/MediaDataService";
import {
	buildMediaDeletionPlan,
	buildMediaDeletionPlans,
	MEDIA_DELETION_ROOTS,
	type MediaDeletionPlan,
} from "../src/phase2/deletion/MediaDeletionPlan";
import {
	collectMediaDeletionTargets,
	deletionResultMessage,
	executeMediaDeletion,
} from "../src/phase2/deletion/MediaDeletionExecutor";
import { renderMediaDeletionConfirmation } from "../src/phase2/deletion/MediaDeletionModal";
import { formatCount } from "../src/phase2/deletion/MediaDeletionText";
import { movie, series } from "./phase2-fixtures";

type Callback = (...args: any[]) => void;

class Emitter {
	private callbacks = new Map<string, Set<Callback>>();
	on(event: string, callback: Callback): EventRef {
		if (!this.callbacks.has(event)) this.callbacks.set(event, new Set());
		this.callbacks.get(event)!.add(callback);
		return { event, callback } as never;
	}
	offref(ref: EventRef): void {
		const item = ref as unknown as { event: string; callback: Callback };
		this.callbacks.get(item.event)?.delete(item.callback);
	}
	emit(event: string, ...args: unknown[]): void {
		for (const callback of this.callbacks.get(event) ?? []) callback(...args);
	}
}

function makeFile(path: string): TFile {
	const file = Object.create(TFile.prototype) as TFile;
	const name = path.replace(/\\/g, "/").split("/").pop() ?? path;
	const dot = name.lastIndexOf(".");
	Object.assign(file, {
		path,
		basename: dot >= 0 ? name.slice(0, dot) : name,
		extension: dot >= 0 ? name.slice(dot + 1) : "",
	});
	return file;
}

function mediaAt<T extends ReturnType<typeof movie> | ReturnType<typeof series>>(media: T, path: string): T {
	const file = makeFile(path);
	return { ...media, id: path, file };
}

function createApp(initialFiles: TFile[], records: Map<string, Record<string, unknown>>, failures = new Set<string>()) {
	const files = new Map(initialFiles.map((file) => [file.path, file]));
	const vaultEvents = new Emitter();
	const metadataEvents = new Emitter();
	const trashFile = vi.fn(async (file: TFile) => {
		if (failures.has(file.path)) throw new Error(`Fehler: ${file.path}`);
		files.delete(file.path);
		vaultEvents.emit("delete", file);
	});
	const app = {
		vault: Object.assign(vaultEvents, {
			getMarkdownFiles: () => Array.from(files.values()).filter((file) => file.extension === "md"),
			getAbstractFileByPath: (path: string) => files.get(path) ?? null,
			getResourcePath: (file: TFile) => `app://vault/${file.path}`,
		}),
		metadataCache: Object.assign(metadataEvents, {
			getFileCache: (file: TFile) => records.has(file.path) ? { frontmatter: records.get(file.path) } : null,
			getFirstLinkpathDest: (target: string) => files.get(target) ?? null,
		}),
		fileManager: {
			trashFile,
			processFrontMatter: vi.fn(),
		},
	};
	return { app, files, trashFile };
}

describe("MediaDeletionPlan", () => {
	it("plant für einen Film Note, Cover und Backdrop als drei zulässige Dateien", () => {
		const note = makeFile("Atlas/Sources/Movies/Film.md");
		const cover = makeFile("Atlas/Sources/Movies/Images/Film.jpg");
		const backdrop = makeFile("Atlas/Sources/Movies/Images/Film-backdrop.jpg");
		const records = new Map([[note.path, { [P.type]: "movie", [P.cover]: cover.path, [P.backdrop]: backdrop.path }]]);
		const { app } = createApp([note, cover, backdrop], records);
		const plan = buildMediaDeletionPlan(app as never, mediaAt(movie({ title: "Film" }), note.path));
		expect(plan.note.status).toBe("local-existing");
		expect(plan.cover.status).toBe("local-existing");
		expect(plan.backdrop.status).toBe("local-existing");
		expect(collectMediaDeletionTargets([plan]).map((target) => target.path)).toEqual([cover.path, backdrop.path, note.path]);
	});

	it("klassifiziert externe, leere, fehlende und außerhalb liegende Bilder ohne sie zu planen", () => {
		const note = makeFile("Atlas/Sources/Movies/Sonderfälle.md");
		const records = new Map([[note.path, {
			[P.type]: "movie",
			[P.cover]: "https://image.tmdb.org/cover.jpg",
			[P.backdrop]: "",
		}]]);
		const { app } = createApp([note], records);
		const media = mediaAt(movie(), note.path);
		const external = buildMediaDeletionPlan(app as never, media);
		expect(external.cover.status).toBe("external");
		expect(external.backdrop.status).toBe("empty");

		records.get(note.path)![P.cover] = "Atlas/Sources/Movies/Images/Fehlt.jpg";
		const missing = buildMediaDeletionPlan(app as never, media);
		expect(missing.cover).toMatchObject({ status: "local-missing", resolvedPath: "Atlas/Sources/Movies/Images/Fehlt.jpg" });

		records.get(note.path)![P.cover] = "Atlas/People/Person X.jpg";
		const outside = buildMediaDeletionPlan(app as never, media);
		expect(outside.cover).toMatchObject({ status: "outside-allowed-root", resolvedPath: "Atlas/People/Person X.jpg" });
		expect(collectMediaDeletionTargets([outside]).map((target) => target.path)).toEqual([note.path]);
	});

	it("verwendet für Serien ausschließlich Series-Note- und Series-Images-Root", () => {
		const note = makeFile("Atlas/Sources/Series/Serie.md");
		const cover = makeFile("Atlas/Sources/Series/Images/Serie.jpg");
		const wrong = makeFile("Atlas/Sources/Movies/Images/Falsch.jpg");
		const records = new Map([[note.path, { [P.type]: "series", [P.cover]: cover.path, [P.backdrop]: wrong.path }]]);
		const { app } = createApp([note, cover, wrong], records);
		const plan = buildMediaDeletionPlan(app as never, mediaAt(series(), note.path));
		expect(MEDIA_DELETION_ROOTS.series.images).toBe("Atlas/Sources/Series/Images/");
		expect(plan.note.status).toBe("local-existing");
		expect(plan.cover.status).toBe("local-existing");
		expect(plan.backdrop.status).toBe("outside-allowed-root");
	});
});

describe("Papierkorb-Ausführung und Reaktivität", () => {
	it("verschiebt ausschließlich geplante Dateien und entfernt die Note über das bestehende delete-Event", async () => {
		const note = makeFile("Atlas/Sources/Movies/Reaktiv.md");
		const cover = makeFile("Atlas/Sources/Movies/Images/Reaktiv.jpg");
		const unrelated = makeFile("Atlas/Sources/Movies/Images/Nicht-ausgewählt.jpg");
		const records = new Map([[note.path, { [P.type]: "movie", [P.title]: "Reaktiv", [P.cover]: cover.path }]]);
		const { app, trashFile } = createApp([note, cover, unrelated], records);
		const service = new MediaDataService(app as never);
		await service.init();
		const listener = vi.fn();
		service.subscribe(listener);
		const media = service.getById(note.path)!;
		const plans = buildMediaDeletionPlans(app as never, [media]);
		const result = await executeMediaDeletion(app as never, plans);
		expect(trashFile.mock.calls.map(([file]) => file.path)).toEqual([cover.path, note.path]);
		expect(trashFile.mock.calls.some(([file]) => file.path === unrelated.path)).toBe(false);
		expect(service.getById(note.path)).toBeUndefined();
		expect(listener).toHaveBeenCalled();
		expect(result.successfulMediaIds).toEqual([note.path]);
	});

	it("setzt nach einem Teilfehler fort und meldet ausschließlich den fehlgeschlagenen Pfad", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const note = makeFile("Atlas/Sources/Movies/Teilfehler.md");
		const cover = makeFile("Atlas/Sources/Movies/Images/Teilfehler.jpg");
		const backdrop = makeFile("Atlas/Sources/Movies/Images/Teilfehler-backdrop.jpg");
		const records = new Map([[note.path, { [P.type]: "movie", [P.cover]: cover.path, [P.backdrop]: backdrop.path }]]);
		const { app, trashFile } = createApp([note, cover, backdrop], records, new Set([cover.path]));
		const plan = buildMediaDeletionPlan(app as never, mediaAt(movie(), note.path));
		const result = await executeMediaDeletion(app as never, [plan]);
		expect(trashFile).toHaveBeenCalledTimes(3);
		expect(result.movedPaths).toEqual([backdrop.path, note.path]);
		expect(result.failures.map((failure) => failure.path)).toEqual([cover.path]);
		expect(deletionResultMessage(result)).toContain(cover.path);
		expect(result.successfulMediaIds).toEqual([note.path]);
		expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(cover.path), expect.any(Error));
	});
});

class FakeElement {
	tagName = "";
	className = "";
	textContent = "";
	children: FakeElement[] = [];
	listeners = new Map<string, Array<() => void>>();
	disabled = false;
	appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
	empty(): void { this.children = []; }
	addClass(name: string): void { this.className = `${this.className} ${name}`.trim(); }
	createEl(tag: string, options: { cls?: string; text?: string } = {}): FakeElement {
		return this.appendChild(Object.assign(new FakeElement(), { tagName: tag, className: options.cls ?? "", textContent: options.text ?? "" }));
	}
	createDiv(options?: string | { cls?: string; text?: string }): FakeElement {
		return this.createEl("div", typeof options === "string" ? { cls: options } : options);
	}
	addEventListener(name: string, listener: () => void): void {
		if (!this.listeners.has(name)) this.listeners.set(name, []);
		this.listeners.get(name)!.push(listener);
	}
	trigger(name: string): void { for (const listener of this.listeners.get(name) ?? []) listener(); }
}

function descendants(root: FakeElement): FakeElement[] {
	return [root, ...root.children.flatMap(descendants)];
}

function text(root: FakeElement): string {
	return descendants(root).map((element) => element.textContent).filter(Boolean).join("\n");
}

describe("Löschbestätigungsdialog", () => {
	let plan: MediaDeletionPlan;
	beforeEach(() => {
		const note = makeFile("Atlas/Sources/Movies/Dialog.md");
		const cover = makeFile("Atlas/Sources/Movies/Images/Dialog.jpg");
		const records = new Map([[note.path, { [P.type]: "movie", [P.cover]: cover.path, [P.backdrop]: "https://example.com/backdrop.jpg" }]]);
		const { app } = createApp([note, cover], records);
		plan = buildMediaDeletionPlan(app as never, mediaAt(movie({ title: "Dialogfilm" }), note.path));
	});

	it("zeigt alle Pfade, Sonderfälle und die korrekte Gesamtzahl", () => {
		const seriesNote = makeFile("Atlas/Sources/Series/Dialogserie.md");
		const seriesRecords = new Map([[seriesNote.path, {
			[P.type]: "series",
			[P.cover]: "Atlas/Sources/Series/Images/Fehlt.jpg",
			[P.backdrop]: "",
		}]]);
		const { app } = createApp([seriesNote], seriesRecords);
		const seriesPlan = buildMediaDeletionPlan(app as never, mediaAt(series({ title: "Dialogserie" }), seriesNote.path));
		const root = new FakeElement();
		renderMediaDeletionConfirmation(root as never, [plan, seriesPlan], { onCancel: vi.fn(), onConfirm: vi.fn() });
		const content = text(root);
		expect(content).toContain("Dialogfilm");
		expect(content).toContain("Dialogserie");
		expect(content).toContain("Atlas/Sources/Movies/Dialog.md");
		expect(content).toContain("Atlas/Sources/Series/Dialogserie.md");
		expect(content).toContain("Atlas/Sources/Movies/Images/Dialog.jpg");
		expect(content).toContain("extern – wird nicht gelöscht");
		expect(content).toContain("https://example.com/backdrop.jpg");
		expect(content).toContain("Datei nicht gefunden");
		expect(content).toContain("Atlas/Sources/Series/Images/Fehlt.jpg");
		expect(content).toContain("nicht vorhanden");
		expect(content).toContain("3 lokale Dateien insgesamt");
	});

	it("löscht beim Abbrechen nichts und startet beim Bestätigen exakt einmal", () => {
		const root = new FakeElement();
		const onCancel = vi.fn();
		const onConfirm = vi.fn();
		renderMediaDeletionConfirmation(root as never, [plan], { onCancel, onConfirm });
		const buttons = descendants(root).filter((element) => element.tagName === "button");
		buttons.find((button) => button.textContent === "Abbrechen")!.trigger("click");
		expect(onCancel).toHaveBeenCalledOnce();
		expect(onConfirm).not.toHaveBeenCalled();
		buttons.find((button) => button.textContent.includes("in Papierkorb verschieben"))!.trigger("click");
		expect(onConfirm).toHaveBeenCalledOnce();
	});
});

describe("Mengenformulierungen der Löschroutine", () => {
	it.each([
		[1, "Medium", "Medien", "1 Medium"],
		[2, "Medium", "Medien", "2 Medien"],
		[1, "Note", "Notes", "1 Note"],
		[2, "Note", "Notes", "2 Notes"],
		[1, "Cover", "Cover", "1 Cover"],
		[2, "Cover", "Cover", "2 Cover"],
		[1, "Backdrop", "Backdrops", "1 Backdrop"],
		[2, "Backdrop", "Backdrops", "2 Backdrops"],
		[1, "lokale Datei", "lokale Dateien", "1 lokale Datei"],
		[2, "lokale Datei", "lokale Dateien", "2 lokale Dateien"],
	])("formatiert %i korrekt", (count, singular, plural, expected) => {
		expect(formatCount(count as number, singular as string, plural as string)).toBe(expected);
	});

	it("verwendet die korrekten Formen im Modal", () => {
		const firstNote = makeFile("Atlas/Sources/Movies/Eins.md");
		const firstCover = makeFile("Atlas/Sources/Movies/Images/Eins.jpg");
		const firstBackdrop = makeFile("Atlas/Sources/Movies/Images/Eins-backdrop.jpg");
		const secondNote = makeFile("Atlas/Sources/Movies/Zwei.md");
		const secondCover = makeFile("Atlas/Sources/Movies/Images/Zwei.jpg");
		const secondBackdrop = makeFile("Atlas/Sources/Movies/Images/Zwei-backdrop.jpg");
		const records = new Map([
			[firstNote.path, { [P.type]: "movie", [P.cover]: firstCover.path, [P.backdrop]: firstBackdrop.path }],
			[secondNote.path, { [P.type]: "movie", [P.cover]: secondCover.path, [P.backdrop]: secondBackdrop.path }],
		]);
		const { app } = createApp([firstNote, firstCover, firstBackdrop, secondNote, secondCover, secondBackdrop], records);
		const firstPlan = buildMediaDeletionPlan(app as never, mediaAt(movie({ title: "Eins" }), firstNote.path));
		const secondPlan = buildMediaDeletionPlan(app as never, mediaAt(movie({ title: "Zwei" }), secondNote.path));

		const singularRoot = new FakeElement();
		renderMediaDeletionConfirmation(singularRoot as never, [firstPlan], { onCancel: vi.fn(), onConfirm: vi.fn() });
		const singular = text(singularRoot);
		expect(singular).toContain("1 Medium in den Papierkorb verschieben?");
		expect(singular).toContain("1 Note");
		expect(singular).toContain("1 Cover");
		expect(singular).toContain("1 Backdrop");

		const pluralRoot = new FakeElement();
		renderMediaDeletionConfirmation(pluralRoot as never, [firstPlan, secondPlan], { onCancel: vi.fn(), onConfirm: vi.fn() });
		const plural = text(pluralRoot);
		expect(plural).toContain("2 Medien in den Papierkorb verschieben?");
		expect(plural).toContain("2 Notes");
		expect(plural).toContain("2 Cover");
		expect(plural).toContain("2 Backdrops");

		const noteOnlyRecords = new Map([
			[firstNote.path, { [P.type]: "movie" }],
			[secondNote.path, { [P.type]: "movie" }],
		]);
		const noteOnlyApp = createApp([firstNote, secondNote], noteOnlyRecords).app;
		const noteOnlyPlans = [
			buildMediaDeletionPlan(noteOnlyApp as never, mediaAt(movie({ title: "Eins" }), firstNote.path)),
			buildMediaDeletionPlan(noteOnlyApp as never, mediaAt(movie({ title: "Zwei" }), secondNote.path)),
		];
		const oneFileRoot = new FakeElement();
		renderMediaDeletionConfirmation(oneFileRoot as never, noteOnlyPlans.slice(0, 1), { onCancel: vi.fn(), onConfirm: vi.fn() });
		expect(text(oneFileRoot)).toContain("1 lokale Datei insgesamt");
		expect(text(oneFileRoot)).toContain("1 Datei in Papierkorb verschieben");
		const twoFilesRoot = new FakeElement();
		renderMediaDeletionConfirmation(twoFilesRoot as never, noteOnlyPlans, { onCancel: vi.fn(), onConfirm: vi.fn() });
		expect(text(twoFilesRoot)).toContain("2 lokale Dateien insgesamt");
		expect(text(twoFilesRoot)).toContain("2 Dateien in Papierkorb verschieben");
	});

	it("formuliert Abschlussmeldungen und Fehler in Ein- und Mehrzahl", () => {
		expect(deletionResultMessage({ movedPaths: ["Eins.md"], failures: [], successfulMediaIds: [] }))
			.toBe("1 Datei in den Papierkorb verschoben.");
		expect(deletionResultMessage({ movedPaths: ["Eins.md", "Zwei.md"], failures: [], successfulMediaIds: [] }))
			.toBe("2 Dateien in den Papierkorb verschoben.");
		expect(deletionResultMessage({
			movedPaths: [], failures: [{ path: "Eins.md", error: new Error("Test") }], successfulMediaIds: [],
		})).toContain("1 Datei konnte nicht verschoben werden:");
		expect(deletionResultMessage({
			movedPaths: [],
			failures: [
				{ path: "Eins.md", error: new Error("Test") },
				{ path: "Zwei.md", error: new Error("Test") },
			],
			successfulMediaIds: [],
		})).toContain("2 Dateien konnten nicht verschoben werden:");
	});
});
