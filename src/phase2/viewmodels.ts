import type { MediaItem, MediaPerson } from "../types";
import { formatCount, formatRuntime, mediaTypeLabel, watchStatusLabel } from "./format";

export interface ImageViewModel {
	src?: string;
	isPlaceholder: boolean;
}

export interface MediaCardViewModel {
	id: string;
	type: MediaItem["type"];
	typeLabel: string;
	title: string;
	originalTitle?: string;
	year?: number;
	genres: string[];
	visibleGenres: string[];
	hiddenGenreCount: number;
	statusLabel: string;
	favorite: boolean;
	personalRating?: number;
	imdbRating?: number;
	tmdbRating?: number;
	cover: ImageViewModel;
	specificFacts: string[];
	newSeasonAvailable: boolean;
}

export interface DetailFact {
	label: string;
	value: string;
}

export interface MediaDetailViewModel {
	id: string;
	type: MediaItem["type"];
	typeLabel: string;
	title: string;
	originalTitle?: string;
	cover: ImageViewModel;
	backdrop: ImageViewModel;
	headlineFacts: DetailFact[];
	plot?: string;
	tagline?: string;
	genres: string[];
	cast: MediaPerson[];
	categories: string[];
	collections: string[];
	scores: DetailFact[];
	personalFacts: DetailFact[];
	specificFacts: DetailFact[];
	primaryPeople: { label: string; people: MediaPerson[] }[];
	tmdbUrl?: string;
	imdbUrl?: string;
	trailerUrl?: string;
	newSeasonAvailable: boolean;
}

export function imageViewModel(src: string | undefined): ImageViewModel {
	return { src, isPlaceholder: !src };
}

export function mediaCardViewModel(media: MediaItem): MediaCardViewModel {
	const specificFacts = media.type === "movie"
		? [formatRuntime(media.runtimeMinutes)].filter((value): value is string => !!value)
		: [
			media.seasonCount === undefined ? undefined : `${media.seasonCount} Staffel${media.seasonCount === 1 ? "" : "n"}`,
			media.episodeCount === undefined ? undefined : `${media.episodeCount} Episoden`,
			media.watchedThroughSeason === undefined ? undefined : `Gesehen bis Staffel ${media.watchedThroughSeason}`,
		].filter((value): value is string => !!value);
	return {
		id: media.id,
		type: media.type,
		typeLabel: mediaTypeLabel(media.type),
		title: media.title,
		originalTitle: media.originalTitle && media.originalTitle !== media.title ? media.originalTitle : undefined,
		year: media.year,
		genres: media.genres,
		visibleGenres: media.genres.slice(0, 2),
		hiddenGenreCount: Math.max(0, media.genres.length - 2),
		statusLabel: watchStatusLabel(media.watchStatus),
		favorite: media.favorite,
		personalRating: media.personalRating,
		imdbRating: media.imdbRating,
		tmdbRating: media.tmdbRating,
		cover: imageViewModel(media.cover),
		specificFacts,
		newSeasonAvailable: media.type === "series" && media.newSeasonAvailable,
	};
}

function fact(label: string, value: string | number | undefined): DetailFact | undefined {
	return value === undefined || value === "" ? undefined : { label, value: String(value) };
}

function definedFacts(values: Array<DetailFact | undefined>): DetailFact[] {
	return values.filter((value): value is DetailFact => value !== undefined);
}

export function mediaDetailViewModel(media: MediaItem): MediaDetailViewModel {
	const scores = definedFacts([
		fact("IMDb", media.imdbRating),
		fact("IMDb-Stimmen", formatCount(media.imdbVoteCount)),
		fact("TMDB", media.tmdbRating),
		fact("TMDB-Stimmen", formatCount(media.tmdbVoteCount)),
	]);
	const personalFacts = definedFacts([
		fact("Meine Bewertung", media.personalRating),
		fact("Favorit", media.favorite ? "Ja" : "Nein"),
		fact("Sichtungsstatus", watchStatusLabel(media.watchStatus)),
		fact("Zuletzt gesehen", media.lastWatched),
	]);

	const specificFacts = media.type === "movie"
		? definedFacts([
			fact("Veröffentlichung", media.releaseDate),
			fact("Laufzeit", formatRuntime(media.runtimeMinutes)),
			fact("Sichtungen", media.watchCount),
		])
		: definedFacts([
			fact("Erstausstrahlung", media.firstAirDate),
			fact("Enddatum", media.endDate),
			fact("Staffeln", media.seasonCount),
			fact("Episoden", media.episodeCount),
			fact("Episodenlaufzeit", formatRuntime(media.episodeRuntimeMinutes)),
			fact("Gesehen bis Staffel", media.watchedThroughSeason),
			fact("Networks", media.networks.join(", ") || undefined),
		]);
	const primaryPeople = media.type === "movie"
		? [
			{ label: "Regie", people: media.directors },
			{ label: "Drehbuch", people: media.writers },
		]
		: [{ label: "Serienschöpfer:innen", people: media.creators }];

	return {
		id: media.id,
		type: media.type,
		typeLabel: mediaTypeLabel(media.type),
		title: media.title,
		originalTitle: media.originalTitle && media.originalTitle !== media.title ? media.originalTitle : undefined,
		cover: imageViewModel(media.cover),
		backdrop: imageViewModel(media.backdrop ?? media.cover),
		headlineFacts: definedFacts([
			fact("Jahr", media.year),
			fact("Veröffentlichungsstatus", media.releaseStatus),
			fact("Altersfreigabe", media.ageRating),
			fact("Länder", media.countries.join(", ") || undefined),
			fact("Originalsprache", media.originalLanguage),
		]),
		plot: media.plot,
		tagline: media.tagline,
		genres: media.genres,
		cast: media.cast,
		categories: media.categories,
		collections: media.collections,
		scores,
		personalFacts,
		specificFacts,
		primaryPeople,
		tmdbUrl: media.sourceUrl,
		imdbUrl: media.imdbId ? `https://www.imdb.com/title/${encodeURIComponent(media.imdbId)}/` : undefined,
		trailerUrl: media.trailer,
		newSeasonAvailable: media.type === "series" && media.newSeasonAvailable,
	};
}
