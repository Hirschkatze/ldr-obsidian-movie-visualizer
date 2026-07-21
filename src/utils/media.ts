import type { SeriesItem, WatchStatus } from "../types";

export function hasNewSeason(
	watchedThroughSeason: number | undefined,
	seasonCount: number | undefined,
	watchStatus: WatchStatus
): boolean {
	return watchedThroughSeason !== undefined
		&& watchedThroughSeason >= 1
		&& seasonCount !== undefined
		&& seasonCount > watchedThroughSeason
		&& watchStatus !== "dropped";
}

export function newSeasonAvailable(series: Pick<SeriesItem, "watchedThroughSeason" | "seasonCount" | "watchStatus">): boolean {
	return hasNewSeason(series.watchedThroughSeason, series.seasonCount, series.watchStatus);
}
