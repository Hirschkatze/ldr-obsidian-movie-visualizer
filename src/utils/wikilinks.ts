import type { App, TFile } from "obsidian";
import type { MediaPerson } from "../types";
import { toStringArray } from "./frontmatter";

export interface ParsedLink {
	target: string;
	display: string;
	hasExplicitAlias: boolean;
}

function basename(target: string): string {
	const normalized = target.replace(/\\/g, "/");
	const last = normalized.split("/").pop() ?? normalized;
	return last.replace(/\.md$/i, "");
}

export function parseWikilink(value: string): ParsedLink {
	let normalized = value.trim();
	if (normalized.startsWith("![[") && normalized.endsWith("]]")) {
		normalized = normalized.slice(3, -2);
	} else if (normalized.startsWith("[[") && normalized.endsWith("]]")) {
		normalized = normalized.slice(2, -2);
	}
	const separator = normalized.indexOf("|");
	const target = (separator >= 0 ? normalized.slice(0, separator) : normalized).trim();
	const alias = separator >= 0 ? normalized.slice(separator + 1).trim() : "";
	return {
		target,
		display: alias || basename(target),
		hasExplicitAlias: alias.length > 0,
	};
}

export function toMediaPeople(app: App, sourceFile: TFile, value: unknown): MediaPerson[] {
	return toStringArray(value).map((entry) => {
		const parsed = parseWikilink(entry);
		const destination = app.metadataCache.getFirstLinkpathDest(parsed.target, sourceFile.path);
		return {
			target: parsed.target,
			display: parsed.display,
			resolvedPath: destination?.path,
		};
	});
}

export function personAggregationKey(person: MediaPerson): string {
	return person.resolvedPath ?? person.target.replace(/\\/g, "/").replace(/\.md$/i, "");
}

