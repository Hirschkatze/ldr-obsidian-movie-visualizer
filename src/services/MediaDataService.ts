import { App, TFile, type EventRef } from "obsidian";
import {
	COMMON_WRITABLE_KEYS,
	MOVIE_WRITABLE_KEYS,
	PROPERTY_SCHEMA as P,
	SERIES_WRITABLE_KEYS,
	frontmatterProperty,
	type PropertyKey,
} from "../config/PropertySchema";
import type {
	MediaBase,
	MediaItem,
	CommonPersonalUpdates,
	MovieItem,
	MoviePersonalUpdates,
	SeriesItem,
	SeriesPersonalUpdates,
} from "../types";
import {
	toBoolean,
	isCalendarDate,
	toDateString,
	toNonNegativeInteger,
	toNumber,
	toOptionalString,
	toRating,
	toStringArray,
	toWatchStatus,
} from "../utils/frontmatter";
import { hasNewSeason } from "../utils/media";
import { parseRuntime } from "../utils/runtime";
import { toMediaPeople } from "../utils/wikilinks";
import { ImageResolver } from "./ImageResolver";

type Frontmatter = Record<string, unknown>;
type Listener = () => void;

const WATCH_STATUSES = new Set(["planned", "watching", "completed", "paused", "dropped"]);

const COMMON_WRITE_SET = new Set<PropertyKey>(COMMON_WRITABLE_KEYS);
const MOVIE_WRITE_SET = new Set<PropertyKey>(MOVIE_WRITABLE_KEYS);
const SERIES_WRITE_SET = new Set<PropertyKey>(SERIES_WRITABLE_KEYS);

export class MediaDataService {
	private readonly mediaByPath = new Map<string, MediaItem>();
	private readonly listeners = new Set<Listener>();
	private readonly eventRefs: Array<{ owner: { offref(ref: EventRef): void }; ref: EventRef }> = [];
	private readonly imageResolver: ImageResolver;

	constructor(private readonly app: App) {
		this.imageResolver = new ImageResolver(app);
	}

	async init(): Promise<void> {
		this.indexAll();
		this.eventRefs.push(
			{ owner: this.app.vault, ref: this.app.vault.on("create", (file) => {
				if (file instanceof TFile && file.extension === "md") this.refreshFile(file);
			}) },
			{ owner: this.app.metadataCache, ref: this.app.metadataCache.on("changed", (file) => {
				if (file.extension === "md") this.refreshFile(file);
			}) },
			{ owner: this.app.vault, ref: this.app.vault.on("delete", (file) => {
				if (file instanceof TFile && this.mediaByPath.delete(file.path)) this.notify();
			}) },
			{ owner: this.app.vault, ref: this.app.vault.on("rename", (file, oldPath) => {
				const removed = this.mediaByPath.delete(oldPath);
				if (file instanceof TFile && file.extension === "md") {
					this.indexFile(file);
					this.notify();
				} else if (removed) {
					this.notify();
				}
			}) }
		);
	}

	destroy(): void {
		for (const { owner, ref } of this.eventRefs) owner.offref(ref);
		this.eventRefs.length = 0;
		this.listeners.clear();
	}

	get items(): MediaItem[] {
		return Array.from(this.mediaByPath.values());
	}

