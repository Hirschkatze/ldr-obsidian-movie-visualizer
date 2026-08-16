import type { App } from "obsidian";
import type { MediaItem, MediaPerson } from "../../types";

export function openPersonNote(app: App, target: string, sourcePath: string): void {
	void app.workspace.openLinkText(target, sourcePath, false);
}

export function createPersonLinks(app: App, media: MediaItem, people: MediaPerson[]): HTMLElement {
	const row = document.createElement("div");
	row.className = "nacv-person-links";
	for (const person of people) {
		const button = row.createEl("button", { cls: "nacv-person-link", text: person.display });
		button.title = person.resolvedPath ?? person.target;
		button.addEventListener("click", (event) => {
			event.stopPropagation();
			openPersonNote(app, person.target, media.file.path);
		});
	}
	return row;
}
