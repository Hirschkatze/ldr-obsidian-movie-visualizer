import { Plugin, WorkspaceLeaf } from "obsidian";
import { COMMAND_ID, PLUGIN_NAME } from "./src/config/PluginIdentity";
import { MEDIA_VIEW_TYPE, MovieVisualizerView } from "./src/MovieVisualizerView";
import { CinemaVisualizerSettingsStore } from "./src/settings";

export default class NewAlmanachCinemaVisualizerPlugin extends Plugin {
	private settingsStore?: CinemaVisualizerSettingsStore;

	async onload(): Promise<void> {
		this.settingsStore = new CinemaVisualizerSettingsStore((settings) => this.saveData(settings));
		this.settingsStore.load(await this.loadData());
		this.registerView(MEDIA_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MovieVisualizerView(leaf, {
			catalogDensity: this.settingsStore?.catalogDensity ?? "standard",
			onCatalogDensityChange: (density) => this.settingsStore?.setCatalogDensity(density),
		}));

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