	getById(id: string): MediaItem | undefined {
		return this.mediaByPath.get(id);
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	async updatePersonalFields(media: MovieItem, updates: MoviePersonalUpdates): Promise<void>;
	async updatePersonalFields(media: SeriesItem, updates: SeriesPersonalUpdates): Promise<void>;
	async updatePersonalFields(media: MediaItem, updates: CommonPersonalUpdates): Promise<void>;
	async updatePersonalFields(
		media: MediaItem,
		updates: MoviePersonalUpdates | SeriesPersonalUpdates
	): Promise<void> {
		const entries = Object.entries(updates) as [PropertyKey, unknown][];
		for (const [key] of entries) {
			const allowed = COMMON_WRITE_SET.has(key)
				|| (media.type === "movie" && MOVIE_WRITE_SET.has(key))
				|| (media.type === "series" && SERIES_WRITE_SET.has(key));
			if (!allowed) throw new Error(`Frontmatter-Schreibzugriff nicht erlaubt: ${key}`);
			this.validatePersonalValue(media, key, updates[key as keyof typeof updates]);
		}

		await this.app.fileManager.processFrontMatter(media.file, (frontmatter) => {
			for (const [key, value] of entries) {
				const property = frontmatterProperty(key);
				if ((key === "lastWatched" || key === "watchedThroughSeason") && value === null) {
					delete frontmatter[property];
				} else if (value !== undefined) {
					frontmatter[property] = value;
				}
			}
		});
		this.applyPersonalUpdates(media, updates);
	}

	private applyPersonalUpdates(media: MediaItem, updates: MoviePersonalUpdates | SeriesPersonalUpdates): void {
		const common = {
			...(updates.personalRating !== undefined ? { personalRating: updates.personalRating === 0 ? undefined : updates.personalRating } : {}),
			...(updates.favorite !== undefined ? { favorite: updates.favorite } : {}),
			...(updates.watchStatus !== undefined ? { watchStatus: updates.watchStatus } : {}),
			...(updates.lastWatched !== undefined ? { lastWatched: updates.lastWatched ?? undefined } : {}),
		};
		if (media.type === "movie") {
			const movieUpdates = updates as MoviePersonalUpdates;
			this.mediaByPath.set(media.id, {
				...media,
				...common,
				...(movieUpdates.watchCount !== undefined ? { watchCount: movieUpdates.watchCount } : {}),
			});
		} else {
			const seriesUpdates = updates as SeriesPersonalUpdates;
			const watchedThroughSeason = seriesUpdates.watchedThroughSeason !== undefined
				? seriesUpdates.watchedThroughSeason ?? undefined
				: media.watchedThroughSeason;
			const watchStatus = common.watchStatus ?? media.watchStatus;
			this.mediaByPath.set(media.id, {
				...media,
				...common,
				watchedThroughSeason,
				newSeasonAvailable: hasNewSeason(watchedThroughSeason, media.seasonCount, watchStatus),
			});
		}
		this.notify();
	}

	private validatePersonalValue(media: MediaItem, key: PropertyKey, value: unknown): void {
		if (value === undefined) return;
		if (key === "personalRating" && (typeof value !== "number" || value < 0 || value > 10 || value * 2 % 1 !== 0)) {
			throw new Error("Die persönliche Bewertung muss zwischen 0 und 10 in 0,5-Schritten liegen.");
		}
		if (key === "favorite" && typeof value !== "boolean") throw new Error("Favorit muss ein Boolean sein.");
		if (key === "watchStatus" && (typeof value !== "string" || !WATCH_STATUSES.has(value))) {
			throw new Error("Ungültiger Sichtungsstatus.");
		}
		if (key === "lastWatched" && value !== null && (typeof value !== "string" || !isCalendarDate(value))) {
			throw new Error("Letzte Sichtung muss ein Datum im Format YYYY-MM-DD sein.");
		}
		if (key === "watchCount" && (typeof value !== "number" || !Number.isInteger(value) || value < 0)) {
			throw new Error("Die Sichtungszahl muss eine nichtnegative ganze Zahl sein.");
		}
		if (key === "watchedThroughSeason" && value !== null) {
			if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
				throw new Error("Der Serienfortschritt muss eine nichtnegative ganze Zahl sein.");
			}
			if (media.type === "series" && media.seasonCount !== undefined && value > media.seasonCount) {
				throw new Error("Der Serienfortschritt darf die Staffelzahl nicht überschreiten.");
			}
		}
	}

	private indexAll(): void {
		this.mediaByPath.clear();
		for (const file of this.app.vault.getMarkdownFiles()) this.indexFile(file);
	}

	private refreshFile(file: TFile): void {
		this.indexFile(file);
		this.notify();
	}

