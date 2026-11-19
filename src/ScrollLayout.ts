export const SPLIT_SCROLL_LAYOUT_CLASS = "nacv-root--split-scroll-layout";
export const PRIMARY_SCROLL_ATTRIBUTE = "data-nacv-primary-scroll";
export const SPLIT_SCROLL_MIN_WIDTH = 721;
export const SPLIT_SCROLL_MIN_HEIGHT = 520;
export const SPLIT_SCROLL_MIN_CONTENT_HEIGHT = 240;

export interface ScrollLayoutObservation {
	observeHeader(header?: HTMLElement): void;
	disconnect(): void;
}

function primaryScrollElement(root: HTMLElement, split: boolean): HTMLElement {
	if (!split) return root;
	return root.querySelector<HTMLElement>(`[${PRIMARY_SCROLL_ATTRIBUTE}="true"]`) ?? root;
}

function wheelDelta(event: WheelEvent, primary: HTMLElement): number {
	if (event.deltaMode === 1) return event.deltaY * 16;
	if (event.deltaMode === 2) return event.deltaY * primary.clientHeight;
	return event.deltaY;
}

export function forwardSplitLayoutWheel(root: HTMLElement, event: WheelEvent): void {
	if (!root.classList.contains(SPLIT_SCROLL_LAYOUT_CLASS) || event.defaultPrevented || event.ctrlKey) return;
	if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
	const primary = primaryScrollElement(root, true);
	const target = event.target as HTMLElement | null;
	if (target && primary.contains(target)) return;
	if (target?.closest?.(".nacv-filter-panel")) return;
	primary.scrollTop += wheelDelta(event, primary);
	event.preventDefault();
}

export function updateScrollLayout(root: HTMLElement, header?: HTMLElement): void {
	const width = Math.max(0, root.clientWidth);
	const height = Math.max(0, root.clientHeight);
	const headerHeight = Math.max(0, header?.getBoundingClientRect().height ?? 0);
	const split = width >= SPLIT_SCROLL_MIN_WIDTH
		&& height >= SPLIT_SCROLL_MIN_HEIGHT
		&& height - headerHeight >= SPLIT_SCROLL_MIN_CONTENT_HEIGHT;
	const wasSplit = root.classList.contains(SPLIT_SCROLL_LAYOUT_CLASS);
	if (split === wasSplit) return;

	const previous = primaryScrollElement(root, wasSplit);
	const scrollTop = previous.scrollTop;
	root.classList.toggle(SPLIT_SCROLL_LAYOUT_CLASS, split);
	const next = primaryScrollElement(root, split);
	next.scrollTop = scrollTop;
	if (next !== previous) previous.scrollTop = 0;
}

export function observeScrollLayout(root: HTMLElement): ScrollLayoutObservation {
	let header: HTMLElement | undefined;
	const update = (): void => updateScrollLayout(root, header);
	const wheel = (event: WheelEvent): void => forwardSplitLayoutWheel(root, event);
	root.addEventListener("wheel", wheel, { passive: false });
	update();
	if (typeof ResizeObserver === "undefined") {
		return {
			observeHeader: (nextHeader) => { header = nextHeader; update(); },
			disconnect: () => root.removeEventListener("wheel", wheel),
		};
	}

	const observer = new ResizeObserver(update);
	observer.observe(root);
	return {
		observeHeader: (nextHeader) => {
			if (header) observer.unobserve(header);
			header = nextHeader;
			if (header) observer.observe(header);
			update();
		},
		disconnect: () => {
			observer.disconnect();
			root.removeEventListener("wheel", wheel);
		},
	};
}
