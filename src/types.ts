import type { TFile } from "obsidian";

export type MediaType = "movie" | "series";
export type WatchStatus = "planned" | "watching" | "completed" | "paused" | "dropped";

export interface MediaPerson {
	target: string;
	display: string;
	resolvedPath?: string;
}

export interface MediaBase {
	id: string;
	file: TFile;
	type: MediaType;
	title: string;
	originalTitle?: string;
	year?: number;
	releaseStatus?: string;
	ageRating?: string;
	genres: string[];
	cast: MediaPerson[];
	countries: string[];
	originalLanguage?: string;
	tagline?: string;
	plot?: string;
	tmdbRating?: number;
	tmdbVoteCount?: number;
	imdbRating?: number;
	imdbVoteCount?: number;
	personalRating?: number;
	tmdbId?: string;
	imdbId?: string;
	sourceUrl?: string;
	cover?: string;
	backdrop?: string;
	trailer?: string;
	watchStatus: WatchStatus;
	lastWatched?: string;
	favorite: boolean;
	categories: string[];
	collections: string[];
	created?: string;
	updated?: string;
}

export interface MovieItem extends MediaBase {
	type: "movie";
	releaseDate?: string;
	directors: MediaPerson[];
	writers: MediaPerson[];
	runtimeRaw?: string;
	runtimeMinutes?: number;
	watchCount: number;
}

export interface SeriesItem extends MediaBase {
	type: "series";
	firstAirDate?: string;
	endDate?: string;
	creators: MediaPerson[];
	networks: string[];
	seasonCount?: number;
	episodeCount?: number;
	episodeRuntimeRaw?: string;
	episodeRuntimeMinutes?: number;
	watchedThroughSeason?: number;
	newSeasonAvailable: boolean;
}

export type MediaItem = MovieItem | SeriesItem;

export type CommonPersonalUpdates = Partial<{
	personalRating: number;
	favorite: boolean;
	watchStatus: WatchStatus;
	lastWatched: string | null;
}>;

export type MoviePersonalUpdates = CommonPersonalUpdates & Partial<{ watchCount: number }>;
export type SeriesPersonalUpdates = CommonPersonalUpdates & Partial<{ watchedThroughSeason: number | null }>;
