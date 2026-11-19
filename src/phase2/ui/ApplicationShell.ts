import type { MediaTypeFilter } from "../types";
import type { LayoutWidthMode } from "../../LayoutWidth";
import { createLayoutWidthControl } from "./LayoutWidthControl";
import { createTypeFilter } from "./TypeFilter";

export interface ApplicationContentMount {
	header: HTMLElement;
	headingHost: HTMLElement;
	viewHost: HTMLElement;
	typeFilter: HTMLElement;
	widthControl: HTMLElement;
}

export function mountApplicationContent(
	main: HTMLElement,
	selectedType: MediaTypeFilter,
	onTypeChange: (type: MediaTypeFilter) => void,
	selectedWidth: LayoutWidthMode,
	onWidthChange: (mode: LayoutWidthMode) => void
): ApplicationContentMount {
	const header = document.createElement("div");
	header.className = "nacv-shared-header";
	const headingHost = document.createElement("div");
	headingHost.className = "nacv-heading-host";
	const widthControl = createLayoutWidthControl(selectedWidth, onWidthChange);
	header.appendChild(headingHost);
	header.appendChild(widthControl);

	const toolbar = document.createElement("div");
	toolbar.className = "nacv-global-toolbar";
	const typeFilter = createTypeFilter(selectedType, onTypeChange);
	toolbar.appendChild(typeFilter);

	const viewHost = document.createElement("div");
	viewHost.className = "nacv-view-host";
	main.appendChild(header);
	main.appendChild(toolbar);
	main.appendChild(viewHost);
	return { header, headingHost, viewHost, typeFilter, widthControl };
}
