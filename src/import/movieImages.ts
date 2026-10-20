export const MOVIE_IMAGE_DIRECTORY = "Atlas/Sources/Movies/Images";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export type MovieImageKind = "cover" | "backdrop";

export const TMDB_MOVIE_IMAGE_SIZE: Readonly<Record<MovieImageKind, "w500" | "w1280">> = {
	cover: "w500",
	backdrop: "w1280",
};

export interface MovieImageStorage {
	exists(vaultRelativePath: string): Promise<boolean>;
	ensureDirectory(vaultRelativeDirectory: string): Promise<void>;
	writeBinary(vaultRelativePath: string, data: ArrayBuffer): Promise<void>;
}

export interface EnsureMovieImageOptions {
	finalMovieNotePath: string;
	kind: MovieImageKind;
	tmdbImagePath?: string | null;
	storage: MovieImageStorage;
	downloadBinary: (url: string) => Promise<ArrayBuffer>;
	onDownloadError?: (message: string, error: unknown) => void;
}

function finalMovieNoteBasename(finalMovieNotePath: string): string {
	const normalized = finalMovieNotePath.trim().replace(/\\/g, "/");
	if (!normalized || /^(?:[a-z]:\/|\/|file:)/i.test(normalized)) {
		throw new Error("Der Filmnotizpfad muss Vault-relativ sein.");
	}
	const filename = normalized.split("/").pop() ?? "";
	const basename = filename.replace(/\.md$/i, "").trim();
	if (!basename) throw new Error("Der endgültige Filmnotizname fehlt.");
	return basename;
}

/**
 * Leitet den Bildnamen vom bereits finalisierten, mit der bestehenden
 * safe_name-Logik erzeugten Notiznamen ab. Diese Funktion bereinigt Titel
 * bewusst nicht ein zweites Mal.
 */
export function buildMovieImagePath(finalMovieNotePath: string, kind: MovieImageKind): string {
	const basename = finalMovieNoteBasename(finalMovieNotePath);
	const suffix = kind === "backdrop" ? "-backdrop" : "";
	return `${MOVIE_IMAGE_DIRECTORY}/${basename}${suffix}.jpg`;
}

export function buildTmdbMovieImageUrl(
	tmdbImagePath: string | null | undefined,
	kind: MovieImageKind
): string | undefined {
	const path = tmdbImagePath?.trim();
	if (!path) return undefined;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${TMDB_IMAGE_BASE_URL}/${TMDB_MOVIE_IMAGE_SIZE[kind]}${normalizedPath}`;
}

function imageLabel(kind: MovieImageKind): string {
	return kind === "cover" ? "Cover" : "Backdrop";
}

/**
 * Gibt ausschließlich einen Vault-relativen Pfad zurück. Vorhandene Dateien
 * werden wiederverwendet und unmittelbar vor dem Schreiben erneut geprüft.
 * Fehler werden gemeldet und als fehlendes Bild behandelt, damit die
 * Filmnotiz unabhängig davon erstellt werden kann.
 */
export async function ensureMovieImage(options: EnsureMovieImageOptions): Promise<string | undefined> {
	const targetPath = buildMovieImagePath(options.finalMovieNotePath, options.kind);
	try {
		if (await options.storage.exists(targetPath)) return targetPath;

		const imageUrl = buildTmdbMovieImageUrl(options.tmdbImagePath, options.kind);
		if (!imageUrl) return undefined;

		const data = await options.downloadBinary(imageUrl);
		if (data.byteLength === 0) throw new Error("Leere Bilddatei empfangen.");

		await options.storage.ensureDirectory(MOVIE_IMAGE_DIRECTORY);
		if (await options.storage.exists(targetPath)) return targetPath;
		await options.storage.writeBinary(targetPath, data);
		return targetPath;
	} catch (error) {
		options.onDownloadError?.(
			`${imageLabel(options.kind)} konnte nicht lokal gespeichert werden. Die Filmnote wird ohne dieses Bild erstellt.`,
			error
		);
		return undefined;
	}
}
