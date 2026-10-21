import type { App, TFile } from "obsidian";
import type { MediaDeletionPlan } from "./MediaDeletionPlan";
import { formatCount } from "./MediaDeletionText";

export type DeletionTargetKind = "cover" | "backdrop" | "note";

export interface MediaDeletionTarget {
	path: string;
	file: TFile;
	references: Array<{ mediaId: string; kind: DeletionTargetKind }>;
}

export interface MediaDeletionFailure {
	path: string;
	error: unknown;
}

export interface MediaDeletionResult {
	movedPaths: string[];
	failures: MediaDeletionFailure[];
	successfulMediaIds: string[];
}

export function collectMediaDeletionTargets(plans: readonly MediaDeletionPlan[]): MediaDeletionTarget[] {
	const targets = new Map<string, MediaDeletionTarget>();
	const add = (path: string, file: TFile, mediaId: string, kind: DeletionTargetKind): void => {
		const existing = targets.get(path);
		if (existing) {
			existing.references.push({ mediaId, kind });
			return;
		}
		targets.set(path, { path, file, references: [{ mediaId, kind }] });
	};
	for (const plan of plans) {
		if (plan.cover.status === "local-existing" && plan.cover.file && plan.cover.resolvedPath) {
			add(plan.cover.resolvedPath, plan.cover.file, plan.mediaId, "cover");
		}
		if (plan.backdrop.status === "local-existing" && plan.backdrop.file && plan.backdrop.resolvedPath) {
			add(plan.backdrop.resolvedPath, plan.backdrop.file, plan.mediaId, "backdrop");
		}
		if (plan.note.status === "local-existing" && plan.note.file) {
			add(plan.note.resolvedPath, plan.note.file, plan.mediaId, "note");
		}
	}
	return Array.from(targets.values());
}

export async function executeMediaDeletion(app: App, plans: readonly MediaDeletionPlan[]): Promise<MediaDeletionResult> {
	const movedPaths: string[] = [];
	const failures: MediaDeletionFailure[] = [];
	const successfulMediaIds = new Set<string>();
	for (const target of collectMediaDeletionTargets(plans)) {
		try {
			await app.fileManager.trashFile(target.file);
			movedPaths.push(target.path);
			for (const reference of target.references) {
				if (reference.kind === "note") successfulMediaIds.add(reference.mediaId);
			}
		} catch (error) {
			failures.push({ path: target.path, error });
			console.error(`Cinema Visualizer: Datei konnte nicht in den Papierkorb verschoben werden: ${target.path}`, error);
		}
	}
	return { movedPaths, failures, successfulMediaIds: Array.from(successfulMediaIds) };
}

export function deletionResultMessage(result: MediaDeletionResult): string {
	const moved = `${formatCount(result.movedPaths.length, "Datei", "Dateien")} in den Papierkorb verschoben.`;
	if (!result.failures.length) return moved;
	const failed = `${formatCount(result.failures.length, "Datei konnte", "Dateien konnten")} nicht verschoben werden:`;
	return `${moved}\n${failed}\n${result.failures.map((failure) => failure.path).join("\n")}`;
}
