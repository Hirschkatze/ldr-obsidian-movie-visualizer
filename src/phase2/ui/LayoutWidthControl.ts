import { LAYOUT_WIDTH_MODES, type LayoutWidthMode } from "../../LayoutWidth";

export function createLayoutWidthControl(
	selected: LayoutWidthMode,
	onChange: (mode: LayoutWidthMode) => void
): HTMLElement {
	const group = document.createElement("div");
	group.className = "nacv-width-control";
	group.setAttribute("role", "group");
	group.setAttribute("aria-label", "Darstellungsbreite");
	for (const option of LAYOUT_WIDTH_MODES) {
		const active = option.id === selected;
		const button = document.createElement("button");
		button.type = "button";
		button.textContent = option.label;
		button.className = `nacv-width-control__button${active ? " nacv-width-control__button--active" : ""}`;
		button.setAttribute("aria-pressed", String(active));
		button.addEventListener("click", () => onChange(option.id));
		group.appendChild(button);
	}
	return group;
}
