import type { CatalogDensity } from "./phase2/types";

export interface CinemaVisualizerSettings {
	catalogDensity: CatalogDensity;
}

export const DEFAULT_SETTINGS: CinemaVisualizerSettings = {
	catalogDensity: "standard",
};

const CATALOG_DENSITIES = new Set<CatalogDensity>(["large", "standard", "compact", "poster"]);

export function normalizeCatalogDensity(value: unknown): CatalogDensity {
	return typeof value === "string" && CATALOG_DENSITIES.has(value as CatalogDensity)
		? value as CatalogDensity
		: "standard";
}

export function parseSettings(value: unknown): CinemaVisualizerSettings {
	const stored = value && typeof value === "object" ? value as Partial<CinemaVisualizerSettings> : {};
	return { catalogDensity: normalizeCatalogDensity(stored.catalogDensity) };
}

export class CinemaVisualizerSettingsStore {
	private current: CinemaVisualizerSettings = { ...DEFAULT_SETTINGS };

	constructor(private readonly save: (settings: CinemaVisualizerSettings) => Promise<void>) {}

	load(value: unknown): void {
		this.current = parseSettings(value);
	}

	get catalogDensity(): CatalogDensity {
		return this.current.catalogDensity;
	}

	async setCatalogDensity(catalogDensity: CatalogDensity): Promise<void> {
		this.current = { ...this.current, catalogDensity };
		await this.save({ ...this.current });
	}
}
