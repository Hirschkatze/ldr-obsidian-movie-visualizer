import type { MediaItem } from "../../types";
import { mediaCardViewModel } from "../viewmodels";

export function createMediaCard(media: MediaItem, onOpen: (media: MediaItem) => void): HTMLElement {
	const vm = mediaCardViewModel(media);
	const card = document.createElement("article");
	card.className = "nacv-media-card";
	card.tabIndex = 0;
	card.dataset.mediaId = vm.id;

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

	const body = card.createDiv("nacv-media-card__body");
	body.createEl("h2", { cls: "nacv-media-card__title", text: vm.title });
	if (vm.originalTitle) body.createDiv({ cls: "nacv-media-card__original", text: vm.originalTitle });
	const meta = [vm.year ? String(vm.year) : undefined, ...vm.specificFacts].filter(Boolean).join(" · ");
	if (meta) body.createDiv({ cls: "nacv-media-card__meta", text: meta });

	const badges = body.createDiv("nacv-media-card__badges");
	badges.createSpan({ cls: "nacv-badge", text: vm.statusLabel });
	if (vm.newSeasonAvailable) badges.createSpan({ cls: "nacv-badge nacv-badge--notice", text: "Neue Staffel verfügbar" });

	if (vm.genres.length) {
		const genres = body.createDiv("nacv-chip-row");
		for (const genre of vm.genres.slice(0, 3)) genres.createSpan({ cls: "nacv-chip", text: genre });
	}

	const scores = body.createDiv("nacv-score-row");
	if (vm.personalRating !== undefined) scores.createSpan({ text: `Meine: ${vm.personalRating.toFixed(1)}` });
	if (vm.imdbRating !== undefined) scores.createSpan({ text: `IMDb: ${vm.imdbRating.toFixed(1)}` });
	if (vm.tmdbRating !== undefined) scores.createSpan({ text: `TMDB: ${vm.tmdbRating.toFixed(1)}` });

	const open = () => onOpen(media);
	card.addEventListener("click", open);
	card.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			open();
		}
	});
	return card;
}

