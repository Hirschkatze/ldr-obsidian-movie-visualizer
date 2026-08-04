import type { MediaTypeFilter } from "../types";
import { createTypeFilter } from "./TypeFilter";

export interface ApplicationContentMount {
	headingHost: HTMLElement;
	viewHost: HTMLElement;
	typeFilter: HTMLElement;
}

export function mountApplicationContent(
	main: HTMLElement,
	selectedType: MediaTypeFilter,
	onTypeChange: (type: MediaTypeFilter) => void
): ApplicationContentMount {
	const headingHost = document.createElement("div");
	headingHost.className = "nacv-heading-host";

	const toolbar = document.createElement("div");
	toolbar.className = "nacv-global-toolbar";
	const typeFilter = createTypeFilter(selectedType, onTypeChange);
	toolbar.appendChild(typeFilter);

	const viewHost = document.createElement("div");
	viewHost.className = "nacv-view-host";
	main.appendChild(headingHost);
	main.appendChild(toolbar);
	main.appendChild(viewHost);
	return { headingHost, viewHost, typeFilter };
}
