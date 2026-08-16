import type { MediaItem, MediaPerson } from "../types";
import type { MediaTypeFilter } from "../phase2/types";
import { personAggregationKey } from "../utils/wikilinks";

export type PersonRole = "director" | "writer" | "creator" | "cast";
export type PersonRoleFilter = PersonRole | "all";
export type PersonSort = "media-count" | "name";

export const PERSON_ROLE_ORDER: readonly PersonRole[] = ["director", "writer", "creator", "cast"];

const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
	director: "Regie",
	writer: "Drehbuch",
	creator: "Serienschöpfer:innen",
	cast: "Cast",
};

export interface PersonAggregate {
	id: string;
	target: string;
	display: string;
	resolvedPath?: string;
	media: MediaItem[];
	mediaCount: number;
	roles: PersonRole[];
	movieCount: number;
	seriesCount: number;
	mediaByRole: Record<PersonRole, MediaItem[]>;
}

interface PersonOccurrence {
	person: MediaPerson;
	media: MediaItem;
	role: PersonRole;
}

interface MutablePersonAggregate {
	id: string;
	target: string;
	display: string;
	resolvedPath?: string;
	media: Map<string, MediaItem>;
	roles: Set<PersonRole>;
	mediaByRole: Record<PersonRole, Map<string, MediaItem>>;
}

function targetKey(person: MediaPerson): string {
	return personAggregationKey({ ...person, resolvedPath: undefined });
}

function resolvedKey(person: MediaPerson): string | undefined {
	return person.resolvedPath ? `resolved:${personAggregationKey(person)}` : undefined;
}

function occurrencesFor(media: MediaItem): PersonOccurrence[] {
	const occurrences: PersonOccurrence[] = [];
	if (media.type === "movie") {
		for (const person of media.directors) occurrences.push({ person, media, role: "director" });
		for (const person of media.writers) occurrences.push({ person, media, role: "writer" });
	} else {
		for (const person of media.creators) occurrences.push({ person, media, role: "creator" });
	}
	for (const person of media.cast) occurrences.push({ person, media, role: "cast" });
	return occurrences;
}

function byTitle(left: MediaItem, right: MediaItem): number {
	return left.title.localeCompare(right.title, "de-DE", { sensitivity: "base" })
		|| left.id.localeCompare(right.id, "de-DE");
}

function emptyRoleMaps(): Record<PersonRole, Map<string, MediaItem>> {
	return { director: new Map(), writer: new Map(), creator: new Map(), cast: new Map() };
}

export function aggregatePeople(items: readonly MediaItem[], mediaType: MediaTypeFilter): PersonAggregate[] {
	const filteredMedia = items.filter((media) => mediaType === "all" || media.type === mediaType);
	const occurrences = filteredMedia.flatMap(occurrencesFor);
	const resolvedByTarget = new Map<string, string>();
	for (const { person } of occurrences) {
		const resolved = resolvedKey(person);
		if (resolved && !resolvedByTarget.has(targetKey(person))) resolvedByTarget.set(targetKey(person), resolved);
	}

	const aggregates = new Map<string, MutablePersonAggregate>();
	for (const { person, media, role } of occurrences) {
		const id = resolvedKey(person) ?? resolvedByTarget.get(targetKey(person)) ?? `target:${targetKey(person)}`;
		let aggregate = aggregates.get(id);
		if (!aggregate) {
			aggregate = {
				id,
				target: person.target,
				display: person.display,
				resolvedPath: person.resolvedPath,
				media: new Map(),
				roles: new Set(),
				mediaByRole: emptyRoleMaps(),
			};
			aggregates.set(id, aggregate);
		} else if (!aggregate.resolvedPath && person.resolvedPath) {
			aggregate.resolvedPath = person.resolvedPath;
			aggregate.target = person.target;
			aggregate.display = person.display;
		}
		aggregate.media.set(media.id, media);
		aggregate.roles.add(role);
		aggregate.mediaByRole[role].set(media.id, media);
	}

	return [...aggregates.values()].map((aggregate) => {
		const media = [...aggregate.media.values()].sort(byTitle);
		return {
			id: aggregate.id,
			target: aggregate.target,
			display: aggregate.display,
			resolvedPath: aggregate.resolvedPath,
			media,
			mediaCount: media.length,
			roles: PERSON_ROLE_ORDER.filter((role) => aggregate.roles.has(role)),
			movieCount: media.filter((item) => item.type === "movie").length,
			seriesCount: media.filter((item) => item.type === "series").length,
			mediaByRole: {
				director: [...aggregate.mediaByRole.director.values()].sort(byTitle),
				writer: [...aggregate.mediaByRole.writer.values()].sort(byTitle),
				creator: [...aggregate.mediaByRole.creator.values()].sort(byTitle),
				cast: [...aggregate.mediaByRole.cast.values()].sort(byTitle),
			},
		};
	});
}

function normalizedSearchText(value: string): string {
	return value.normalize("NFKD").toLocaleLowerCase("de-DE");
}

export function selectPeople(
	people: readonly PersonAggregate[],
	query: string,
	role: PersonRoleFilter,
	sort: PersonSort
): PersonAggregate[] {
	const expected = normalizedSearchText(query.trim());
	return people
		.filter((person) => !expected
			|| normalizedSearchText(person.display).includes(expected)
			|| normalizedSearchText(person.target).includes(expected))
		.filter((person) => role === "all" || person.roles.includes(role))
		.sort((left, right) => {
			const byName = left.display.localeCompare(right.display, "de-DE", { sensitivity: "base" })
				|| left.id.localeCompare(right.id, "de-DE");
			return sort === "name" ? byName : right.mediaCount - left.mediaCount || byName;
		});
}

export function personRoleLabel(role: PersonRole): string {
	return PERSON_ROLE_LABELS[role];
}

export function personRoleLabels(roles: readonly PersonRole[]): string {
	return roles.map(personRoleLabel).join(" · ");
}

