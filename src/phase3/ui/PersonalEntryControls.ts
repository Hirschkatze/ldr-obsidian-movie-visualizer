import { Notice } from "obsidian";
import type { MediaItem, WatchStatus } from "../../types";
import type { PersonalMediaActions } from "../PersonalMediaActions";
import { movieActionVisibility } from "../movieActionVisibility";

export interface PersonalEntryControlsOptions {
	media: MediaItem;
	actions: PersonalMediaActions;
	onSettled: () => void;
}

const STATUS_OPTIONS: Array<{ value: WatchStatus; label: string }> = [
	{ value: "planned", label: "Geplant" },
	{ value: "watching", label: "Wird angesehen" },
	{ value: "completed", label: "Abgeschlossen" },
	{ value: "paused", label: "Pausiert" },
	{ value: "dropped", label: "Abgebrochen" },
];

function button(parent: HTMLElement, text: string, className = "nacv-button nacv-button--secondary"): HTMLButtonElement {
	return parent.createEl("button", { cls: className, text });
}

export function createPersonalEntryControls(options: PersonalEntryControlsOptions): HTMLElement {
	const { media, actions } = options;
	const section = document.createElement("section");
	section.className = "nacv-detail__section nacv-personal-entry";
	section.createEl("h2", { text: "Mein Eintrag" });
	const fields = section.createEl("fieldset", { cls: "nacv-personal-entry__fields" });
	fields.disabled = actions.isPending(media.id);

	const run = async (operation: () => Promise<boolean>): Promise<void> => {
		if (fields.disabled) return;
		fields.disabled = true;
		try {
			await operation();
		} catch (error) {
			new Notice(`Die Änderung konnte nicht gespeichert werden: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`);
		} finally {
			fields.disabled = false;
			options.onSettled();
		}
	};

	const ratingField = fields.createEl("label", { cls: "nacv-field" });
	ratingField.createSpan({ text: "Persönliche Bewertung" });
	const rating = ratingField.createEl("select", { cls: "nacv-select" });
	for (let value = 0; value <= 10; value += 0.5) {
		const option = rating.createEl("option", { text: value === 0 ? "Nicht bewertet" : value.toFixed(1).replace(".", ","), attr: { value: String(value) } });
		option.selected = (media.personalRating ?? 0) === value;
	}
	rating.addEventListener("change", () => { void run(() => actions.setRating(media, Number(rating.value))); });
	button(fields, "Bewertung entfernen").addEventListener("click", () => { void run(() => actions.setRating(media, 0)); });

	const favorite = fields.createEl("label", { cls: "nacv-personal-entry__checkbox" });
	const favoriteInput = favorite.createEl("input", { attr: { type: "checkbox" } });
	favoriteInput.checked = media.favorite;
	favorite.createSpan({ text: "Favorit" });
	favoriteInput.addEventListener("change", () => { void run(() => actions.setFavorite(media, favoriteInput.checked)); });

	const statusField = fields.createEl("label", { cls: "nacv-field" });
	statusField.createSpan({ text: "Sichtungsstatus" });
	const status = statusField.createEl("select", { cls: "nacv-select" });
	for (const item of STATUS_OPTIONS) {
		const option = status.createEl("option", { text: item.label, attr: { value: item.value } });
		option.selected = media.watchStatus === item.value;
	}
	status.addEventListener("change", () => { void run(() => actions.setWatchStatus(media, status.value as WatchStatus)); });

	const dateField = fields.createEl("label", { cls: "nacv-field" });
	dateField.createSpan({ text: "Letzte Sichtung" });
	const date = dateField.createEl("input", { cls: "nacv-input", attr: { type: "date", value: media.lastWatched ?? "" } });
	date.addEventListener("change", () => { if (date.value) void run(() => actions.setLastWatched(media, date.value)); });
	const dateActions = fields.createDiv("nacv-personal-entry__actions");
	button(dateActions, "Heute").addEventListener("click", () => { void run(() => actions.setLastWatchedToday(media)); });
	button(dateActions, "Datum entfernen").addEventListener("click", () => { void run(() => actions.setLastWatched(media, null)); });

	const specific = fields.createDiv("nacv-personal-entry__specific");
	if (media.type === "movie") {
		const visibility = movieActionVisibility(media.watchCount);
		if (visibility.showMarkWatched) {
			button(specific, "Als gesehen markieren", "nacv-button nacv-button--primary").addEventListener("click", () => { void run(() => actions.markWatched(media)); });
		}
		if (visibility.showRewatch) {
			button(specific, "Erneut gesehen").addEventListener("click", () => { void run(() => actions.rewatch(media)); });
		}
		if (visibility.showCorrectUnwatched) {
			button(specific, "Als ungesehen korrigieren", "nacv-button nacv-button--destructive").addEventListener("click", () => {
				const confirmed = window.confirm("Film wirklich als ungesehen korrigieren? Sichtungsdatum und Sichtungszahl werden zurückgesetzt.");
				void run(() => actions.correctUnwatched(media, confirmed));
			});
		}
	} else {
		const progressField = specific.createEl("label", { cls: "nacv-field" });
		progressField.createSpan({ text: "Gesehen bis Staffel" });
		const attributes: Record<string, string> = { type: "number", min: "0", step: "1", value: media.watchedThroughSeason === undefined ? "" : String(media.watchedThroughSeason) };
		if (media.seasonCount !== undefined) attributes.max = String(media.seasonCount);
		const progress = progressField.createEl("input", { cls: "nacv-input", attr: attributes });
		button(specific, "Fortschritt speichern", "nacv-button nacv-button--primary").addEventListener("click", () => {
			if (progress.value !== "") void run(() => actions.setSeriesProgress(media, Number(progress.value)));
		});
		button(specific, "Fortschritt entfernen").addEventListener("click", () => { void run(() => actions.setSeriesProgress(media, null)); });
	}
	return section;
}
