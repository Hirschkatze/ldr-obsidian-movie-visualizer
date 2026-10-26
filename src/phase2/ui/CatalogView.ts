import { setIcon } from "obsidian";
import type { MediaItem, WatchStatus } from "../../types";
import { filterMedia, uniqueGenres, uniqueReleaseStatuses } from "../filter";
import { sortMedia } from "../sort";
import { DEFAULT_CATALOG_FILTER, type CatalogDensity, type CatalogFilterState, type MediaSortState } from "../types";
import { createMediaCard } from "./MediaCard";

export interface CatalogViewOptions {
	items: MediaItem[];
	headingContainer: HTMLElement;
	filter: CatalogFilterState;
	sort: MediaSortState;
	density?: CatalogDensity;
	onFilterChange: (filter: CatalogFilterState) => void;
	onSortChange: (sort: MediaSortState) => void;
	onDensityChange?: (density: CatalogDensity) => void;
	onOpen: (media: MediaItem) => void;
	selection?: CatalogSelectionOptions;
}

const DENSITY_OPTIONS: Array<{
	value: CatalogDensity;
	label: string;
	icon?: string;
	iconCells?: number;
}> = [
	{ value: "large", label: "Groß", icon: "gallery-horizontal-end" },
	{ value: "standard", label: "Standard", icon: "layout-grid" },
	{ value: "compact", label: "Kompakt", iconCells: 6 },
	{ value: "poster", label: "Posterwand", iconCells: 9 },
];

function addDensityControl(
	parent: HTMLElement,
	density: CatalogDensity,
	onChange: ((density: CatalogDensity) => void) | undefined,
): void {
	const group = parent.createDiv({
		cls: "nacv-density-control",
		attr: { role: "group", "aria-label": "Ansichtsdichte" },
	});
	for (const option of DENSITY_OPTIONS) {
		const active = option.value === density;
		const button = group.createEl("button", {
			cls: `nacv-density-control__button${active ? " nacv-density-control__button--active" : ""}`,
			attr: {
				type: "button",
				title: option.label,
				"aria-label": option.label,
				"aria-pressed": String(active),
			},
		});
		if (option.icon) {
			setIcon(button, option.icon);
		} else {
			const icon = button.createSpan({
				cls: `nacv-density-control__icon nacv-density-control__icon--${option.value}`,
				attr: { "aria-hidden": "true" },
			});
			for (let index = 0; index < (option.iconCells ?? 0); index += 1) icon.createSpan();
		}
		button.addEventListener("click", () => onChange?.(option.value));
	}
}

export interface CatalogSelectionOptions {
	active: boolean;
	selectedIds: ReadonlySet<string>;
	onStart: () => void;
	onExit: () => void;
	onClear: () => void;
	onToggle: (media: MediaItem) => void;
	onDelete: () => void;
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
	onChange: (value: string) => void,
	disabled = false,
): void {
	const field = parent.createEl("label", { cls: "nacv-field" });
	field.createSpan({ text: label });
	const select = field.createEl("select", { cls: "nacv-select" });
	select.disabled = disabled;
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
	const density = options.density ?? "standard";
	container.empty();
	options.headingContainer.empty();
	const header = options.headingContainer.createDiv("nacv-view-header");
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
	addSelect(filters, "Fortsetzung", options.filter.continuation, [
		{ value: "all", label: "Alle" },
		{ value: "possible", label: "Möglich" },
		{ value: "recorded", label: "Staffel erfasst" },
		{ value: "scheduled", label: "Termin angekündigt" },
	], (continuation) => update({ continuation: continuation as CatalogFilterState["continuation"] }), options.filter.mediaType === "movie");
	const reset = filters.createEl("button", { cls: "nacv-button nacv-button--secondary", text: "Filter zurücksetzen" });
	reset.addEventListener("click", () => options.onFilterChange({ ...DEFAULT_CATALOG_FILTER, mediaType: options.filter.mediaType }));

	const content = layout.createDiv("nacv-catalog-content");
	const toolbar = content.createDiv("nacv-catalog-toolbar");
	const filtered = filterMedia(options.items, options.filter);
	const sorted = sortMedia(filtered, options.sort);
	toolbar.createSpan({ cls: "nacv-catalog-toolbar__count", text: `${sorted.length} von ${options.items.length} Einträgen` });
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
		{ value: "next-season-air-date", label: "Nächster Ausstrahlungstermin" },
	], (key) => options.onSortChange({ ...options.sort, key: key as MediaSortState["key"] }));
	addSelect(toolbar, "Richtung", options.sort.direction, [
		{ value: "asc", label: "Aufsteigend" },
		{ value: "desc", label: "Absteigend" },
	], (direction) => options.onSortChange({ ...options.sort, direction: direction as MediaSortState["direction"] }));
	addDensityControl(toolbar, density, options.onDensityChange);
	if (options.selection) {
		const selection = toolbar.createDiv("nacv-catalog-selection");
		if (!options.selection.active) {
			const start = selection.createEl("button", { cls: "nacv-button nacv-button--secondary", text: "Auswählen" });
			start.addEventListener("click", options.selection.onStart);
		} else {
			selection.createSpan({ cls: "nacv-catalog-selection__count", text: `${options.selection.selectedIds.size} ausgewählt` });
			const clear = selection.createEl("button", { cls: "nacv-button nacv-button--secondary", text: "Auswahl aufheben" });
			clear.disabled = options.selection.selectedIds.size === 0;
			clear.addEventListener("click", options.selection.onClear);
			const remove = selection.createEl("button", { cls: "nacv-button nacv-button--destructive", text: "Auswahl löschen" });
			remove.disabled = options.selection.selectedIds.size === 0;
			remove.addEventListener("click", options.selection.onDelete);
			const exit = selection.createEl("button", { cls: "nacv-button nacv-button--secondary", text: "Auswahlmodus beenden" });
			exit.addEventListener("click", options.selection.onExit);
		}
	}

	if (!sorted.length) {
		content.createDiv({ cls: "nacv-empty", text: "Keine passenden Filme oder Serien gefunden." });
		return;
	}
	const grid = content.createDiv(`nacv-media-grid nacv-media-grid--${density}`);
	for (const media of sorted) {
		grid.appendChild(createMediaCard(media, options.onOpen, {
			density,
			selectionMode: options.selection?.active,
			selected: options.selection?.selectedIds.has(media.id),
			onToggleSelection: options.selection?.onToggle,
		}));
	}
}
