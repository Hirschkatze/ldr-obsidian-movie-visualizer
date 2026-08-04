import type { MediaItem } from "../../types";
import { searchMedia } from "../search";
import type { MediaTypeFilter } from "../types";
import { createMediaCard } from "./MediaCard";

export interface SearchViewOptions {
	items: MediaItem[];
	query: string;
	mediaType: MediaTypeFilter;
	onQueryChange: (query: string) => void;
	onOpen: (media: MediaItem) => void;
}

export function renderSearch(container: HTMLElement, options: SearchViewOptions): void {
	container.empty();
	const header = container.createDiv("nacv-view-header");
	header.createEl("h1", { text: "Suche" });
	header.createEl("p", { text: "Durchsucht Titel, Personen, Genres, Inhalte, Kategorien und Sammlungen." });

	const input = container.createEl("input", {
		cls: "nacv-search-input",
		attr: { type: "search", value: options.query, placeholder: "Filme und Serien durchsuchen …" },
	});
	input.addEventListener("input", () => options.onQueryChange(input.value));

	const resultContainer = container.createDiv("nacv-search-results");
	const renderResults = (query: string) => {
		resultContainer.empty();
		const results = searchMedia(options.items, query, options.mediaType);
		resultContainer.createDiv({
			cls: "nacv-result-count",
			text: query.trim() ? `${results.length} Treffer` : `${results.length} Einträge`,
		});
		if (!results.length) {
			resultContainer.createDiv({ cls: "nacv-empty", text: "Keine passenden Filme oder Serien gefunden." });
			return;
		}
		const grid = resultContainer.createDiv("nacv-media-grid");
		for (const media of results) grid.appendChild(createMediaCard(media, options.onOpen));
	};
	input.addEventListener("input", () => renderResults(input.value));
	renderResults(options.query);
}
