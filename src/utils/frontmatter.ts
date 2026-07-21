import type { WatchStatus } from "../types";

const WATCH_STATUSES = new Set<WatchStatus>([
	"planned",
	"watching",
	"completed",
	"paused",
	"dropped",
]);

export function toOptionalString(value: unknown): string | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	return String(value).trim() || undefined;
}

export function toStringArray(value: unknown): string[] {
	if (value === null || value === undefined || value === "") return [];
	const values = Array.isArray(value) ? value : [value];
	return values
		.map((entry) => toOptionalString(entry))
		.filter((entry): entry is string => entry !== undefined);
}

export function toNumber(value: unknown): number | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	if (typeof value === "boolean") return undefined;
	const parsed = typeof value === "number" ? value : Number(String(value).trim());
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function toNonNegativeInteger(value: unknown): number | undefined {
	const parsed = toNumber(value);
	return parsed !== undefined && parsed >= 0 ? Math.trunc(parsed) : undefined;
}

export function toBoolean(value: unknown, fallback = false): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") return true;
		if (normalized === "false") return false;
	}
	return fallback;
}

export function toRating(value: unknown): number | undefined {
	const parsed = toNumber(value);
	if (parsed === undefined || parsed <= 0 || parsed > 10) return undefined;
	return parsed;
}

export function toDateString(value: unknown): string | undefined {
	const parsed = toOptionalString(value);
	if (!parsed) return undefined;
	return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(parsed) ? parsed : undefined;
}

export function toWatchStatus(value: unknown): WatchStatus {
	const parsed = toOptionalString(value);
	return parsed && WATCH_STATUSES.has(parsed as WatchStatus)
		? (parsed as WatchStatus)
		: "planned";
}

export function localDateString(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

