import type { MediaItem, WatchStatus } from "../../types";
import { filterMedia, uniqueGenres, uniqueReleaseStatuses } from "../filter";
import { sortMedia } from "../sort";
import { DEFAULT_CATALOG_FILTER, type CatalogFilterState, type MediaSortState } from "../types";
import { createMediaCard } from "./MediaCard";

export interface CatalogViewOptions {
	items: MediaItem[];
	filter: CatalogFilterState;
	sort: MediaSortState;
	onFilterChange: (filter: CatalogFilterState) => void;
	onSortChange: (sort: MediaSortState) => void;
	onOpen: (media: MediaItem) => void;
}

function numericValue(input: HTMLInputElement): number | undefined {
	if (!input.value.trim()) return undefined;
	const value = Number(input.value);
	return Number.isFinite(value) ? value : undefined;
}

function addSelect(
	parent: HTMLElement,
	label: string,
	value: string,
	options: Array<{ value: string; label: string }>,
	onChange: (value: string) => void
): void {
	const field = parent.createEl("label", { cls: "nacv-field" });
	field.createSpan({ text: label });
	const select = field.createEl("select", { cls: "nacv-select" });
	for (const option of options) {
		const element = select.createEl("option", { text: option.label, attr: { value: option.value } });
		element.selected = option.value === value;
	}
	select.addEventListener("change", () => onChange(select.value));
}

function addTextInput(parent: HTMLElement, label: string, value: string, onChange: (value: string) => void): void {
	const field = parent.createEl("label", { cls: "nacv-field" });
	field.createSpan({ text: label });
	const input = field.createEl("input", { cls: "nacv-input", attr: { type: "text", value } });
	input.addEventListener("change", () => onChange(input.value));
}

function addNumberInput(
	parent: HTMLElement,
	label: string,
	value: number | undefined,
	onChange: (value: number | undefined) => void
): void {
	const field = parent.createEl("label", { cls: "nacv-field" });
	field.createSpan({ text: label });
	const input = field.createEl("input", {
		cls: "nacv-input",
		attr: { type: "number", value: value === undefined ? "" : String(value), step: "0.5" },
	});
	input.addEventListener("change", () => onChange(numericValue(input)));
}

export function renderCatalog(container: HTMLElement, options: CatalogViewOptions): void {
	container.empty();
	const header = container.createDiv("nacv-view-header");
	header.createEl("h1", { text: "Katalog" });
	header.createEl("p", { text: "Filme und Serien aus dem verbindlichen New-Almanach-Schema." });

	const layout = container.createDiv("nacv-catalog-layout");
	const filters = layout.createEl("aside", { cls: "nacv-filter-panel" });
	filters.createEl("h2", { text: "Filter" });
	const update = (patch: Partial<CatalogFilterState>) => options.onFilterChange({ ...options.filter, ...patch });

	addSelect(filters, "Genre", options.filter.genre, [
		{ value: "", label: "Alle Genres" },
		...uniqueGenres(options.items).map((genre) => ({ value: genre, label: genre })),
	], (genre) => update({ genre }));
	const statuses: Array<{ value: WatchStatus | "all"; label: string }> = [
		{ value: "all", label: "Alle Status" },
		{ value: "planned", label: "Geplant" },
		{ value: "watching", label: "In Wiedergabe" },
		{ value: "completed", label: "Gesehen" },
		{ value: "paused", label: "Pausiert" },
		{ value: "dropped", label: "Abgebrochen" },
	];
	addSelect(filters, "Sichtungsstatus", options.filter.watchStatus, statuses, (watchStatus) =>
		update({ watchStatus: watchStatus as CatalogFilterState["watchStatus"] }));
	addSelect(filters, "Favorit", options.filter.favorite, [
		{ value: "all", label: "Alle" },
		{ value: "favorites", label: "Nur Favoriten" },
	], (favorite) => update({ favorite: favorite as CatalogFilterState["favorite"] }));
	addNumberInput(filters, "Jahr von", options.filter.yearFrom, (yearFrom) => update({ yearFrom }));
	addNumberInput(filters, "Jahr bis", options.filter.yearTo, (yearTo) => update({ yearTo }));
	addNumberInput(filters, "Meine Bewertung ab", options.filter.personalRatingMin, (personalRatingMin) => update({ personalRatingMin }));
	addNumberInput(filters, "IMDb ab", options.filter.imdbRatingMin, (imdbRatingMin) => update({ imdbRatingMin }));
	addNumberInput(filters, "TMDB ab", options.filter.tmdbRatingMin, (tmdbRatingMin) => update({ tmdbRatingMin }));
	addSelect(filters, "Filmlaufzeit", options.filter.runtime, [
		{ value: "all", label: "Alle" },
		{ value: "under90", label: "Unter 90 Minuten" },
		{ value: "90to150", label: "90 bis 150 Minuten" },
		{ value: "over150", label: "Über 150 Minuten" },
	], (runtime) => update({ runtime: runtime as CatalogFilterState["runtime"] }));
	addTextInput(filters, "Regie / Serienschöpfer:innen", options.filter.person, (person) => update({ person }));
	addTextInput(filters, "Cast", options.filter.cast, (cast) => update({ cast }));
	addSelect(filters, "Veröffentlichungsstatus", options.filter.releaseStatus, [
		{ value: "", label: "Alle Status" },
		...uniqueReleaseStatuses(options.items).map((status) => ({ value: status, label: status })),
	], (releaseStatus) => update({ releaseStatus }));
	const reset = filters.createEl("button", { cls: "nacv-button nacv-button--secondary", text: "Filter zurücksetzen" });
	reset.addEventListener("click", () => options.onFilterChange({ ...DEFAULT_CATALOG_FILTER, mediaType: options.filter.mediaType }));

	const content = layout.createDiv("nacv-catalog-content");
	const toolbar = content.createDiv("nacv-catalog-toolbar");
	const filtered = filterMedia(options.items, options.filter);
	const sorted = sortMedia(filtered, options.sort);
	toolbar.createSpan({ text: `${sorted.length} von ${options.items.length} Einträgen` });
	addSelect(toolbar, "Sortierung", options.sort.key, [
		{ value: "title", label: "Titel" },
		{ value: "year", label: "Jahr" },
		{ value: "personal-rating", label: "Meine Bewertung" },
		{ value: "imdb-rating", label: "IMDb-Bewertung" },
		{ value: "tmdb-rating", label: "TMDB-Bewertung" },
		{ value: "runtime", label: "Filmlaufzeit" },
		{ value: "last-watched", label: "Zuletzt gesehen" },
		{ value: "watch-count", label: "Filmsichtungen" },
		{ value: "season-count", label: "Staffelzahl" },
		{ value: "episode-count", label: "Episodenzahl" },
		{ value: "created", label: "Erstellt" },
	], (key) => options.onSortChange({ ...options.sort, key: key as MediaSortState["key"] }));
	addSelect(toolbar, "Richtung", options.sort.direction, [
		{ value: "asc", label: "Aufsteigend" },
		{ value: "desc", label: "Absteigend" },
	], (direction) => options.onSortChange({ ...options.sort, direction: direction as MediaSortState["direction"] }));

	if (!sorted.length) {
		content.createDiv({ cls: "nacv-empty", text: "Keine passenden Filme oder Serien gefunden." });
		return;
	}
	const grid = content.createDiv("nacv-media-grid");
	for (const media of sorted) grid.appendChild(createMediaCard(media, options.onOpen));
}

