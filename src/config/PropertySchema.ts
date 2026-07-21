export const PROPERTY_SCHEMA = {
	up: "Up",
	relatedTo: "related to",
	type: "type",
	categories: "categories",
	collections: "collections",
	title: "title",
	originalTitle: "originalTitle",
	year: "year",
	releaseStatus: "releaseStatus",
	ageRating: "ageRating",
	genres: "genres",
	cast: "cast",
	countries: "countries",
	originalLanguage: "originalLanguage",
	tagline: "tagline",
	plot: "plot",
	tmdbRating: "tmdbRating",
	tmdbVoteCount: "tmdbVoteCount",
	imdbRating: "imdbRating",
	imdbVoteCount: "imdbVoteCount",
	personalRating: "personalRating",
	metadataSource: "metadataSource",
	sourceUrl: "sourceUrl",
	tmdbId: "tmdbId",
	imdbId: "imdbId",
	metadataFetched: "metadataFetched",
	imdbMetadataFetched: "imdbMetadataFetched",
	cover: "cover",
	backdrop: "backdrop",
	trailer: "trailer",
	watchStatus: "watchStatus",
	lastWatched: "lastWatched",
	favorite: "favorite",
	created: "created",
	updated: "updated",
	releaseDate: "releaseDate",
	directors: "directors",
	writers: "writers",
	runtime: "runtime",
	watchCount: "watchCount",
	firstAirDate: "firstAirDate",
	endDate: "endDate",
	creators: "creators",
	networks: "networks",
	seasonCount: "seasonCount",
	episodeCount: "episodeCount",
	episodeRuntime: "episodeRuntime",
	watchedThroughSeason: "watchedThroughSeason",
} as const;

export type PropertyKey = keyof typeof PROPERTY_SCHEMA;
export type FrontmatterProperty = (typeof PROPERTY_SCHEMA)[PropertyKey];

export const COMMON_WRITABLE_KEYS = [
	"personalRating",
	"favorite",
	"watchStatus",
	"lastWatched",
] as const satisfies readonly PropertyKey[];

export const MOVIE_WRITABLE_KEYS = ["watchCount"] as const satisfies readonly PropertyKey[];
export const SERIES_WRITABLE_KEYS = ["watchedThroughSeason"] as const satisfies readonly PropertyKey[];

export function frontmatterProperty(key: PropertyKey): FrontmatterProperty {
	return PROPERTY_SCHEMA[key];
}

