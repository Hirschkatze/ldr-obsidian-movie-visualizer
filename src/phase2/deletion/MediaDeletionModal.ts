import { Modal, type App } from "obsidian";
import { collectMediaDeletionTargets } from "./MediaDeletionExecutor";
import type { DeletionAssetPlan, DeletionNotePlan, MediaDeletionPlan } from "./MediaDeletionPlan";
import { formatCount } from "./MediaDeletionText";

export interface MediaDeletionConfirmationCallbacks {
	onCancel: () => void;
	onConfirm: () => void | Promise<void>;
}

function appendPath(parent: HTMLElement, path: string | undefined): void {
	if (path) parent.createDiv({ cls: "nacv-deletion-plan__path", text: path });
}

function appendNote(parent: HTMLElement, note: DeletionNotePlan): void {
	if (note.status === "local-existing") {
		appendPath(parent, note.resolvedPath);
		return;
	}
	const text = note.status === "outside-allowed-root"
		? "außerhalb des erlaubten Medienordners – wird nicht gelöscht"
		: "Datei nicht gefunden";
	parent.createDiv({ cls: "nacv-deletion-plan__status", text });
	appendPath(parent, note.resolvedPath);
}

function appendAsset(parent: HTMLElement, asset: DeletionAssetPlan): void {
	if (asset.status === "local-existing") {
		appendPath(parent, asset.resolvedPath);
		return;
	}
	if (asset.status === "empty") {
		parent.createDiv({ cls: "nacv-deletion-plan__status", text: "nicht vorhanden" });
		return;
	}
	const labels: Record<Exclude<DeletionAssetPlan["status"], "local-existing" | "empty">, string> = {
		external: "extern – wird nicht gelöscht",
		"local-missing": "Datei nicht gefunden",
		"outside-allowed-root": "außerhalb des erlaubten Medienordners – wird nicht gelöscht",
	};
	parent.createDiv({ cls: "nacv-deletion-plan__status", text: labels[asset.status] });
	appendPath(parent, asset.resolvedPath ?? asset.rawValue);
}

function appendField(parent: HTMLElement, label: string, render: (value: HTMLElement) => void): void {
	const row = parent.createDiv("nacv-deletion-plan__field");
	row.createDiv({ cls: "nacv-deletion-plan__label", text: label });
	const value = row.createDiv("nacv-deletion-plan__value");
	render(value);
}

export function renderMediaDeletionConfirmation(
	container: HTMLElement,
	plans: readonly MediaDeletionPlan[],
	callbacks: MediaDeletionConfirmationCallbacks,
): void {
	container.empty();
	container.addClass("nacv-deletion-modal");
	container.createEl("h2", { text: `${formatCount(plans.length, "Medium", "Medien")} in den Papierkorb verschieben?` });
	container.createEl("p", { text: "Es werden ausschließlich die unten aufgeführten zulässigen lokalen Dateien verschoben." });
	const list = container.createDiv("nacv-deletion-plan");
	for (const plan of plans) {
		const item = list.createEl("section", { cls: "nacv-deletion-plan__item" });
		item.createDiv({ cls: "nacv-deletion-plan__type", text: plan.mediaType === "movie" ? "FILM" : "SERIE" });
		item.createEl("h3", { text: plan.title });
		appendField(item, "Note", (value) => appendNote(value, plan.note));
		appendField(item, "Cover", (value) => appendAsset(value, plan.cover));
		appendField(item, "Backdrop", (value) => appendAsset(value, plan.backdrop));
	}

	const noteCount = plans.filter((plan) => plan.note.status === "local-existing").length;
	const coverCount = plans.filter((plan) => plan.cover.status === "local-existing").length;
	const backdropCount = plans.filter((plan) => plan.backdrop.status === "local-existing").length;
	const total = collectMediaDeletionTargets(plans).length;
	const summary = container.createDiv("nacv-deletion-summary");
	summary.createEl("strong", { text: "Zusammenfassung" });
	summary.createDiv({ text: formatCount(noteCount, "Note", "Notes") });
	summary.createDiv({ text: formatCount(coverCount, "Cover", "Cover") });
	summary.createDiv({ text: formatCount(backdropCount, "Backdrop", "Backdrops") });
	summary.createDiv({ text: `${formatCount(total, "lokale Datei", "lokale Dateien")} insgesamt` });

	const actions = container.createDiv("nacv-deletion-modal__actions");
	const cancel = actions.createEl("button", { cls: "nacv-button nacv-button--secondary", text: "Abbrechen" });
	const confirm = actions.createEl("button", {
		cls: "nacv-button nacv-button--destructive",
		text: `${formatCount(total, "Datei", "Dateien")} in Papierkorb verschieben`,
	});
	cancel.addEventListener("click", callbacks.onCancel);
	let pending = false;
	confirm.addEventListener("click", () => {
		if (pending) return;
		pending = true;
		cancel.disabled = true;
		confirm.disabled = true;
		void Promise.resolve(callbacks.onConfirm()).finally(() => {
			pending = false;
			cancel.disabled = false;
			confirm.disabled = false;
		});
	});
}

export class MediaDeletionModal extends Modal {
	constructor(
		app: App,
		private readonly plans: readonly MediaDeletionPlan[],
		private readonly confirmDeletion: () => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		renderMediaDeletionConfirmation(this.contentEl, this.plans, {
			onCancel: () => this.close(),
			onConfirm: async () => {
				await this.confirmDeletion();
				this.close();
			},
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
