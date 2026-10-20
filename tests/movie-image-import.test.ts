import { describe, expect, it, vi } from "vitest";
import {
	MOVIE_IMAGE_DIRECTORY,
	buildMovieImagePath,
	buildTmdbMovieImageUrl,
	ensureMovieImage,
	type MovieImageStorage,
} from "../src/import/movieImages";

function storage(existing: string[] = []): MovieImageStorage & {
	ensureDirectory: ReturnType<typeof vi.fn>;
	writeBinary: ReturnType<typeof vi.fn>;
} {
	const paths = new Set(existing);
	return {
		exists: vi.fn(async (path: string) => paths.has(path)),
		ensureDirectory: vi.fn(async () => undefined),
		writeBinary: vi.fn(async (path: string) => { paths.add(path); }),
	};
}

describe("Film-Bildimport-Grundlage", () => {
	it("leitet Cover und Backdrop vom bereits finalisierten Filmnotiznamen ab", () => {
		expect(buildMovieImagePath("Atlas/Sources/Movies/Die Verurteilten (1994).md", "cover"))
			.toBe("Atlas/Sources/Movies/Images/Die Verurteilten (1994).jpg");
		expect(buildMovieImagePath("Atlas/Sources/Movies/Die Verurteilten (1994).md", "backdrop"))
			.toBe("Atlas/Sources/Movies/Images/Die Verurteilten (1994)-backdrop.jpg");
	});

	it("verwendet für TMDB-Poster w500 und für Backdrops w1280", () => {
		expect(buildTmdbMovieImageUrl("/poster.jpg", "cover"))
			.toBe("https://image.tmdb.org/t/p/w500/poster.jpg");
		expect(buildTmdbMovieImageUrl("backdrop.jpg", "backdrop"))
			.toBe("https://image.tmdb.org/t/p/w1280/backdrop.jpg");
	});

	it("übernimmt vorhandene lokale Dateien ohne Download oder Überschreiben", async () => {
		const target = `${MOVIE_IMAGE_DIRECTORY}/Film (2026).jpg`;
		const vault = storage([target]);
		const downloadBinary = vi.fn(async () => new ArrayBuffer(4));

		await expect(ensureMovieImage({
			finalMovieNotePath: "Atlas/Sources/Movies/Film (2026).md",
			kind: "cover",
			tmdbImagePath: "/poster.jpg",
			storage: vault,
			downloadBinary,
		})).resolves.toBe(target);
		expect(downloadBinary).not.toHaveBeenCalled();
		expect(vault.writeBinary).not.toHaveBeenCalled();
	});

	it("erzeugt bei fehlendem TMDB-Bildpfad keine Datei", async () => {
		const vault = storage();
		const downloadBinary = vi.fn(async () => new ArrayBuffer(4));

		await expect(ensureMovieImage({
			finalMovieNotePath: "Film (2026).md",
			kind: "backdrop",
			tmdbImagePath: "",
			storage: vault,
			downloadBinary,
		})).resolves.toBeUndefined();
		expect(downloadBinary).not.toHaveBeenCalled();
		expect(vault.ensureDirectory).not.toHaveBeenCalled();
		expect(vault.writeBinary).not.toHaveBeenCalled();
	});

	it("lädt binär und liefert ausschließlich einen Vault-relativen Pfad", async () => {
		const vault = storage();
		const downloadBinary = vi.fn(async () => new Uint8Array([1, 2, 3]).buffer);

		const result = await ensureMovieImage({
			finalMovieNotePath: "Atlas/Sources/Movies/Film (2026).md",
			kind: "backdrop",
			tmdbImagePath: "/backdrop.jpg",
			storage: vault,
			downloadBinary,
		});

		expect(downloadBinary).toHaveBeenCalledWith("https://image.tmdb.org/t/p/w1280/backdrop.jpg");
		expect(vault.ensureDirectory).toHaveBeenCalledWith(MOVIE_IMAGE_DIRECTORY);
		expect(vault.writeBinary).toHaveBeenCalledOnce();
		expect(result).toBe("Atlas/Sources/Movies/Images/Film (2026)-backdrop.jpg");
		expect(result).not.toMatch(/^[a-z]:|^file:\/\//i);
	});

	it("überschreibt auch dann nicht, wenn die Datei während des Downloads angelegt wird", async () => {
		const target = `${MOVIE_IMAGE_DIRECTORY}/Film (2026).jpg`;
		const writeBinary = vi.fn(async () => undefined);
		const vault: MovieImageStorage = {
			exists: vi.fn()
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true),
			ensureDirectory: vi.fn(async () => undefined),
			writeBinary,
		};

		await expect(ensureMovieImage({
			finalMovieNotePath: "Film (2026).md",
			kind: "cover",
			tmdbImagePath: "/poster.jpg",
			storage: vault,
			downloadBinary: vi.fn(async () => new ArrayBuffer(4)),
		})).resolves.toBe(target);
		expect(writeBinary).not.toHaveBeenCalled();
	});

	it("meldet Downloadfehler deutsch und lässt das Bild leer", async () => {
		const vault = storage();
		const onDownloadError = vi.fn();

		await expect(ensureMovieImage({
			finalMovieNotePath: "Film (2026).md",
			kind: "cover",
			tmdbImagePath: "/poster.jpg",
			storage: vault,
			downloadBinary: vi.fn(async () => { throw new Error("network"); }),
			onDownloadError,
		})).resolves.toBeUndefined();
		expect(vault.writeBinary).not.toHaveBeenCalled();
		expect(onDownloadError).toHaveBeenCalledOnce();
		expect(onDownloadError.mock.calls[0][0]).toContain("Filmnote wird ohne dieses Bild erstellt");
	});

	it("weist absolute Eingabepfade zurück", () => {
		expect(() => buildMovieImagePath("E:\\Vault\\Film (2026).md", "cover"))
			.toThrow("Vault-relativ");
	});
});
