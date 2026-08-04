import type { MediaItem } from "../types";
import type { MediaSortKey, MediaSortState } from "./types";

type SortValue = string | number;

export function mediaSortValue(media: MediaItem, key: MediaSortKey): SortValue | undefined {
	switch (key) {
		case "title": return media.title;
		case "year": return media.year;
		case "personal-rating": return media.personalRating;
		case "imdb-rating": return media.imdbRating;
		case "tmdb-rating": return media.tmdbRating;
		case "runtime": return media.type === "movie" ? media.runtimeMinutes : undefined;
		case "last-watched": return media.lastWatched;
		case "watch-count": return media.type === "movie" ? media.watchCount : undefined;
		case "season-count": return media.type === "series" ? media.seasonCount : undefined;
		case "episode-count": return media.type === "series" ? media.episodeCount : undefined;
		case "created": return media.created;
	}
}

export function sortMedia(items: MediaItem[], sort: MediaSortState): MediaItem[] {
	const direction = sort.direction === "asc" ? 1 : -1;
	return [...items].sort((left, right) => {
		const a = mediaSortValue(left, sort.key);
		const b = mediaSortValue(right, sort.key);
		if (a === undefined && b === undefined) return left.title.localeCompare(right.title, "de-DE");
		if (a === undefined) return 1;
		if (b === undefined) return -1;
		const comparison = typeof a === "string" && typeof b === "string"
			? a.localeCompare(b, "de-DE", { sensitivity: "base" })
			: Number(a) - Number(b);
		return comparison === 0
			? left.title.localeCompare(right.title, "de-DE")
			: comparison * direction;
	});
}

