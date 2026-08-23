import type { MediaItem, WatchStatus } from "../types";
import type { MediaTypeFilter } from "../phase2/types";
import { WATCH_STATUS_ORDER, watchStatusLabel } from "../phase2/format";
import { aggregatePeople, type PersonAggregate, type PersonRole } from "./peopleSelectors";

export interface StatsSummary {
	totalCount: number;
	movieCount: number;
	seriesCount: number;
	favoriteCount: number;
	completedCount: number;
	plannedCount: number;
	ratedCount: number;
	averagePersonalRating?: number;
}

export interface BarStatistic {
	label: string;
	count: number;
	sharePercent: number;
	barPercent: number;
}

export interface DecadeStats {
	entries: BarStatistic[];
	withoutYearCount: number;
	withoutYear?: BarStatistic;
}

export interface PersonalRatingStats {
	count: number;
	average?: number;
	median?: number;
	minimum?: number;
	maximum?: number;
	buckets: BarStatistic[];
}

export interface RatingAverage {
	count: number;
	average?: number;
}

export interface ExternalRatingStats {
	personal: RatingAverage;
	imdb: RatingAverage;
	tmdb: RatingAverage;
}

export interface WatchStatusStatistic extends BarStatistic {
	status: WatchStatus;
}

export interface DurationStats {
	totalMinutes: number;
	watchedMinutes: number;
	includedCount: number;
	missingCount: number;
	missingMovieCount: number;
	missingSeriesCount: number;
}

export interface PersonRankingStatistic {
	rank: number;
	person: PersonAggregate;
	mediaCount: number;
	barPercent: number;
}

const RATING_BUCKETS = [
	{ label: "0,5–2,0", minimum: 0.5, maximum: 2 },
	{ label: "2,5–4,0", minimum: 2.5, maximum: 4 },
	{ label: "4,5–6,0", minimum: 4.5, maximum: 6 },
	{ label: "6,5–8,0", minimum: 6.5, maximum: 8 },
	{ label: "8,5–10,0", minimum: 8.5, maximum: 10 },
] as const;

export function filterStatisticsMedia(items: readonly MediaItem[], mediaType: MediaTypeFilter): MediaItem[] {
	return items.filter((item) => mediaType === "all" || item.type === mediaType);
}

function validRating(value: number | undefined): value is number {
	return value !== undefined && Number.isFinite(value) && value > 0;
}

function average(values: readonly number[]): number | undefined {
	return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

function barStatistics(
	entries: Array<{ label: string; count: number }>,
	total: number,
	scale: "share" | "relative" = "share"
): BarStatistic[] {
	const maximum = Math.max(0, ...entries.map((entry) => entry.count));
	return entries.map((entry) => ({
		...entry,
		sharePercent: total > 0 ? entry.count / total * 100 : 0,
		barPercent: scale === "share"
			? (total > 0 ? entry.count / total * 100 : 0)
			: (maximum > 0 ? entry.count / maximum * 100 : 0),
	}));
}

export function buildStatsSummary(items: readonly MediaItem[], mediaType: MediaTypeFilter): StatsSummary {
	const filtered = filterStatisticsMedia(items, mediaType);
	const ratings = filtered.map((item) => item.personalRating).filter(validRating);
	return {
		totalCount: filtered.length,
		movieCount: filtered.filter((item) => item.type === "movie").length,
		seriesCount: filtered.filter((item) => item.type === "series").length,
		favoriteCount: filtered.filter((item) => item.favorite).length,
		completedCount: filtered.filter((item) => item.watchStatus === "completed").length,
		plannedCount: filtered.filter((item) => item.watchStatus === "planned").length,
		ratedCount: ratings.length,
		averagePersonalRating: average(ratings),
	};
}

export function buildGenreStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): BarStatistic[] {
	const filtered = filterStatisticsMedia(items, mediaType);
	const counts = new Map<string, number>();
	for (const item of filtered) {
		for (const genre of new Set(item.genres.filter(Boolean))) counts.set(genre, (counts.get(genre) ?? 0) + 1);
	}
	const entries = [...counts.entries()]
		.map(([label, count]) => ({ label, count }))
		.sort((left, right) => right.count - left.count
			|| left.label.localeCompare(right.label, "de-DE", { sensitivity: "base" }))
		.slice(0, 10);
	return barStatistics(entries, filtered.length);
}

function validYear(value: number | undefined): value is number {
	return value !== undefined && Number.isInteger(value) && value >= 1000 && value <= 9999;
}

export function buildDecadeStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): DecadeStats {
	const filtered = filterStatisticsMedia(items, mediaType);
	const counts = new Map<number, number>();
	let withoutYearCount = 0;
	for (const item of filtered) {
		if (!validYear(item.year)) {
			withoutYearCount += 1;
			continue;
		}
		const decade = Math.floor(item.year / 10) * 10;
		counts.set(decade, (counts.get(decade) ?? 0) + 1);
	}
	const rawEntries = [...counts.entries()]
		.sort(([left], [right]) => left - right)
		.map(([decade, count]) => ({ label: `${decade}er`, count }));
	const entriesForScale = withoutYearCount > 0
		? [...rawEntries, { label: "Ohne Jahr", count: withoutYearCount }]
		: rawEntries;
	const scaled = barStatistics(entriesForScale, filtered.length);
	return {
		entries: scaled.filter((entry) => entry.label !== "Ohne Jahr"),
		withoutYearCount,
		withoutYear: scaled.find((entry) => entry.label === "Ohne Jahr"),
	};
}

