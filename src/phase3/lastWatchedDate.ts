import { isCalendarDate } from "../utils/frontmatter";

export type LastWatchedInputResult =
	| { state: "empty" }
	| { state: "incomplete" }
	| { state: "invalid" }
	| { state: "valid"; value: string };

const GERMAN_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const GERMAN_DATE_PREFIX = /^\d{0,2}(?:\.\d{0,2}(?:\.\d{0,4})?)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_PREFIX = /^\d{0,4}(?:-\d{0,2}(?:-\d{0,2})?)?$/;

export function parseLastWatchedInput(input: string): LastWatchedInputResult {
	const value = input.trim();
	if (!value) return { state: "empty" };
	if (ISO_DATE.test(value) && Number(value.slice(0, 4)) < 1000) return { state: "incomplete" };
	if (isCalendarDate(value)) return { state: "valid", value };

	const german = GERMAN_DATE.exec(value);
	if (german) {
		const iso = `${german[3]}-${german[2]}-${german[1]}`;
		return isCalendarDate(iso) ? { state: "valid", value: iso } : { state: "invalid" };
	}
	if (ISO_DATE.test(value)) return { state: "invalid" };

	if (GERMAN_DATE_PREFIX.test(value) || ISO_DATE_PREFIX.test(value)) return { state: "incomplete" };
	return { state: "invalid" };
}

export function formatLastWatchedForDisplay(value: string | undefined): string {
	if (!value || !isCalendarDate(value)) return "";
	const [year, month, day] = value.split("-");
	return `${day}.${month}.${year}`;
}
