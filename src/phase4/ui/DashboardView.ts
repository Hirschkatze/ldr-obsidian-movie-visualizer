import type { MediaItem } from "../../types";
import type { MediaTypeFilter } from "../../phase2/types";
import { mediaTypeLabel, watchStatusLabel } from "../../phase2/format";
import { createStarRating } from "../../phase3/ui/StarRating";
import {
	selectDashboardHero,
	selectFavorites,
	selectPlanned,
	selectRecentlyWatched,
	selectTopRated,
} from "../dashboardSelectors";
import { createDashboardMediaCard, type DashboardCardContext } from "./DashboardMediaCard";

export interface DashboardViewOptions {
	items: MediaItem[];
	headingContainer: HTMLElement;
	mediaType: MediaTypeFilter;
	onOpen: (media: MediaItem) => void;
}

function appendHeroImage(parent: HTMLElement, media: MediaItem): void {
	const source = media.backdrop ?? media.cover;
	if (!source) {
		parent.addClass("nacv-image-placeholder");
		return;
	}
	const image = parent.createEl("img", {
		cls: "nacv-dashboard-hero__image",
		attr: { src: source, alt: "", loading: "eager" },
	});
	image.addEventListener("error", () => {
		image.remove();
		parent.addClass("nacv-image-placeholder");
	});
}

function renderHero(parent: HTMLElement, media: MediaItem, onOpen: (media: MediaItem) => void): void {
	const hero = parent.createEl("article", { cls: "nacv-dashboard-hero" });
	hero.dataset.mediaId = media.id;
	const visual = hero.createDiv("nacv-dashboard-hero__visual");
	appendHeroImage(visual, media);
	hero.createDiv("nacv-dashboard-hero__gradient");
	const content = hero.createDiv("nacv-dashboard-hero__content");
	const badges = content.createDiv("nacv-dashboard-hero__badges");
	badges.createSpan({ cls: "nacv-badge", text: mediaTypeLabel(media.type) });
	badges.createSpan({ cls: "nacv-badge", text: watchStatusLabel(media.watchStatus) });
	content.createEl("h2", { text: media.title });
	if (media.originalTitle && media.originalTitle !== media.title) {
		content.createDiv({ cls: "nacv-dashboard-hero__original", text: media.originalTitle });
	}
	const facts = [media.year === undefined ? undefined : String(media.year), ...media.genres].filter((value): value is string => !!value);
	if (facts.length) content.createDiv({ cls: "nacv-dashboard-hero__facts", text: facts.join(" · ") });
	const scores = content.createDiv("nacv-dashboard-hero__scores");
	scores.appendChild(createStarRating({ value: media.personalRating, readonly: true, size: "sm" }));
	if (media.imdbRating !== undefined) scores.createSpan({ text: `IMDb: ${media.imdbRating.toFixed(1)}` });
	if (media.tmdbRating !== undefined) scores.createSpan({ text: `TMDB: ${media.tmdbRating.toFixed(1)}` });
	if (media.plot) content.createEl("p", { cls: "nacv-dashboard-hero__plot", text: media.plot });
	content.createEl("button", { cls: "nacv-button nacv-button--primary", text: "Details" })
		.addEventListener("click", () => onOpen(media));
}

function renderRow(
	parent: HTMLElement,
	title: string,
	items: MediaItem[],
	context: DashboardCardContext,
	onOpen: (media: MediaItem) => void
): void {
	if (!items.length) return;
	const section = parent.createEl("section", { cls: "nacv-dashboard-section" });
	section.createEl("h2", { text: title });
	const row = section.createDiv("nacv-dashboard-row");
	for (const media of items) row.appendChild(createDashboardMediaCard({ media, context, onOpen }));
}

export function renderDashboard(container: HTMLElement, options: DashboardViewOptions): void {
	container.empty();
	options.headingContainer.empty();
	const header = options.headingContainer.createDiv("nacv-view-header");
	header.createEl("h1", { text: "Übersicht" });
	header.createEl("p", { text: "Deine persönliche Film- und Serien-Startseite." });

	const hero = selectDashboardHero(options.items, options.mediaType);
	if (!hero) {
		container.createDiv({ cls: "nacv-empty nacv-dashboard-empty", text: "Für diese Übersicht sind keine Filme oder Serien vorhanden." });
		return;
	}

	const dashboard = container.createDiv("nacv-dashboard");
	renderHero(dashboard, hero, options.onOpen);
	renderRow(dashboard, "Zuletzt gesehen", selectRecentlyWatched(options.items, options.mediaType), "recent", options.onOpen);
	renderRow(dashboard, "Meine Favoriten", selectFavorites(options.items, options.mediaType), "favorite", options.onOpen);
	renderRow(dashboard, "Am besten bewertet", selectTopRated(options.items, options.mediaType), "top-rated", options.onOpen);
	renderRow(dashboard, "Noch nicht gesehen", selectPlanned(options.items, options.mediaType), "planned", options.onOpen);
}
