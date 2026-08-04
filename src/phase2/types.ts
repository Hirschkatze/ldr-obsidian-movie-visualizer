import type { MediaItem, WatchStatus } from "../types";

export type MediaTypeFilter = "all" | "movie" | "series";
export type FavoriteFilter = "all" | "favorites";
export type RuntimeFilter = "all" | "under90" | "90to150" | "over150";

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
	| "created";

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

