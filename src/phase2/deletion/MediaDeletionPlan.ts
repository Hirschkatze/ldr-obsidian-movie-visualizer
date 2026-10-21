import { TFile, type App } from "obsidian";
import { PROPERTY_SCHEMA as P } from "../../config/PropertySchema";
import type { MediaItem, MediaType } from "../../types";
import { toOptionalString } from "../../utils/frontmatter";
import { parseWikilink } from "../../utils/wikilinks";

export const MEDIA_DELETION_ROOTS = {
	movie: {
		notes: "Atlas/Sources/Movies/",
		images: "Atlas/Sources/Movies/Images/",
	},
	series: {
		notes: "Atlas/Sources/Series/",
		images: "Atlas/Sources/Series/Images/",
	},
} as const satisfies Record<MediaType, { notes: string; images: string }>;

export type DeletionAssetStatus =
	| "local-existing"
	| "local-missing"
	| "external"
	| "outside-allowed-root"
	| "empty";

export type DeletionNoteStatus = "local-existing" | "local-missing" | "outside-allowed-root";

export interface DeletionAssetPlan {
	rawValue?: string;
	resolvedPath?: string;
	status: DeletionAssetStatus;
	file?: TFile;
}

export interface DeletionNotePlan {
	resolvedPath: string;
	status: DeletionNoteStatus;
	file?: TFile;
}

export interface MediaDeletionPlan {
	mediaId: string;
	mediaType: MediaType;
	title: string;
	notePath: string;
	note: DeletionNotePlan;
	cover: DeletionAssetPlan;
	backdrop: DeletionAssetPlan;
}

function normalizeVaultPath(value: string): string | undefined {
	const segments = value.trim().replace(/\\/g, "/").replace(/^\/+/, "").split("/");
	const normalized: string[] = [];
	for (const segment of segments) {
		if (!segment || segment === ".") continue;
		if (segment === "..") {
			if (!normalized.length) return undefined;
			normalized.pop();
			continue;
		}
		normalized.push(segment);
	}
	return normalized.length ? normalized.join("/") : undefined;
}

function isInsideRoot(path: string, root: string): boolean {
	return path.toLocaleLowerCase().startsWith(root.toLocaleLowerCase());
}

function vaultFileAt(app: App, path: string): TFile | undefined {
	const file = app.vault.getAbstractFileByPath(path);
	return file instanceof TFile ? file : undefined;
}

function planNote(app: App, media: MediaItem): DeletionNotePlan {
	const path = normalizeVaultPath(media.file.path) ?? media.file.path;
	if (!isInsideRoot(path, MEDIA_DELETION_ROOTS[media.type].notes)) {
		return { resolvedPath: path, status: "outside-allowed-root" };
	}
	const file = vaultFileAt(app, path);
	return file
		? { resolvedPath: file.path, status: "local-existing", file }
		: { resolvedPath: path, status: "local-missing" };
}

function planAsset(app: App, media: MediaItem, value: unknown): DeletionAssetPlan {
	const rawValue = toOptionalString(value);
	if (!rawValue) return { status: "empty" };
	if (/^https?:\/\//i.test(rawValue)) return { rawValue, status: "external" };

	const target = parseWikilink(rawValue).target;
	const linkedFile = target ? app.metadataCache.getFirstLinkpathDest(target, media.file.path) : null;
	const resolvedPath = normalizeVaultPath(linkedFile?.path ?? target);
	if (!resolvedPath || !isInsideRoot(resolvedPath, MEDIA_DELETION_ROOTS[media.type].images)) {
		return { rawValue, resolvedPath: resolvedPath ?? (target || undefined), status: "outside-allowed-root" };
	}
	const file = linkedFile instanceof TFile ? linkedFile : vaultFileAt(app, resolvedPath);
	return file
		? { rawValue, resolvedPath: file.path, status: "local-existing", file }
		: { rawValue, resolvedPath, status: "local-missing" };
}

export function buildMediaDeletionPlan(app: App, media: MediaItem): MediaDeletionPlan {
	const frontmatter = app.metadataCache.getFileCache(media.file)?.frontmatter as Record<string, unknown> | undefined;
	return {
		mediaId: media.id,
		mediaType: media.type,
		title: media.title,
		notePath: media.file.path,
		note: planNote(app, media),
		cover: planAsset(app, media, frontmatter?.[P.cover]),
		backdrop: planAsset(app, media, frontmatter?.[P.backdrop]),
	};
}

export function buildMediaDeletionPlans(app: App, media: readonly MediaItem[]): MediaDeletionPlan[] {
	return media.map((item) => buildMediaDeletionPlan(app, item));
}
