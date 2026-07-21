import type { App, TFile } from "obsidian";
import { toOptionalString } from "../utils/frontmatter";
import { parseWikilink } from "../utils/wikilinks";

export class ImageResolver {
	constructor(private readonly app: App) {}

	resolve(value: unknown, sourceFile: TFile): string | undefined {
		const raw = toOptionalString(value);
		if (!raw) return undefined;
		if (/^https?:\/\//i.test(raw)) return raw;

		const linkPath = parseWikilink(raw).target;
		if (!linkPath) return undefined;
		const destination = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourceFile.path);
		return destination ? this.app.vault.getResourcePath(destination) : undefined;
	}
}

