export interface MovieActionVisibility {
	showMarkWatched: boolean;
	showRewatch: boolean;
	showCorrectUnwatched: boolean;
}

export function movieActionVisibility(watchCount: number | undefined): MovieActionVisibility {
	const hasBeenWatched = (watchCount ?? 0) >= 1;
	return {
		showMarkWatched: !hasBeenWatched,
		showRewatch: hasBeenWatched,
		showCorrectUnwatched: hasBeenWatched,
	};
}
