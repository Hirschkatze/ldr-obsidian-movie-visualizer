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
		const button = document.createElement("button");
		button.textContent = option.label;
		button.className = "nacv-type-filter__button";
		button.classList.toggle("nacv-type-filter__button--active", option.value === selected);
		button.addEventListener("click", () => onChange(option.value));
		group.appendChild(button);
	}
	return group;
}
