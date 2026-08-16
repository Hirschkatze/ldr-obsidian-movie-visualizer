import type { MediaItem } from "../types";
import type { MediaTypeFilter } from "../phase2/types";

const DASHBOARD_LIMIT = 10;

function byStableTitle(left: MediaItem, right: MediaItem): number {
	const title = left.title.localeCompare(right.title, "de-DE", { sensitivity: "base" });
	return title || left.id.localeCompare(right.id, "de-DE");
}

function byPersonalRating(left: MediaItem, right: MediaItem): number {
	return (right.personalRating ?? 0) - (left.personalRating ?? 0) || byStableTitle(left, right);
}

function byLastWatched(left: MediaItem, right: MediaItem): number {
	return (right.lastWatched ?? "").localeCompare(left.lastWatched ?? "") || byStableTitle(left, right);
}

export function filterDashboardMedia(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem[] {
	return items.filter((item) => mediaType === "all" || item.type === mediaType);
}

function selectPreferred(items: readonly MediaItem[]): MediaItem | undefined {
	const recentlyWatched = items.filter((item) => item.lastWatched !== undefined).sort(byLastWatched);
	if (recentlyWatched.length) return recentlyWatched[0];
	const rated = items.filter((item) => (item.personalRating ?? 0) > 0).sort(byPersonalRating);
	return rated[0] ?? [...items].sort(byStableTitle)[0];
}

export function selectDashboardHero(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem | undefined {
	const filtered = filterDashboardMedia(items, mediaType);
	const favorites = filtered.filter((item) => item.favorite);
	return favorites.length ? selectPreferred(favorites) : selectPreferred(filtered);
}

export function selectRecentlyWatched(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem[] {
	return filterDashboardMedia(items, mediaType)
		.filter((item) => item.lastWatched !== undefined)
		.sort(byLastWatched)
		.slice(0, DASHBOARD_LIMIT);
}

export function selectFavorites(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem[] {
	return filterDashboardMedia(items, mediaType)
		.filter((item) => item.favorite)
		.sort(byPersonalRating)
		.slice(0, DASHBOARD_LIMIT);
}

export function selectTopRated(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem[] {
	return filterDashboardMedia(items, mediaType)
		.filter((item) => (item.personalRating ?? 0) > 0)
		.sort(byPersonalRating)
		.slice(0, DASHBOARD_LIMIT);
}

export function selectPlanned(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem[] {
	return filterDashboardMedia(items, mediaType)
		.filter((item) => item.watchStatus === "planned")
		.sort(byStableTitle)
		.slice(0, DASHBOARD_LIMIT);
}
