import type { App } from "obsidian";
import type { MediaItem } from "../../types";
import { mediaDetailViewModel, type DetailFact, type ImageViewModel } from "../viewmodels";
import { createPersonLinks } from "./PersonLinks";
import type { PersonalMediaActions } from "../../phase3/PersonalMediaActions";
import { createPersonalEntryControls } from "../../phase3/ui/PersonalEntryControls";

export interface MediaDetailViewOptions {
	app: App;
	media: MediaItem;
	personalActions: PersonalMediaActions;
	onPersonalActionSettled: () => void;
	onBack: () => void;
}

function appendImage(parent: HTMLElement, image: ImageViewModel, alt: string, className: string): void {
	if (!image.src) {
		parent.createDiv(`nacv-image-placeholder ${className}`);
		return;
	}
	const element = parent.createEl("img", { attr: { src: image.src, alt } });
	element.addClass(className);
	element.addEventListener("error", () => {
		const placeholder = document.createElement("div");
		placeholder.className = `nacv-image-placeholder ${className}`;
		element.replaceWith(placeholder);
	});
}

function appendFacts(parent: HTMLElement, facts: DetailFact[]): void {
	if (!facts.length) return;
	const list = parent.createEl("dl", { cls: "nacv-fact-list" });
	for (const item of facts) {
		list.createEl("dt", { text: item.label });
		list.createEl("dd", { text: item.value });
	}
}

function appendExternalLink(parent: HTMLElement, label: string, href: string | undefined): void {
	if (!href) return;
	parent.createEl("a", {
		cls: "nacv-button nacv-button--secondary",
		text: label,
		attr: { href, target: "_blank", rel: "noopener noreferrer" },
	});
}

export function renderMediaDetail(container: HTMLElement, options: MediaDetailViewOptions): void {
	container.empty();
	const { media, app } = options;
	const vm = mediaDetailViewModel(media);

	const back = container.createEl("button", { cls: "nacv-button nacv-button--back", text: "← Zurück" });
	back.addEventListener("click", options.onBack);

	const hero = container.createEl("article", { cls: "nacv-detail" });
	const backdrop = hero.createDiv("nacv-detail__backdrop");
	appendImage(backdrop, vm.backdrop, "", "nacv-detail__backdrop-image");
	const header = hero.createDiv("nacv-detail__header");
	const poster = header.createDiv("nacv-detail__poster");
	appendImage(poster, vm.cover, vm.title, "nacv-detail__poster-image");

	const heading = header.createDiv("nacv-detail__heading");
	heading.createSpan({ cls: "nacv-badge nacv-badge--type", text: vm.typeLabel });
	heading.createEl("h1", { text: vm.title });
	if (vm.originalTitle) heading.createDiv({ cls: "nacv-detail__original", text: vm.originalTitle });
	appendFacts(heading, vm.headlineFacts);
	if (vm.genres.length) {
		const genres = heading.createDiv("nacv-chip-row");
		for (const genre of vm.genres) genres.createSpan({ cls: "nacv-chip", text: genre });
	}
	if (vm.newSeasonAvailable) {
		heading.createDiv({ cls: "nacv-notice", text: "Neue Staffel verfügbar" });
	}

	const actions = heading.createDiv("nacv-detail__actions");
	const noteButton = actions.createEl("button", { cls: "nacv-button nacv-button--primary", text: "Notiz öffnen" });
	noteButton.addEventListener("click", () => {
		void app.workspace.getLeaf(false).openFile(media.file);
	});
	appendExternalLink(actions, "TMDB öffnen", vm.tmdbUrl);
	appendExternalLink(actions, "IMDb öffnen", vm.imdbUrl);
	appendExternalLink(actions, "Trailer öffnen", vm.trailerUrl);

	const content = hero.createDiv("nacv-detail__content");
	content.appendChild(createPersonalEntryControls({
		media,
		actions: options.personalActions,
		onSettled: options.onPersonalActionSettled,
	}));
	if (vm.tagline) content.createEl("blockquote", { cls: "nacv-detail__tagline", text: vm.tagline });
	if (vm.plot) {
		const section = content.createEl("section", { cls: "nacv-detail__section" });
		section.createEl("h2", { text: "Handlung" });
		section.createEl("p", { text: vm.plot });
	}

	const overview = content.createEl("section", { cls: "nacv-detail__section nacv-detail__columns" });
	const ratings = overview.createDiv();
	ratings.createEl("h2", { text: "Bewertungen" });
	appendFacts(ratings, vm.scores);
	const personal = overview.createDiv();
	personal.createEl("h2", { text: "Persönlicher Stand" });
	appendFacts(personal, vm.personalFacts);
	const specific = overview.createDiv();
	specific.createEl("h2", { text: vm.type === "movie" ? "Filmdaten" : "Seriendaten" });
	appendFacts(specific, vm.specificFacts);

	for (const group of vm.primaryPeople) {
		if (!group.people.length) continue;
		const section = content.createEl("section", { cls: "nacv-detail__section" });
		section.createEl("h2", { text: group.label });
		section.appendChild(createPersonLinks(app, media, group.people));
	}
	if (vm.cast.length) {
		const section = content.createEl("section", { cls: "nacv-detail__section" });
		section.createEl("h2", { text: "Besetzung" });
		section.appendChild(createPersonLinks(app, media, vm.cast));
	}
	if (vm.categories.length || vm.collections.length) {
		const section = content.createEl("section", { cls: "nacv-detail__section nacv-detail__columns" });
		if (vm.categories.length) {
			const block = section.createDiv();
			block.createEl("h2", { text: "Kategorien" });
			block.createEl("p", { text: vm.categories.join(", ") });
		}
		if (vm.collections.length) {
			const block = section.createDiv();
			block.createEl("h2", { text: "Sammlungen" });
			block.createEl("p", { text: vm.collections.join(", ") });
		}
	}
}
