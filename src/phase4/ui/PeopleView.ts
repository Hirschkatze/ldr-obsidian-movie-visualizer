import { setIcon } from "obsidian";
import type { MediaItem } from "../../types";
import type { MediaTypeFilter } from "../../phase2/types";
import {
	aggregatePeople,
	personRoleLabels,
	selectPeople,
	type PersonAggregate,
	type PersonRoleFilter,
	type PersonSort,
} from "../peopleSelectors";

export interface PeopleViewOptions {
	items: MediaItem[];
	headingContainer: HTMLElement;
	mediaType: MediaTypeFilter;
	query: string;
	role: PersonRoleFilter;
	sort: PersonSort;
	onQueryChange: (query: string) => void;
	onRoleChange: (role: PersonRoleFilter) => void;
	onSortChange: (sort: PersonSort) => void;
	onOpenPerson: (person: PersonAggregate) => void;
}

const ROLE_OPTIONS: Array<{ value: PersonRoleFilter; label: string }> = [
	{ value: "all", label: "Alle Rollen" },
	{ value: "director", label: "Regie" },
	{ value: "writer", label: "Drehbuch" },
	{ value: "creator", label: "Serienschöpfer:innen" },
	{ value: "cast", label: "Cast" },
];

function appendOption(select: HTMLSelectElement, value: string, label: string): void {
	const option = document.createElement("option");
	option.value = value;
	option.textContent = label;
	select.appendChild(option);
}

function mediaSummary(person: PersonAggregate): string {
	const media = person.mediaCount === 1 ? "1 Medium" : `${person.mediaCount} Medien`;
	const movies = person.movieCount === 1 ? "1 Film" : `${person.movieCount} Filme`;
	const series = person.seriesCount === 1 ? "1 Serie" : `${person.seriesCount} Serien`;
	return `${media} · ${movies} · ${series}`;
}

function createPersonCard(person: PersonAggregate, onOpen: (person: PersonAggregate) => void): HTMLElement {
	const card = document.createElement("article");
	card.className = "nacv-person-card";
	card.tabIndex = 0;
	card.dataset.personId = person.id;
	if (person.resolvedPath) {
		card.addClass("nacv-person-card--has-note");
		const badge = card.createSpan({
			cls: "nacv-person-card__note-badge",
			attr: { title: "Personennote vorhanden", "aria-label": "Personennote vorhanden" },
		});
		setIcon(badge, "file-text");
	}
	card.createEl("h2", { cls: "nacv-person-card__name", text: person.display });
	card.createDiv({ cls: "nacv-person-card__roles", text: personRoleLabels(person.roles) });
	card.createDiv({ cls: "nacv-person-card__counts", text: mediaSummary(person) });
	const open = (): void => onOpen(person);
	card.addEventListener("click", open);
	card.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			open();
		}
	});
	return card;
}

export function renderPeople(container: HTMLElement, options: PeopleViewOptions): void {
	container.empty();
	options.headingContainer.empty();
	const header = options.headingContainer.createDiv("nacv-view-header");
	header.createEl("h1", { text: "Personen" });
	header.createEl("p", { text: "Mitwirkende aus deinen Film- und Seriennotizen." });

	const people = aggregatePeople(options.items, options.mediaType);
	let query = options.query;
	let role = options.role;
	let sort = options.sort;
	const controls = container.createDiv("nacv-people-controls");

	const searchField = controls.createEl("label", { cls: "nacv-field nacv-people-controls__search" });
	searchField.createSpan({ text: "Person suchen" });
	const search = searchField.createEl("input", {
		cls: "nacv-input",
		attr: { type: "search", placeholder: "Name oder Linkziel", "aria-label": "Person suchen" },
	});
	search.value = query;

	const roleField = controls.createEl("label", { cls: "nacv-field" });
	roleField.createSpan({ text: "Rolle" });
	const roleSelect = document.createElement("select");
	roleSelect.className = "nacv-select";
	for (const option of ROLE_OPTIONS) appendOption(roleSelect, option.value, option.label);
	roleSelect.value = role;
	roleField.appendChild(roleSelect);

	const sortField = controls.createEl("label", { cls: "nacv-field" });
	sortField.createSpan({ text: "Sortierung" });
	const sortSelect = document.createElement("select");
	sortSelect.className = "nacv-select";
	appendOption(sortSelect, "media-count", "Anzahl Medien");
	appendOption(sortSelect, "name", "Name A–Z");
	sortSelect.value = sort;
	sortField.appendChild(sortSelect);

	const resultCount = container.createDiv("nacv-result-count");
	const grid = container.createDiv("nacv-people-grid");
	const renderResults = (): void => {
		const selected = selectPeople(people, query, role, sort);
		grid.empty();
		resultCount.textContent = selected.length === 1 ? "1 Person" : `${selected.length} Personen`;
		if (!selected.length) {
			grid.createDiv({ cls: "nacv-empty", text: "Keine passenden Personen gefunden." });
			return;
		}
		for (const person of selected) grid.appendChild(createPersonCard(person, options.onOpenPerson));
	};

	search.addEventListener("input", () => {
		query = search.value;
		options.onQueryChange(query);
		renderResults();
	});
	roleSelect.addEventListener("change", () => {
		role = roleSelect.value as PersonRoleFilter;
		options.onRoleChange(role);
		renderResults();
	});
	sortSelect.addEventListener("change", () => {
		sort = sortSelect.value as PersonSort;
		options.onSortChange(sort);
		renderResults();
	});
	renderResults();
}
