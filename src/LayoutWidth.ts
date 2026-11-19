export const LAYOUT_WIDTH_MODES = [
	{ id: "normal", label: "Normal", maxWidth: 1080 },
	{ id: "wide", label: "Breit", maxWidth: 1400 },
	{ id: "full", label: "Genuss", maxWidth: null },
] as const;

export type LayoutWidthMode = typeof LAYOUT_WIDTH_MODES[number]["id"];

export function normalizeLayoutWidthMode(value: unknown): LayoutWidthMode {
	return LAYOUT_WIDTH_MODES.find((mode) => mode.id === value)?.id ?? "normal";
}

export function applyLayoutWidth(root: HTMLElement, value: LayoutWidthMode): void {
	const mode = LAYOUT_WIDTH_MODES.find((candidate) => candidate.id === normalizeLayoutWidthMode(value))!;
	root.dataset.nacvWidthMode = mode.id;
	root.style.setProperty("--nacv-layout-max-width", mode.maxWidth === null ? "100%" : `${mode.maxWidth}px`);
}
