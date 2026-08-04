import type { MediaItem, MediaPerson } from "../types";
import { normalizeSearchText } from "./search";
import type { CatalogFilterState, RuntimeFilter } from "./types";

function matchesText(value: string | undefined, expected: string): boolean {
	if (!expected) return true;
	return normalizeSearchText(value ?? "").includes(normalizeSearchText(expected));
}

function matchesPeople(people: MediaPerson[], expected: string): boolean {
	if (!expected) return true;
	return people.some((person) =>
		matchesText(person.display, expected)
		|| matchesText(person.target, expected)
		|| matchesText(person.resolvedPath, expected)
	);
}

function matchesRuntime(media: MediaItem, runtime: RuntimeFilter): boolean {
	if (runtime === "all") return true;
	if (media.type !== "movie" || media.runtimeMinutes === undefined) return false;
	if (runtime === "under90") return media.runtimeMinutes < 90;
	if (runtime === "over150") return media.runtimeMinutes > 150;
	return media.runtimeMinutes >= 90 && media.runtimeMinutes <= 150;
}

export function matchesCatalogFilter(media: MediaItem, filter: CatalogFilterState): boolean {
	if (filter.mediaType !== "all" && media.type !== filter.mediaType) return false;
	if (filter.genre && !media.genres.some((genre) => matchesText(genre, filter.genre))) return false;
	if (filter.watchStatus !== "all" && media.watchStatus !== filter.watchStatus) return false;
	if (filter.favorite === "favorites" && !media.favorite) return false;
	if (filter.yearFrom !== undefined && (media.year === undefined || media.year < filter.yearFrom)) return false;
	if (filter.yearTo !== undefined && (media.year === undefined || media.year > filter.yearTo)) return false;
	if (filter.personalRatingMin !== undefined
		&& (media.personalRating === undefined || media.personalRating < filter.personalRatingMin)) return false;
	if (filter.imdbRatingMin !== undefined
		&& (media.imdbRating === undefined || media.imdbRating < filter.imdbRatingMin)) return false;
	if (filter.tmdbRatingMin !== undefined
		&& (media.tmdbRating === undefined || media.tmdbRating < filter.tmdbRatingMin)) return false;
	if (!matchesRuntime(media, filter.runtime)) return false;

	const primaryPeople = media.type === "movie" ? media.directors : media.creators;
	if (!matchesPeople(primaryPeople, filter.person)) return false;
	if (!matchesPeople(media.cast, filter.cast)) return false;
	if (!matchesText(media.releaseStatus, filter.releaseStatus)) return false;
	return true;
}

export function filterMedia(items: MediaItem[], filter: CatalogFilterState): MediaItem[] {
	return items.filter((media) => matchesCatalogFilter(media, filter));
}

export function uniqueGenres(items: MediaItem[]): string[] {
	return [...new Set(items.flatMap((media) => media.genres))]
		.sort((a, b) => a.localeCompare(b, "de-DE"));
}

export function uniqueReleaseStatuses(items: MediaItem[]): string[] {
	return [...new Set(items.map((media) => media.releaseStatus).filter((value): value is string => !!value))]
		.sort((a, b) => a.localeCompare(b, "de-DE"));
}

