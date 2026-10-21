import type { MediaItem } from "../../types";
import { createStarRating } from "../../phase3/ui/StarRating";
import { mediaCardViewModel } from "../viewmodels";

export interface MediaCardInteractionOptions {
	selectionMode?: boolean;
	selected?: boolean;
	onToggleSelection?: (media: MediaItem) => void;
}

export function createMediaCard(
	media: MediaItem,
	onOpen: (media: MediaItem) => void,
	interaction: MediaCardInteractionOptions = {},
): HTMLElement {
	const vm = mediaCardViewModel(media);
	const card = document.createElement("article");
	card.className = `nacv-media-card${interaction.selectionMode ? " nacv-media-card--selectable" : ""}${interaction.selected ? " nacv-media-card--selected" : ""}`;
	card.tabIndex = 0;
	card.dataset.mediaId = vm.id;
	if (interaction.selectionMode) card.setAttribute("aria-selected", String(interaction.selected === true));

	const visual = card.createDiv("nacv-media-card__visual");
	if (vm.cover.src) {
		const image = visual.createEl("img", { attr: { src: vm.cover.src, alt: vm.title, loading: "lazy" } });
		image.addClass("nacv-media-card__image");
		image.addEventListener("error", () => {
			image.remove();
			visual.addClass("nacv-image-placeholder");
		});
	} else {
		visual.addClass("nacv-image-placeholder");
	}
	visual.createSpan({ cls: "nacv-badge nacv-badge--type", text: vm.typeLabel });
	if (vm.favorite) visual.createSpan({ cls: "nacv-badge nacv-badge--favorite", text: "Favorit" });
	if (interaction.selectionMode) {
		visual.createSpan({
			cls: `nacv-media-card__selection${interaction.selected ? " nacv-media-card__selection--selected" : ""}`,
			text: interaction.selected ? "Ausgewählt" : "Auswählen",
		});
	}

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

	const scores = body.createDiv("nacv-score-row nacv-media-card__zone--scores");
	if (vm.imdbRating !== undefined) scores.createSpan({ text: `IMDb: ${vm.imdbRating.toFixed(1)}` });
	if (vm.tmdbRating !== undefined) scores.createSpan({ text: `TMDB: ${vm.tmdbRating.toFixed(1)}` });

	const ratingZone = body.createDiv({
		cls: "nacv-card-rating nacv-media-card__zone--rating",
	});
	ratingZone.appendChild(createStarRating({ value: vm.personalRating, readonly: true, size: "sm" }));

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
