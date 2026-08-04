import { TFile } from "obsidian";
import type { MediaPerson, MovieItem, SeriesItem } from "../src/types";

function file(path: string): TFile {
	const result = Object.create(TFile.prototype) as TFile;
	Object.assign(result, { path, basename: path.split("/").pop()!.replace(/\.md$/, ""), extension: "md" });
	return result;
}

export function person(target: string, display = target, resolvedPath?: string): MediaPerson {
	return { target, display, resolvedPath };
}

export function movie(overrides: Partial<MovieItem> = {}): MovieItem {
	return {
		id: "Movies/Ära.md",
		file: file("Movies/Ära.md"),
		type: "movie",
		title: "Ära des Films",
		originalTitle: "Film Era",
		year: 2020,
		releaseStatus: "Veröffentlicht",
		ageRating: "FSK 12",
		genres: ["Drama"],
		cast: [person("People/Maria Müller", "M. Müller", "People/Maria Müller.md")],
		countries: ["Deutschland"],
		originalLanguage: "Deutsch",
		tagline: "Eine neue Ära",
		plot: "Ein außergewöhnlicher Film über Freundschaft.",
		tmdbRating: 8.1,
		tmdbVoteCount: 1200,
		imdbRating: 8.4,
		imdbVoteCount: 9000,
		personalRating: 9,
		tmdbId: "100",
		imdbId: "tt0000100",
		sourceUrl: "https://www.themoviedb.org/movie/100",
		cover: "https://images.example/movie.jpg",
		backdrop: "app://vault/Assets/movie-backdrop.jpg",
		trailer: "https://video.example/trailer",
		watchStatus: "completed",
		lastWatched: "2026-07-20",
		favorite: true,
		categories: ["Zeitreise"],
		collections: ["Lieblingsfilme"],
		created: "2026-01-01",
		releaseDate: "2020-02-03",
		directors: [person("People/Anna Regie", "Anna", "People/Anna Regie.md")],
		writers: [person("People/Ömer Autor", "Ömer")],
		runtimeRaw: "2:22",
		runtimeMinutes: 142,
		watchCount: 2,
		...overrides,
	};
}

export function series(overrides: Partial<SeriesItem> = {}): SeriesItem {
	return {
		id: "Series/Überblick.md",
		file: file("Series/Überblick.md"),
		type: "series",
		title: "Überblick",
		originalTitle: "Overview",
		year: 2022,
		releaseStatus: "Wiederkehrend",
		ageRating: "FSK 16",
		genres: ["Mystery"],
		cast: [person("People/Jörg Darsteller", "Jörg")],
		countries: ["Österreich"],
		originalLanguage: "Deutsch",
		plot: "Rätselhafte Vorgänge in einer Küstenstadt.",
		tmdbRating: 7.9,
		tmdbVoteCount: 500,
		imdbRating: 8.2,
		imdbVoteCount: 4000,
		watchStatus: "watching",
		favorite: false,
		categories: ["Düstere Welten"],
		collections: ["Serienabend"],
		created: "2026-02-01",
		cover: "app://vault/Assets/series-cover.jpg",
		firstAirDate: "2022-01-01",
		creators: [person("People/Sören Schöpfer", "Sören")],
		networks: ["Beispiel TV"],
		seasonCount: 3,
		episodeCount: 24,
		episodeRuntimeRaw: "45",
		episodeRuntimeMinutes: 45,
		watchedThroughSeason: 1,
		newSeasonAvailable: true,
		...overrides,
	};
}

