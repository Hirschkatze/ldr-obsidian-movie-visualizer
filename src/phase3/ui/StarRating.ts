export type StarFill = "empty" | "half" | "full";

export interface StarRatingOptions {
	value: number | undefined;
	readonly: boolean;
	size: "sm" | "lg";
	disabled?: boolean;
	stopPropagation?: boolean;
	labelledBy?: string;
	onChange?: (value: number) => void;
}

export function starFillStates(value: number | undefined): StarFill[] {
	const rating = value ?? 0;
	return Array.from({ length: 10 }, (_, index) => {
		const remainder = rating - index;
		return remainder >= 1 ? "full" : remainder >= 0.5 ? "half" : "empty";
	});
}

export function formatPersonalRating(value: number | undefined): string {
	return value === undefined || value === 0 ? "Nicht bewertet" : `${String(value).replace(".", ",")} / 10`;
}

export function keyboardRating(value: number, key: string): number | undefined {
	if (key === "ArrowLeft") return Math.max(0, value - 0.5);
	if (key === "ArrowRight") return Math.min(10, value + 0.5);
	if (key === "Home") return 0;
	if (key === "End") return 10;
	return undefined;
}

function compactRating(value: number): string {
	return value === 0 ? "" : String(value).replace(".", ",");
}

function ratingFromPointer(root: HTMLElement, event: MouseEvent | PointerEvent): number | undefined {
	const target = event.target as Element | null;
	if (!target || typeof target.closest !== "function") return undefined;
	const star = target.closest<HTMLElement>(".nacv-star");
	if (!star || !root.contains(star)) return undefined;
	const starNumber = Number(star.dataset.star);
	if (!Number.isInteger(starNumber) || starNumber < 1 || starNumber > 10) return undefined;
	const bounds = star.getBoundingClientRect();
	return event.clientX < bounds.left + bounds.width / 2 ? starNumber - 0.5 : starNumber;
}

export function createStarRating(options: StarRatingOptions): HTMLElement {
	const root = document.createElement("span");
	root.className = `nacv-stars nacv-stars--${options.size}${options.readonly ? " nacv-stars--readonly" : ""}`;

	const starElements: HTMLSpanElement[] = [];
	const output = document.createElement("span");
	output.className = "nacv-stars__value";
	output.setAttribute("aria-hidden", "true");
	let displayed = options.value ?? 0;
	const isDisabled = (): boolean => options.disabled === true || root.getAttribute("aria-disabled") === "true";

	const render = (value: number): void => {
		displayed = value;
		for (const [index, fill] of starFillStates(value).entries()) {
			starElements[index].className = `nacv-star nacv-star--${fill}`;
		}
		output.textContent = options.readonly ? compactRating(value) : formatPersonalRating(value);
		if (!options.readonly) {
			root.setAttribute("aria-valuenow", String(value));
			root.setAttribute("aria-valuetext", formatPersonalRating(value));
		}
	};

	for (let index = 1; index <= 10; index += 1) {
		const star = document.createElement("span");
		star.textContent = "★";
		star.dataset.star = String(index);
		star.setAttribute("aria-hidden", "true");
		root.appendChild(star);
		starElements.push(star);
	}

	root.appendChild(output);
	if (options.readonly) {
		root.setAttribute("role", "img");
		root.setAttribute("aria-label", `Persönliche Bewertung: ${formatPersonalRating(options.value)}`);
	} else {
		root.setAttribute("role", "slider");
		root.setAttribute("tabindex", "0");
		if (options.labelledBy) root.setAttribute("aria-labelledby", options.labelledBy);
		else root.setAttribute("aria-label", "Persönliche Bewertung");
		root.setAttribute("aria-valuemin", "0");
		root.setAttribute("aria-valuemax", "10");
		root.setAttribute("aria-valuestep", "0.5");
		root.addEventListener("pointermove", (event) => {
			const value = ratingFromPointer(root, event);
			if (value !== undefined) render(value);
		});
		root.addEventListener("pointerleave", () => render(options.value ?? 0));
		root.addEventListener("click", (event) => {
			const value = ratingFromPointer(root, event);
			if (value === undefined) return;
			event.preventDefault();
			event.stopPropagation();
			if (isDisabled()) return;
			options.onChange?.(value);
		});
		root.addEventListener("blur", () => render(options.value ?? 0));
		root.addEventListener("keydown", (event) => {
			const keyboard = event as KeyboardEvent;
			if (options.stopPropagation) keyboard.stopPropagation();
			const next = keyboardRating(displayed, keyboard.key);
			if (next !== undefined) {
				keyboard.preventDefault();
				render(next);
				return;
			}
			if ((keyboard.key === "Enter" || keyboard.key === " ") && !isDisabled()) {
				keyboard.preventDefault();
				options.onChange?.(displayed);
			}
		});
		if (options.disabled) root.setAttribute("aria-disabled", "true");
	}

	render(displayed);
	return root;
}
