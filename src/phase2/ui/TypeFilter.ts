import type { MediaTypeFilter } from "../types";

export function createTypeFilter(
	selected: MediaTypeFilter,
	onChange: (type: MediaTypeFilter) => void
): HTMLElement {
	const group = document.createElement("div");
	group.className = "nacv-type-filter";
	group.setAttribute("role", "group");
	group.setAttribute("aria-label", "Medientyp");
	const options: Array<{ value: MediaTypeFilter; label: string }> = [
		{ value: "all", label: "Alle" },
		{ value: "movie", label: "Filme" },
		{ value: "series", label: "Serien" },
	];
	for (const option of options) {
		const button = group.createEl("button", { text: option.label });
		button.addClass("nacv-type-filter__button");
		button.toggleClass("nacv-type-filter__button--active", option.value === selected);
		button.addEventListener("click", () => onChange(option.value));
	}
	return group;
}

