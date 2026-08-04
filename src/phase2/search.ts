import type { MediaItem, MediaPerson } from "../types";
import type { MediaTypeFilter } from "./types";

export function normalizeSearchText(value: string): string {
	return value.normalize("NFC").toLocaleLowerCase("de-DE").trim();
}

function personTerms(people: MediaPerson[]): string[] {
	return people.flatMap((person) => [person.display, person.target, person.resolvedPath ?? ""]);
}

export function mediaSearchTerms(media: MediaItem): string[] {
	const specific = media.type === "movie"
		? [...personTerms(media.directors), ...personTerms(media.writers)]
		: personTerms(media.creators);
	return [
		media.title,
		media.originalTitle ?? "",
		...specific,
		...personTerms(media.cast),
		...media.genres,
		media.plot ?? "",
		...media.categories,
		...media.collections,
	];
}

export function matchesSearch(media: MediaItem, query: string): boolean {
	const needle = normalizeSearchText(query);
	if (!needle) return true;
	return mediaSearchTerms(media).some((term) => normalizeSearchText(term).includes(needle));
}

export function searchMedia(
	items: MediaItem[],
	query: string,
	mediaType: MediaTypeFilter
): MediaItem[] {
	return items.filter((media) =>
		(mediaType === "all" || media.type === mediaType) && matchesSearch(media, query)
	);
}

