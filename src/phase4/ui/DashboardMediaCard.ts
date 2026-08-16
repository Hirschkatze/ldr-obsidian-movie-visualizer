import type { MediaItem } from "../../types";
import { createStarRating } from "../../phase3/ui/StarRating";
import { mediaTypeLabel } from "../../phase2/format";

export type DashboardCardContext = "recent" | "favorite" | "top-rated" | "planned" | "filmography";

export interface DashboardMediaCardOptions {
	media: MediaItem;
	context: DashboardCardContext;
	onOpen: (media: MediaItem) => void;
}

export function formatDashboardDate(value: string): string {
	const [year, month, day] = value.split("-").map(Number);
	return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
		.format(new Date(year, month - 1, day));
}

export function createDashboardMediaCard(options: DashboardMediaCardOptions): HTMLElement {
	const { media } = options;
	const card = document.createElement("article");
	card.className = "nacv-dashboard-card";
	card.tabIndex = 0;
	card.dataset.mediaId = media.id;

	const visual = card.createDiv("nacv-dashboard-card__visual");
	if (media.cover) {
		const image = visual.createEl("img", { cls: "nacv-dashboard-card__image", attr: { src: media.cover, alt: media.title, loading: "lazy" } });
		image.addEventListener("error", () => {
			image.remove();
			visual.addClass("nacv-image-placeholder");
		});
	} else {
		visual.addClass("nacv-image-placeholder");
	}
	if (options.context === "favorite") visual.createSpan({ cls: "nacv-dashboard-card__favorite", text: "Favorit" });
	if (options.context === "filmography") visual.createSpan({ cls: "nacv-dashboard-card__type", text: mediaTypeLabel(media.type) });

	const body = card.createDiv("nacv-dashboard-card__body");
	body.createEl("h3", { cls: "nacv-dashboard-card__title", text: media.title });
	if (media.year !== undefined) body.createDiv({ cls: "nacv-dashboard-card__year", text: String(media.year) });
	if (options.context !== "planned" && (options.context !== "filmography" || (media.personalRating ?? 0) > 0)) {
		body.createDiv("nacv-dashboard-card__rating")
			.appendChild(createStarRating({ value: media.personalRating, readonly: true, size: "sm" }));
	}
	if (options.context === "recent" && media.lastWatched) {
		body.createDiv({ cls: "nacv-dashboard-card__date", text: `Gesehen am ${formatDashboardDate(media.lastWatched)}` });
	}

	const open = (): void => options.onOpen(media);
	card.addEventListener("click", open);
	card.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			open();
		}
	});
	return card;
}
