import type { MediaDataService } from "../services/MediaDataService";
import type { MediaItem, MovieItem, SeriesItem, WatchStatus } from "../types";
import { localDateString } from "../utils/frontmatter";

export class PersonalMediaActions {
	private readonly pendingPaths = new Set<string>();

	constructor(
		private readonly service: MediaDataService,
		private readonly today: () => string = () => localDateString()
	) {}

	isPending(path: string): boolean { return this.pendingPaths.has(path); }

	private async locked(media: MediaItem, action: () => Promise<void>): Promise<boolean> {
		if (this.pendingPaths.has(media.id)) return false;
		this.pendingPaths.add(media.id);
		try {
			await action();
			return true;
		} finally {
			this.pendingPaths.delete(media.id);
		}
	}

	setRating(media: MediaItem, value: number): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, { personalRating: value }));
	}

	setFavorite(media: MediaItem, value: boolean): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, { favorite: value }));
	}

	setWatchStatus(media: MediaItem, value: WatchStatus): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, { watchStatus: value }));
	}

	setLastWatched(media: MediaItem, value: string | null): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, { lastWatched: value }));
	}

	setLastWatchedToday(media: MediaItem): Promise<boolean> {
		return this.setLastWatched(media, this.today());
	}

	markWatched(media: MovieItem): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, {
			watchStatus: "completed",
			lastWatched: this.today(),
			watchCount: Math.max(1, media.watchCount),
		}));
	}

	rewatch(media: MovieItem): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, {
			watchStatus: "completed",
			lastWatched: this.today(),
			watchCount: media.watchCount + 1,
		}));
	}

	correctUnwatched(media: MovieItem, confirmed: boolean): Promise<boolean> {
		if (!confirmed) return Promise.resolve(false);
		return this.locked(media, () => this.service.updatePersonalFields(media, {
			watchStatus: "planned",
			lastWatched: null,
			watchCount: 0,
		}));
	}

	setSeriesProgress(media: SeriesItem, value: number | null): Promise<boolean> {
		return this.locked(media, () => this.service.updatePersonalFields(media, { watchedThroughSeason: value }));
	}
}