	private indexFile(file: TFile): void {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter as Frontmatter | undefined;
		if (!frontmatter) {
			this.mediaByPath.delete(file.path);
			return;
		}

		const type = frontmatter[P.type];
		if (type !== "movie" && type !== "series") {
			this.mediaByPath.delete(file.path);
			return;
		}

		const common = this.parseCommon(file, frontmatter, type);
		if (type === "movie") {
			const runtimeRaw = toOptionalString(frontmatter[P.runtime]);
			const movie: MovieItem = {
				...common,
				type,
				releaseDate: toDateString(frontmatter[P.releaseDate]),
				directors: toMediaPeople(this.app, file, frontmatter[P.directors]),
				writers: toMediaPeople(this.app, file, frontmatter[P.writers]),
				runtimeRaw,
				runtimeMinutes: parseRuntime(frontmatter[P.runtime]),
				watchCount: toNonNegativeInteger(frontmatter[P.watchCount]) ?? 0,
			};
			this.mediaByPath.set(file.path, movie);
			return;
		}

		const watchedThroughSeason = toNonNegativeInteger(frontmatter[P.watchedThroughSeason]);
		const seasonCount = toNonNegativeInteger(frontmatter[P.seasonCount]);
		const episodeRuntimeRaw = toOptionalString(frontmatter[P.episodeRuntime]);
		const series: SeriesItem = {
			...common,
			type,
			firstAirDate: toDateString(frontmatter[P.firstAirDate]),
			endDate: toDateString(frontmatter[P.endDate]),
			creators: toMediaPeople(this.app, file, frontmatter[P.creators]),
			networks: toStringArray(frontmatter[P.networks]),
			seasonCount,
			episodeCount: toNonNegativeInteger(frontmatter[P.episodeCount]),
			episodeRuntimeRaw,
			episodeRuntimeMinutes: parseRuntime(frontmatter[P.episodeRuntime]),
			watchedThroughSeason,
			newSeasonAvailable: hasNewSeason(watchedThroughSeason, seasonCount, common.watchStatus),
		};
		this.mediaByPath.set(file.path, series);
	}

	private parseCommon(
		file: TFile,
		frontmatter: Frontmatter,
		type: MediaItem["type"]
	): MediaBase {
		const title = toOptionalString(frontmatter[P.title]) ?? file.basename;
		return {
			id: file.path,
			file,
			type,
			title,
			originalTitle: toOptionalString(frontmatter[P.originalTitle]),
			year: toNumber(frontmatter[P.year]),
			releaseStatus: toOptionalString(frontmatter[P.releaseStatus]),
			ageRating: toOptionalString(frontmatter[P.ageRating]),
			genres: toStringArray(frontmatter[P.genres]),
			cast: toMediaPeople(this.app, file, frontmatter[P.cast]),
			countries: toStringArray(frontmatter[P.countries]),
			originalLanguage: toOptionalString(frontmatter[P.originalLanguage]),
			tagline: toOptionalString(frontmatter[P.tagline]),
			plot: toOptionalString(frontmatter[P.plot]),
			tmdbRating: toRating(frontmatter[P.tmdbRating]),
			tmdbVoteCount: toNonNegativeInteger(frontmatter[P.tmdbVoteCount]),
			imdbRating: toRating(frontmatter[P.imdbRating]),
			imdbVoteCount: toNonNegativeInteger(frontmatter[P.imdbVoteCount]),
			personalRating: toRating(frontmatter[P.personalRating]),
			tmdbId: toOptionalString(frontmatter[P.tmdbId]),
			imdbId: toOptionalString(frontmatter[P.imdbId]),
			sourceUrl: toOptionalString(frontmatter[P.sourceUrl]),
			cover: this.imageResolver.resolve(frontmatter[P.cover], file),
			backdrop: this.imageResolver.resolve(frontmatter[P.backdrop], file),
			trailer: toOptionalString(frontmatter[P.trailer]),
			watchStatus: toWatchStatus(frontmatter[P.watchStatus]),
			lastWatched: toDateString(frontmatter[P.lastWatched]),
			favorite: toBoolean(frontmatter[P.favorite]),
			categories: toStringArray(frontmatter[P.categories]),
			collections: toStringArray(frontmatter[P.collections]),
			created: toDateString(frontmatter[P.created]),
			updated: toDateString(frontmatter[P.updated]),
		};
	}

	private notify(): void {
		for (const listener of this.listeners) listener();
	}
}
