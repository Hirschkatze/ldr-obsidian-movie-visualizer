import { setIcon } from "obsidian";
import type { MediaItem } from "../../types";
import type { MediaTypeFilter } from "../../phase2/types";
import type { PersonAggregate } from "../peopleSelectors";
import {
	buildDecadeStats,
	buildDurationStats,
	buildExternalRatingStats,
	buildGenreStats,
	buildPersonalRatingStats,
	buildStatsSummary,
	buildTopCastStats,
	buildTopDirectorStats,
	buildWatchStatusStats,
	formatLongDuration,
	type BarStatistic,
	type DurationStats,
	type PersonRankingStatistic,
} from "../statisticsSelectors";

export interface StatisticsViewOptions {
	items: MediaItem[];
	headingContainer: HTMLElement;
	mediaType: MediaTypeFilter;
	onOpenPerson: (person: PersonAggregate) => void;
}

interface Metric {
	label: string;
	value: string;
	detail?: string;
	tooltip?: string;
	emphasis?: boolean;
}

function formatDecimal(value: number | undefined): string {
	return value === undefined
		? "–"
		: new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number): string {
	return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} %`;
}

function renderMetrics(parent: HTMLElement, metrics: Metric[], className = "nacv-statistics-metrics"): void {
	const grid = parent.createDiv(className);
	for (const metric of metrics) {
		const card = grid.createDiv("nacv-statistics-metric");
		if (metric.emphasis) card.addClass("nacv-statistics-metric--featured");
		card.createDiv({ cls: "nacv-statistics-metric__value", text: metric.value });
		const label = card.createDiv("nacv-statistics-metric__label");
		label.createSpan({ text: metric.label });
		if (metric.tooltip) {
			const info = label.createSpan({
				cls: "nacv-statistics-metric__info",
				attr: { title: metric.tooltip, "aria-label": metric.tooltip },
			});
			setIcon(info, "info");
		}
		if (metric.detail) card.createDiv({ cls: "nacv-statistics-metric__detail", text: metric.detail });
	}
}

function missingDurationText(stats: DurationStats, mediaType: MediaTypeFilter): string | undefined {
	if (stats.missingCount === 0) return undefined;
	if (mediaType === "movie" || stats.missingSeriesCount === 0) {
		return `${stats.missingMovieCount} ${stats.missingMovieCount === 1 ? "Film" : "Filme"} ohne Laufzeitangabe nicht berücksichtigt`;
	}
	if (mediaType === "series" || stats.missingMovieCount === 0) {
		return `${stats.missingSeriesCount} ${stats.missingSeriesCount === 1 ? "Serie" : "Serien"} ohne vollständige Laufzeitangaben nicht berücksichtigt`;
	}
	return `${stats.missingCount} Medien ohne vollständige Laufzeitangaben nicht berücksichtigt`;
}

function renderRanking(
	parent: HTMLElement,
	title: string,
	entries: readonly PersonRankingStatistic[],
	onOpenPerson: (person: PersonAggregate) => void
): void {
	if (!entries.length) return;
	const section = parent.createEl("section", { cls: "nacv-statistics-ranking" });
	section.createEl("h2", { text: title });
	const list = section.createDiv("nacv-statistics-ranking__list");
	for (const entry of entries) {
		const row = list.createDiv("nacv-statistics-ranking__row");
		if (entry.rank <= 3) row.addClass("nacv-statistics-ranking__row--top");
		row.createSpan({ cls: "nacv-statistics-ranking__rank", text: String(entry.rank).padStart(2, "0") });
		const content = row.createDiv("nacv-statistics-ranking__content");
		const heading = content.createDiv("nacv-statistics-ranking__heading");
		heading.createEl("button", {
			cls: "nacv-statistics-ranking__person",
			text: entry.person.display,
			attr: { title: entry.person.display },
		}).addEventListener("click", () => onOpenPerson(entry.person));
		heading.createSpan({
			cls: "nacv-statistics-ranking__count",
			text: entry.mediaCount === 1 ? "1 Medium" : `${entry.mediaCount} Medien`,
		});
		const track = content.createDiv("nacv-statistics-bar__track");
		track.createDiv({
			cls: "nacv-statistics-bar__fill",
			attr: { style: `--nacv-bar-width: ${entry.barPercent}%` },
		});
	}
}

function createPanel(parent: HTMLElement, title: string): HTMLElement {
	const panel = parent.createEl("section", { cls: "nacv-statistics-panel" });
	panel.createEl("h2", { text: title });
	return panel;
}

function renderBars(parent: HTMLElement, entries: readonly BarStatistic[], showShare: boolean, emptyText: string): void {
	if (!entries.length) {
		parent.createDiv({ cls: "nacv-statistics-empty", text: emptyText });
		return;
	}
	const rows = parent.createDiv("nacv-statistics-bars");
	for (const entry of entries) {
		const row = rows.createDiv("nacv-statistics-bar");
		const heading = row.createDiv("nacv-statistics-bar__heading");
		heading.createSpan({ cls: "nacv-statistics-bar__label", text: entry.label });
		heading.createSpan({
			cls: "nacv-statistics-bar__value",
			text: showShare ? `${entry.count} · ${formatPercent(entry.sharePercent)}` : String(entry.count),
		});
		const track = row.createDiv("nacv-statistics-bar__track");
		track.setAttribute("role", "img");
		track.setAttribute("aria-label", `${entry.label}: ${entry.count}`);
		track.createDiv({
			cls: "nacv-statistics-bar__fill",
			attr: { style: `--nacv-bar-width: ${entry.barPercent}%` },
		});
	}
}

export function renderStatistics(container: HTMLElement, options: StatisticsViewOptions): void {
	container.empty();
	options.headingContainer.empty();
	const header = options.headingContainer.createDiv("nacv-view-header nacv-statistics-header");
	header.createEl("h1", { text: "Statistik" });
	header.createEl("p", { text: "Read-only Auswertung deiner vorhandenen Film- und Serienmetadaten." });

	const statistics = container.createDiv("nacv-statistics");
	const summary = buildStatsSummary(options.items, options.mediaType);
	const summaryMetrics: Metric[] = [{ label: "Medien", value: String(summary.totalCount) }];
	if (options.mediaType !== "series") summaryMetrics.push({ label: "Filme", value: String(summary.movieCount) });
	if (options.mediaType !== "movie") summaryMetrics.push({ label: "Serien", value: String(summary.seriesCount) });
	summaryMetrics.push(
		{ label: "Favoriten", value: String(summary.favoriteCount) },
		{ label: "Gesehen", value: String(summary.completedCount) },
		{ label: "Geplant", value: String(summary.plannedCount) },
		{ label: "Persönlich bewertet", value: String(summary.ratedCount) },
		{ label: "Ø persönliche Bewertung", value: formatDecimal(summary.averagePersonalRating) },
	);
	renderMetrics(statistics, summaryMetrics, "nacv-statistics-summary");

	const duration = buildDurationStats(options.items, options.mediaType);
	const time = statistics.createEl("section", { cls: "nacv-statistics-time" });
	time.createEl("h2", { text: "Zeit" });
	renderMetrics(time, [
		{ label: "Gesamtlaufzeit", value: formatLongDuration(duration.totalMinutes), emphasis: true },
		{
			label: "Gesehene Zeit",
			value: formatLongDuration(duration.watchedMinutes),
			emphasis: true,
			tooltip: "Serienlaufzeiten werden anhand der gesehenen Staffeln, Episodenzahl und durchschnittlichen Episodenlaufzeit näherungsweise berechnet.",
		},
	], "nacv-statistics-time__metrics");
	const missingDuration = missingDurationText(duration, options.mediaType);
	if (missingDuration) time.createDiv({ cls: "nacv-statistics-time__missing", text: missingDuration });

	const panels = statistics.createDiv("nacv-statistics-panels nacv-statistics-distributions");
	const genres = createPanel(panels, "Genres");
	genres.addClass("nacv-statistics-panel--distribution");
	renderBars(genres, buildGenreStats(options.items, options.mediaType), true, "Keine Genres vorhanden.");

	const decades = createPanel(panels, "Erscheinungszeiträume");
	decades.addClass("nacv-statistics-panel--distribution");
	const decadeStats = buildDecadeStats(options.items, options.mediaType);
	const decadeEntries = decadeStats.withoutYear ? [...decadeStats.entries, decadeStats.withoutYear] : decadeStats.entries;
	renderBars(decades, decadeEntries, true, "Keine Erscheinungsjahre vorhanden.");

	const castRanking = buildTopCastStats(options.items, options.mediaType);
	const directorRanking = buildTopDirectorStats(options.items, options.mediaType);
	if (castRanking.length || directorRanking.length) {
		const people = statistics.createEl("section", { cls: "nacv-statistics-people" });
		people.createEl("h2", { cls: "nacv-statistics-people__title", text: "Personen" });
		const rankings = people.createDiv("nacv-statistics-rankings");
		renderRanking(rankings, "Häufigste Darsteller:innen", castRanking, options.onOpenPerson);
		renderRanking(rankings, "Häufigste Regie", directorRanking, options.onOpenPerson);
	}

	const ratings = statistics.createEl("section", { cls: "nacv-statistics-ratings" });
	ratings.createEl("h2", { cls: "nacv-statistics-ratings__title", text: "Bewertungen" });
	const ratingColumns = ratings.createDiv("nacv-statistics-ratings__columns");
	const personal = createPanel(ratingColumns, "Meine Bewertungen");
	personal.addClass("nacv-statistics-panel--ratings nacv-statistics-panel--personal-ratings");
	const personalStats = buildPersonalRatingStats(options.items, options.mediaType);
	renderMetrics(personal, [
		{ label: "Durchschnitt", value: formatDecimal(personalStats.average) },
		{ label: "Median", value: formatDecimal(personalStats.median) },
		{ label: "Höchste", value: formatDecimal(personalStats.maximum) },
		{ label: "Niedrigste", value: formatDecimal(personalStats.minimum) },
	], "nacv-statistics-metrics nacv-statistics-metrics--compact");
	if (personalStats.count > 0) {
		renderBars(personal, personalStats.buckets, false, "Keine persönlichen Bewertungen vorhanden.");
	} else {
		personal.createDiv({ cls: "nacv-statistics-empty", text: "Keine persönlichen Bewertungen vorhanden." });
	}

	const external = createPanel(ratingColumns, "Externe Bewertungen");
	external.addClass("nacv-statistics-panel--ratings nacv-statistics-panel--external-ratings");
	const externalStats = buildExternalRatingStats(options.items, options.mediaType);
	renderMetrics(external, [
		{ label: "Persönlich", value: formatDecimal(externalStats.personal.average), detail: `${externalStats.personal.count} Wertungen` },
		{ label: "IMDb", value: formatDecimal(externalStats.imdb.average), detail: `${externalStats.imdb.count} Wertungen` },
		{ label: "TMDB", value: formatDecimal(externalStats.tmdb.average), detail: `${externalStats.tmdb.count} Wertungen` },
	], "nacv-statistics-metrics nacv-statistics-metrics--external");

	const statuses = createPanel(statistics, "Sichtungsstatus");
	statuses.addClass("nacv-statistics-panel--status");
	renderBars(statuses, buildWatchStatusStats(options.items, options.mediaType), true, "Keine Sichtungsstatus vorhanden.");
}
