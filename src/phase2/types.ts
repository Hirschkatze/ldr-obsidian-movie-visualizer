import type { MediaItem, WatchStatus } from "../types";

export type MediaTypeFilter = "all" | "movie" | "series";
export type FavoriteFilter = "all" | "favorites";
export type RuntimeFilter = "all" | "under90" | "90to150" | "over150";
export type ContinuationFilter = "all" | "possible" | "recorded" | "scheduled";
export type CatalogDensity = "large" | "standard" | "compact" | "poster";

export interface CatalogFilterState {
	mediaType: MediaTypeFilter;
	genre: string;
	watchStatus: WatchStatus | "all";
	favorite: FavoriteFilter;
	yearFrom?: number;
	yearTo?: number;
	personalRatingMin?: number;
	imdbRatingMin?: number;
	tmdbRatingMin?: number;
	runtime: RuntimeFilter;
	person: string;
	cast: string;
	releaseStatus: string;
	continuation: ContinuationFilter;
}

export const DEFAULT_CATALOG_FILTER: CatalogFilterState = {
	mediaType: "all",
	genre: "",
	watchStatus: "all",
	favorite: "all",
	runtime: "all",
	person: "",
	cast: "",
	releaseStatus: "",
	continuation: "all",
};

export type MediaSortKey =
	| "title"
	| "year"
	| "personal-rating"
	| "imdb-rating"
	| "tmdb-rating"
	| "runtime"
	| "last-watched"
	| "watch-count"
	| "season-count"
	| "episode-count"
	| "created"
	| "next-season-air-date";

export type SortDirection = "asc" | "desc";

export interface MediaSortState {
	key: MediaSortKey;
	direction: SortDirection;
}

export interface MediaCollectionOptions {
	filter: CatalogFilterState;
	sort: MediaSortState;
}

export interface MediaCollectionResult {
	items: MediaItem[];
	totalBeforeFilter: number;
}

