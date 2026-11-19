import type { MediaTypeFilter } from "../types";
import type { LayoutWidthMode } from "../../LayoutWidth";
import { PRIMARY_SCROLL_ATTRIBUTE } from "../../ScrollLayout";
import { createLayoutWidthControl } from "./LayoutWidthControl";
import { createTypeFilter } from "./TypeFilter";

export interface ApplicationContentMount {
	controlHeader: HTMLElement;
	header: HTMLElement;
	headingHost: HTMLElement;
	controlHost: HTMLElement;
	viewHost: HTMLElement;
	typeFilter: HTMLElement;
	widthControl: HTMLElement;
}

export function prepareViewControlHost(
	contentContainer: HTMLElement,
	controlContainer?: HTMLElement,
): HTMLElement {
	contentContainer.empty();
	if (!controlContainer) return contentContainer;
	controlContainer.empty();
	return controlContainer;
}

export function mountApplicationContent(
	main: HTMLElement,
	selectedType: MediaTypeFilter,
	onTypeChange: (type: MediaTypeFilter) => void,
	selectedWidth: LayoutWidthMode,
	onWidthChange: (mode: LayoutWidthMode) => void
): ApplicationContentMount {
	const controlHeader = document.createElement("div");
	controlHeader.className = "nacv-control-header";
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
	const controlHost = document.createElement("div");
	controlHost.className = "nacv-view-control-host";

	const viewHost = document.createElement("div");
	viewHost.className = "nacv-view-host";
	viewHost.setAttribute(PRIMARY_SCROLL_ATTRIBUTE, "true");
	viewHost.setAttribute("tabindex", "0");
	viewHost.setAttribute("aria-label", "Ansichtsinhalt");
	controlHeader.appendChild(header);
	controlHeader.appendChild(toolbar);
	controlHeader.appendChild(controlHost);
	main.appendChild(controlHeader);
	main.appendChild(viewHost);
	return { controlHeader, header, headingHost, controlHost, viewHost, typeFilter, widthControl };
}
