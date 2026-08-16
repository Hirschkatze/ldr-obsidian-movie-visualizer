import type { App } from "obsidian";
import type { MediaItem } from "../../types";
import { openPersonNote } from "../../phase2/ui/PersonLinks";
import {
	PERSON_ROLE_ORDER,
	personRoleLabel,
	personRoleLabels,
	type PersonAggregate,
} from "../peopleSelectors";
import { createDashboardMediaCard } from "./DashboardMediaCard";

export interface PersonDetailViewOptions {
	app: App;
	person: PersonAggregate;
	headingContainer: HTMLElement;
	onBack: () => void;
	onOpenMedia: (media: MediaItem) => void;
}

function countLabel(value: number, singular: string, plural: string): string {
	return `${value} ${value === 1 ? singular : plural}`;
}

export function renderPersonDetail(container: HTMLElement, options: PersonDetailViewOptions): void {
	container.empty();
	options.headingContainer.empty();
	const header = options.headingContainer.createDiv("nacv-view-header");
	header.createEl("h1", { text: options.person.display });
	header.createEl("p", { text: "Filmografie aus den vorhandenen Vault-Metadaten." });

	const detail = container.createEl("article", { cls: "nacv-person-detail" });
	detail.createEl("button", { cls: "nacv-button nacv-person-detail__back", text: "← Zurück zu Personen" })
		.addEventListener("click", options.onBack);
	const summary = detail.createDiv("nacv-person-detail__summary");
	summary.createDiv({ cls: "nacv-person-detail__roles", text: personRoleLabels(options.person.roles) });
	const counts = summary.createDiv("nacv-person-detail__counts");
	counts.createSpan({ text: countLabel(options.person.mediaCount, "Medium", "Medien") });
	counts.createSpan({ text: countLabel(options.person.movieCount, "Film", "Filme") });
	counts.createSpan({ text: countLabel(options.person.seriesCount, "Serie", "Serien") });
	if (options.person.resolvedPath && options.person.media[0]) {
		detail.createEl("button", { cls: "nacv-button nacv-person-detail__note", text: "Personennote öffnen" })
			.addEventListener("click", (event) => {
				event.stopPropagation();
				openPersonNote(options.app, options.person.resolvedPath!, options.person.media[0].file.path);
			});
	}

	const filmography = detail.createDiv("nacv-person-detail__filmography");
	for (const role of PERSON_ROLE_ORDER) {
		const media = options.person.mediaByRole[role];
		if (!media.length) continue;
		const section = filmography.createEl("section", { cls: "nacv-person-detail__section" });
		section.createEl("h2", { text: personRoleLabel(role) });
		const row = section.createDiv("nacv-dashboard-row nacv-person-detail__row");
		for (const item of media) {
			row.appendChild(createDashboardMediaCard({ media: item, context: "filmography", onOpen: options.onOpenMedia }));
		}
	}
}