export function buildPersonalRatingStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): PersonalRatingStats {
	const ratings = filterStatisticsMedia(items, mediaType)
		.map((item) => item.personalRating)
		.filter(validRating)
		.sort((left, right) => left - right);
	const middle = Math.floor(ratings.length / 2);
	const median = ratings.length === 0
		? undefined
		: ratings.length % 2 === 1
			? ratings[middle]
			: (ratings[middle - 1] + ratings[middle]) / 2;
	const rawBuckets = RATING_BUCKETS.map((bucket) => ({
		label: bucket.label,
		count: ratings.filter((rating) => rating >= bucket.minimum && rating <= bucket.maximum).length,
	}));
	return {
		count: ratings.length,
		average: average(ratings),
		median,
		minimum: ratings[0],
		maximum: ratings[ratings.length - 1],
		buckets: barStatistics(rawBuckets, ratings.length, "relative"),
	};
}

function ratingAverage(items: readonly MediaItem[], select: (item: MediaItem) => number | undefined): RatingAverage {
	const values = items.map(select).filter(validRating);
	return { count: values.length, average: average(values) };
}

export function buildExternalRatingStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): ExternalRatingStats {
	const filtered = filterStatisticsMedia(items, mediaType);
	return {
		personal: ratingAverage(filtered, (item) => item.personalRating),
		imdb: ratingAverage(filtered, (item) => item.imdbRating),
		tmdb: ratingAverage(filtered, (item) => item.tmdbRating),
	};
}

export function buildWatchStatusStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): WatchStatusStatistic[] {
	const filtered = filterStatisticsMedia(items, mediaType);
	const counts = new Map<WatchStatus, number>();
	for (const item of filtered) counts.set(item.watchStatus, (counts.get(item.watchStatus) ?? 0) + 1);
	const rawEntries = WATCH_STATUS_ORDER
		.filter((status) => (counts.get(status) ?? 0) > 0)
		.map((status) => ({ status, label: watchStatusLabel(status), count: counts.get(status) ?? 0 }));
	const scaled = barStatistics(rawEntries, filtered.length);
	return rawEntries.map((entry, index) => ({ ...scaled[index], status: entry.status }));
}

function positive(value: number | undefined): value is number {
	return value !== undefined && Number.isFinite(value) && value > 0;
}

export function buildDurationStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): DurationStats {
	const filtered = filterStatisticsMedia(items, mediaType);
	let totalMinutes = 0;
	let watchedMinutes = 0;
	let includedCount = 0;
	let missingMovieCount = 0;
	let missingSeriesCount = 0;
	for (const item of filtered) {
		if (item.type === "movie") {
			if (!positive(item.runtimeMinutes)) {
				missingMovieCount += 1;
				continue;
			}
			includedCount += 1;
			totalMinutes += item.runtimeMinutes;
			if (item.watchStatus === "completed") watchedMinutes += item.runtimeMinutes;
			continue;
		}
		if (!positive(item.episodeCount) || !positive(item.episodeRuntimeMinutes)) {
			missingSeriesCount += 1;
			continue;
		}
		includedCount += 1;
		const seriesTotal = item.episodeCount * item.episodeRuntimeMinutes;
		totalMinutes += seriesTotal;
		if (item.watchedThroughSeason === 0) continue;
		if (positive(item.seasonCount) && positive(item.watchedThroughSeason)) {
			watchedMinutes += seriesTotal * Math.min(item.watchedThroughSeason, item.seasonCount) / item.seasonCount;
		} else if (item.watchStatus === "completed") {
			watchedMinutes += seriesTotal;
		}
	}
	return {
		totalMinutes: Math.round(totalMinutes),
		watchedMinutes: Math.round(watchedMinutes),
		includedCount,
		missingCount: missingMovieCount + missingSeriesCount,
		missingMovieCount,
		missingSeriesCount,
	};
}

export function formatLongDuration(totalMinutes: number): string {
	let remaining = Math.max(0, Math.round(totalMinutes));
	if (remaining === 0) return "0 Min.";
	const units = [
		{ minutes: 365 * 24 * 60, singular: "Jahr", plural: "Jahre" },
		{ minutes: 30 * 24 * 60, singular: "Monat", plural: "Monate" },
		{ minutes: 24 * 60, singular: "Tag", plural: "Tage" },
		{ minutes: 60, singular: "Std.", plural: "Std." },
		{ minutes: 1, singular: "Min.", plural: "Min." },
	] as const;
	const parts: string[] = [];
	for (const unit of units) {
		const value = Math.floor(remaining / unit.minutes);
		remaining %= unit.minutes;
		if (value > 0) parts.push(`${value} ${value === 1 ? unit.singular : unit.plural}`);
	}
	return parts.join(" · ");
}

function buildPersonRanking(
	items: readonly MediaItem[],
	mediaType: MediaTypeFilter,
	role: PersonRole
): PersonRankingStatistic[] {
	const people = aggregatePeople(items, mediaType)
		.map((person) => ({ person, mediaCount: person.mediaByRole[role].length }))
		.filter((entry) => entry.mediaCount > 0)
		.sort((left, right) => right.mediaCount - left.mediaCount
			|| left.person.display.localeCompare(right.person.display, "de-DE", { sensitivity: "base" })
			|| left.person.id.localeCompare(right.person.id, "de-DE"))
		.slice(0, 10);
	const maximum = Math.max(0, ...people.map((entry) => entry.mediaCount));
	return people.map((entry, index) => ({
		...entry,
		rank: index + 1,
		barPercent: maximum > 0 ? entry.mediaCount / maximum * 100 : 0,
	}));
}

export function buildTopCastStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): PersonRankingStatistic[] {
	return buildPersonRanking(items, mediaType, "cast");
}

export function buildTopDirectorStats(items: readonly MediaItem[], mediaType: MediaTypeFilter): PersonRankingStatistic[] {
	return buildPersonRanking(items, mediaType, "director");
}
