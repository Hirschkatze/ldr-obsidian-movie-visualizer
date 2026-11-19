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
import type { MediaPluginAction } from "../../integration/MediaPluginCommands";
import { prepareViewControlHost } from "../../phase2/ui/ApplicationShell";

export interface DashboardViewOptions {
	items: MediaItem[];
	headingContainer: HTMLElement;
	controlsContainer?: HTMLElement;
	mediaType: MediaTypeFilter;
	onOpen: (media: MediaItem) => void;
	onExternalAction: (action: MediaPluginAction) => void;
}

const DASHBOARD_ACTION_GROUPS: ReadonlyArray<{
	title: string;
	actions: ReadonlyArray<{ label: string; action: MediaPluginAction }>;
}> = [
	{
		title: "Importieren",
		actions: [
			{ label: "Film importieren", action: "import-movie" },
			{ label: "Serie importieren", action: "import-series" },
		],
	},
	{
		title: "Aktualisieren",
		actions: [
			{ label: "Serien aktualisieren", action: "update-series" },
			{ label: "IMDb-Filmbewertungen aktualisieren", action: "update-movie-imdb" },
		],
	},
];

function renderDashboardActions(parent: HTMLElement, onAction: (action: MediaPluginAction) => void): void {
	const panel = parent.createDiv({
		cls: "nacv-dashboard-actions",
		attr: { "aria-label": "Medien importieren und aktualisieren" },
	});
	for (const groupDefinition of DASHBOARD_ACTION_GROUPS) {
		const group = panel.createDiv("nacv-dashboard-actions__group");
		group.createEl("h2", { text: groupDefinition.title });
		const controls = group.createDiv("nacv-dashboard-actions__controls");
		for (const actionDefinition of groupDefinition.actions) {
			const button = controls.createEl("button", {
				cls: "nacv-button nacv-button--secondary nacv-dashboard-actions__button",
				text: actionDefinition.label,
				attr: { type: "button" },
			});
			button.addEventListener("click", () => onAction(actionDefinition.action));
		}
	}
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
	const controls = prepareViewControlHost(container, options.controlsContainer);
	options.headingContainer.empty();
	const header = options.headingContainer.createDiv("nacv-view-header");
	header.createEl("h1", { text: "Übersicht" });
	header.createEl("p", { text: "Deine persönliche Film- und Serien-Startseite." });
	renderDashboardActions(controls, options.onExternalAction);

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
