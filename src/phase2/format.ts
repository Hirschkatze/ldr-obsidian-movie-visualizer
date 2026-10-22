import type { WatchStatus } from "../types";
import { toDateString } from "../utils/frontmatter";

export const WATCH_STATUS_ORDER: readonly WatchStatus[] = ["planned", "watching", "completed", "paused", "dropped"];

const STATUS_LABELS: Record<WatchStatus, string> = {
	planned: "Geplant",
	watching: "In Wiedergabe",
	completed: "Gesehen",
	paused: "Pausiert",
	dropped: "Abgebrochen",
};

export function watchStatusLabel(status: WatchStatus): string {
	return STATUS_LABELS[status];
}

export function mediaTypeLabel(type: "movie" | "series"): string {
	return type === "movie" ? "Film" : "Serie";
}

export function formatRuntime(minutes: number | undefined): string | undefined {
	if (minutes === undefined) return undefined;
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	if (hours === 0) return `${remainder} min`;
	return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

export function formatCount(value: number | undefined): string | undefined {
	return value === undefined ? undefined : new Intl.NumberFormat("de-DE").format(value);
}

export function formatCalendarDate(value: string | undefined): string | undefined {
	const parsed = toDateString(value);
	if (!parsed) return undefined;
	const [year, month, day] = parsed.slice(0, 10).split("-").map(Number);
	return new Intl.DateTimeFormat("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(year, month - 1, day));
}
