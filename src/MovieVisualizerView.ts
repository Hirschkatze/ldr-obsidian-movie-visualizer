import { ItemView, WorkspaceLeaf } from "obsidian";
import { PLUGIN_NAME, VIEW_TYPE } from "./config/PluginIdentity";
import { MediaDataService } from "./services/MediaDataService";

export const MEDIA_VIEW_TYPE = VIEW_TYPE;

export class MovieVisualizerView extends ItemView {
	private service?: MediaDataService;
	private unsubscribe?: () => void;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return MEDIA_VIEW_TYPE;
	}

	getDisplayText(): string {
		return PLUGIN_NAME;
	}

	getIcon(): string {
		return "clapperboard";
	}

	async onOpen(): Promise<void> {
		this.service = new MediaDataService(this.app);
		await this.service.init();
		this.unsubscribe = this.service.subscribe(() => this.renderFoundation());
		this.renderFoundation();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.service?.destroy();
	}

	private renderFoundation(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("nacv-root");

		const panel = root.createDiv("nacv-foundation");
		panel.createEl("h1", { text: PLUGIN_NAME });
		panel.createEl("p", {
			text: "Das Phase-1-Fundament ist aktiv. Dashboard und Katalog folgen in Phase 2.",
		});
		panel.createDiv("nacv-foundation__count").setText(
			`${this.service?.items.length ?? 0} Film- und Seriennotizen erkannt`
		);
	}
}
