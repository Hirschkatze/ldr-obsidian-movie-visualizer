export const LANDSCAPE_BACKDROP_MIN_ASPECT_RATIO = 1.45;

export type BackdropDisplayMode = "landscape" | "background";

export function backdropDisplayMode(naturalWidth: number, naturalHeight: number): BackdropDisplayMode {
	if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
		return "landscape";
	}
	return naturalWidth / naturalHeight >= LANDSCAPE_BACKDROP_MIN_ASPECT_RATIO ? "landscape" : "background";
}
