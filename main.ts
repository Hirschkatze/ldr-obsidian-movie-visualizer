import { Plugin, WorkspaceLeaf } from "obsidian";
import { COMMAND_ID, PLUGIN_NAME } from "./src/config/PluginIdentity";
import { MEDIA_VIEW_TYPE, MovieVisualizerView } from "./src/MovieVisualizerView";

export default class NewAlmanachCinemaVisualizerPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(MEDIA_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MovieVisualizerView(leaf));

		this.addRibbonIcon("clapperboard", PLUGIN_NAME, () => {
			void this.activateView();
		});

		this.addCommand({
			id: COMMAND_ID,
			name: "New Almanach Cinema Visualizer öffnen",
			callback: () => void this.activateView(),
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(MEDIA_VIEW_TYPE);
	}

	private async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(MEDIA_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: MEDIA_VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}
}
