import type { MediaItem } from "../../types";
import { createStarRating } from "../../phase3/ui/StarRating";
import type { CatalogDensity } from "../types";
import { mediaCardViewModel, type MediaCardViewModel } from "../viewmodels";

export interface MediaCardInteractionOptions {
	selectionMode?: boolean;
	selected?: boolean;
	onToggleSelection?: (media: MediaItem) => void;
	density?: CatalogDensity;
}

function appendVisual(
	card: HTMLElement,
	vm: MediaCardViewModel,
	interaction: MediaCardInteractionOptions,
	showBadges: boolean,
	onImageUnavailable?: (visual: HTMLElement) => void,
): void {
	const visual = card.createDiv("nacv-media-card__visual");
	if (vm.cover.src) {
		const image = visual.createEl("img", { attr: { src: vm.cover.src, alt: vm.title, loading: "lazy" } });
		image.addClass("nacv-media-card__image");
		image.addEventListener("error", () => {
			image.remove();
			visual.addClass("nacv-image-placeholder");
			onImageUnavailable?.(visual);
		});
	} else {
		visual.addClass("nacv-image-placeholder");
		onImageUnavailable?.(visual);
	}
	if (showBadges) {
		visual.createSpan({ cls: "nacv-badge nacv-badge--type", text: vm.typeLabel });
		if (vm.favorite) visual.createSpan({ cls: "nacv-badge nacv-badge--favorite", text: "Favorit" });
	}
	if (interaction.selectionMode) {
		visual.createSpan({
			cls: `nacv-media-card__selection${interaction.selected ? " nacv-media-card__selection--selected" : ""}`,
			text: interaction.selected ? "Ausgewählt" : "Auswählen",
		});
	}
}

function appendFullBody(card: HTMLElement, vm: MediaCardViewModel): void {
	const body = card.createDiv("nacv-media-card__body");
	body.createEl("h2", { cls: "nacv-media-card__title nacv-media-card__zone--title", text: vm.title });
	body.createDiv({ cls: "nacv-media-card__original nacv-media-card__zone--original", text: vm.originalTitle ?? "" });
	const meta = [vm.year ? String(vm.year) : undefined, ...vm.specificFacts].filter(Boolean).join(" · ");
	body.createDiv({ cls: "nacv-media-card__meta nacv-media-card__zone--meta", text: meta });

	const status = body.createDiv("nacv-media-card__badges nacv-media-card__zone--status");
	status.createSpan({ cls: "nacv-badge", text: vm.statusLabel });
	if (vm.newSeasonAvailable) status.createSpan({ cls: "nacv-badge nacv-badge--notice", text: "Neue Staffel verfügbar" });

	const genres = body.createDiv({
		cls: `nacv-chip-row nacv-media-card__zone--genres${vm.hiddenGenreCount ? " nacv-media-card__zone--genres-overflow" : ""}`,
		attr: { title: vm.genres.join(", ") },
	});
	for (const genre of vm.visibleGenres) genres.createSpan({ cls: "nacv-chip", text: genre });
	if (vm.hiddenGenreCount) genres.createSpan({ cls: "nacv-chip nacv-chip--overflow", text: `+${vm.hiddenGenreCount}` });

	appendScores(body, vm);
	appendRating(body, vm);
}

function appendScores(parent: HTMLElement, vm: MediaCardViewModel): void {
	const scores = parent.createDiv("nacv-score-row nacv-media-card__zone--scores");
	if (vm.imdbRating !== undefined) scores.createSpan({ text: `IMDb: ${vm.imdbRating.toFixed(1)}` });
	if (vm.tmdbRating !== undefined) scores.createSpan({ text: `TMDB: ${vm.tmdbRating.toFixed(1)}` });
}

function appendRating(parent: HTMLElement, vm: MediaCardViewModel): void {
	const ratingZone = parent.createDiv({
		cls: "nacv-card-rating nacv-media-card__zone--rating",
	});
	ratingZone.appendChild(createStarRating({ value: vm.personalRating, readonly: true, size: "sm" }));
}

function appendCompactScores(parent: HTMLElement, vm: MediaCardViewModel): void {
	const scores = parent.createDiv("nacv-media-card__compact-scores nacv-media-card__zone--scores");
	if (vm.imdbRating !== undefined) scores.createSpan({ text: `IMDb: ${vm.imdbRating.toFixed(1)}` });
	if (vm.tmdbRating !== undefined) scores.createSpan({ text: `TMDB: ${vm.tmdbRating.toFixed(1)}` });
}

function appendCompactBody(card: HTMLElement, vm: MediaCardViewModel): void {
	const body = card.createDiv("nacv-media-card__body nacv-media-card__body--compact");
	body.createEl("h2", {
		cls: "nacv-media-card__title nacv-media-card__zone--title",
		text: vm.title,
		attr: { title: vm.title },
	});
	body.createDiv({ cls: "nacv-media-card__compact-year", text: vm.year === undefined ? "" : String(vm.year) });
	appendCompactScores(body, vm);
	appendRating(body, vm);
}

export function createMediaCard(
	media: MediaItem,
	onOpen: (media: MediaItem) => void,
	interaction: MediaCardInteractionOptions = {},
): HTMLElement {
	const vm = mediaCardViewModel(media);
	const density = interaction.density ?? "standard";
	const card = document.createElement("article");
	card.className = `nacv-media-card${density === "standard" ? "" : ` nacv-media-card--${density}`}${interaction.selectionMode ? " nacv-media-card--selectable" : ""}${interaction.selected ? " nacv-media-card--selected" : ""}`;
	card.tabIndex = 0;
	card.dataset.mediaId = vm.id;
	card.dataset.density = density;
	if (interaction.selectionMode) card.setAttribute("aria-selected", String(interaction.selected === true));
	if (density === "poster") {
		card.setAttribute("title", vm.title);
		card.setAttribute("aria-label", vm.title);
	}

	let posterFallbackAdded = false;
	const addPosterFallback = (visual: HTMLElement) => {
		if (posterFallbackAdded) return;
		posterFallbackAdded = true;
		const fallback = visual.createDiv({
			cls: "nacv-media-card__poster-fallback",
			attr: { "aria-hidden": "true" },
		});
		fallback.createSpan({ cls: "nacv-media-card__poster-fallback-label", text: "Kein Bild" });
		fallback.createSpan({ cls: "nacv-media-card__poster-fallback-title", text: vm.title });
	};
	appendVisual(
		card,
		vm,
		interaction,
		density === "standard" || density === "large",
		density === "poster" ? addPosterFallback : undefined,
	);
	if (density === "compact") appendCompactBody(card, vm);
	else if (density !== "poster") appendFullBody(card, vm);

	const activate = () => {
		if (interaction.selectionMode) {
			interaction.onToggleSelection?.(media);
			return;
		}
		onOpen(media);
	};
	card.addEventListener("click", activate);
	card.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			activate();
		}
	});
	return card;
}
