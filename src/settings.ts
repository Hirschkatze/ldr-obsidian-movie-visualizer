import type { CatalogDensity } from "./phase2/types";
import { normalizeLayoutWidthMode, type LayoutWidthMode } from "./LayoutWidth";

export interface CinemaVisualizerSettings {
	catalogDensity: CatalogDensity;
	layoutWidth: LayoutWidthMode;
}

export const DEFAULT_SETTINGS: CinemaVisualizerSettings = {
	catalogDensity: "standard",
	layoutWidth: "normal",
};

const CATALOG_DENSITIES = new Set<CatalogDensity>(["large", "standard", "compact", "poster"]);

export function normalizeCatalogDensity(value: unknown): CatalogDensity {
	return typeof value === "string" && CATALOG_DENSITIES.has(value as CatalogDensity)
		? value as CatalogDensity
		: "standard";
}

export function parseSettings(value: unknown): CinemaVisualizerSettings {
	const stored = value && typeof value === "object" ? value as Partial<CinemaVisualizerSettings> : {};
	return {
		catalogDensity: normalizeCatalogDensity(stored.catalogDensity),
		layoutWidth: normalizeLayoutWidthMode(stored.layoutWidth),
	};
}

export class CinemaVisualizerSettingsStore {
	private current: CinemaVisualizerSettings = { ...DEFAULT_SETTINGS };
	private stored: Record<string, unknown> = {};
	private saveQueue: Promise<void> = Promise.resolve();

	constructor(private readonly save: (settings: Record<string, unknown>) => Promise<void>) {}

	load(value: unknown): void {
		this.stored = value && typeof value === "object" && !Array.isArray(value)
			? { ...value as Record<string, unknown> }
			: {};
		this.current = parseSettings(value);
	}

	get catalogDensity(): CatalogDensity {
		return this.current.catalogDensity;
	}

	get layoutWidth(): LayoutWidthMode {
		return this.current.layoutWidth;
	}

	async setCatalogDensity(catalogDensity: CatalogDensity): Promise<void> {
		this.current = { ...this.current, catalogDensity };
		await this.savePatch({ catalogDensity });
	}

	async setLayoutWidth(layoutWidth: LayoutWidthMode): Promise<void> {
		this.current = { ...this.current, layoutWidth };
		await this.savePatch({ layoutWidth });
	}

	private async savePatch(patch: Partial<CinemaVisualizerSettings>): Promise<void> {
		this.stored = { ...this.stored, ...patch };
		const payload = { ...this.stored };
		const write = this.saveQueue.then(() => this.save(payload));
		this.saveQueue = write.catch(() => undefined);
		await write;
	}
}
