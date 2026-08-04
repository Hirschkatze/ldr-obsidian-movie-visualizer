import { ItemView, WorkspaceLeaf } from "obsidian";
import { PLUGIN_NAME, VIEW_TYPE } from "./config/PluginIdentity";
import type { MediaItem } from "./types";
import { MediaDataService } from "./services/MediaDataService";
import { DEFAULT_CATALOG_FILTER, type CatalogFilterState, type MediaSortState, type MediaTypeFilter } from "./phase2/types";
import { mountApplicationContent } from "./phase2/ui/ApplicationShell";
import { renderCatalog } from "./phase2/ui/CatalogView";
import { renderSearch } from "./phase2/ui/SearchView";
import { renderMediaDetail } from "./phase2/ui/MediaDetailView";
import { PersonalMediaActions } from "./phase3/PersonalMediaActions";

export const MEDIA_VIEW_TYPE = VIEW_TYPE;
type Route = "catalog" | "search" | "detail";

export class MovieVisualizerView extends ItemView {
	private service?: MediaDataService;
	private personalActions?: PersonalMediaActions;
	private unsubscribe?: () => void;
	private route: Route = "catalog";
	private detailId?: string;
	private returnRoute: Exclude<Route, "detail"> = "catalog";
	private mediaType: MediaTypeFilter = "all";
	private catalogFilter: CatalogFilterState = { ...DEFAULT_CATALOG_FILTER };
	private catalogSort: MediaSortState = { key: "title", direction: "asc" };
	private searchQuery = "";

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
		this.personalActions = new PersonalMediaActions(this.service);
		await this.service.init();
		this.unsubscribe = this.service.subscribe(() => this.renderApplication());
		this.renderApplication();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.service?.destroy();
	}

	private renderApplication(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("nacv-root");
		const shell = root.createDiv("nacv-shell");
		this.renderNavigation(shell);
		const main = shell.createEl("main", { cls: "nacv-main" });
		const items = this.service?.items ?? [];

		if (this.route === "detail") {
			const media = this.detailId ? this.service?.getById(this.detailId) : undefined;
			if (media && this.personalActions) {
				renderMediaDetail(main, {
					app: this.app,
					media,
					personalActions: this.personalActions,
					onPersonalActionSettled: () => this.renderApplication(),
					onBack: () => {
						this.route = this.returnRoute;
						this.detailId = undefined;
						this.renderApplication();
					},
				});
				return;
			}
			this.route = this.returnRoute;
		}

		const { headingHost, viewHost } = mountApplicationContent(main, this.mediaType, (mediaType) => {
			this.mediaType = mediaType;
			this.catalogFilter = { ...this.catalogFilter, mediaType };
			this.renderApplication();
		});

		if (this.route === "search") {
			renderSearch(viewHost, {
				items,
				headingContainer: headingHost,
				query: this.searchQuery,
				mediaType: this.mediaType,
				onQueryChange: (query) => { this.searchQuery = query; },
				onOpen: (media) => this.openDetail(media),
			});
			return;
		}

		renderCatalog(viewHost, {
			items,
			headingContainer: headingHost,
			filter: { ...this.catalogFilter, mediaType: this.mediaType },
			sort: this.catalogSort,
			onFilterChange: (filter) => {
				this.catalogFilter = filter;
				this.mediaType = filter.mediaType;
				this.renderApplication();
			},
			onSortChange: (sort) => {
				this.catalogSort = sort;
				this.renderApplication();
			},
			onOpen: (media) => this.openDetail(media),
		});
	}

	private renderNavigation(shell: HTMLElement): void {
		const nav = shell.createEl("nav", { cls: "nacv-navigation", attr: { "aria-label": "Hauptnavigation" } });
		const brand = nav.createDiv("nacv-navigation__brand");
		brand.createSpan({ text: "New Almanach" });
		brand.createEl("small", { text: "Cinema Visualizer" });
		const items: Array<{ route: Exclude<Route, "detail">; label: string }> = [
			{ route: "catalog", label: "Katalog" },
			{ route: "search", label: "Suche" },
		];
		for (const item of items) {
			const button = nav.createEl("button", { cls: "nacv-navigation__item", text: item.label });
			button.toggleClass("nacv-navigation__item--active", this.route === item.route);
			button.addEventListener("click", () => {
				this.route = item.route;
				this.detailId = undefined;
				this.renderApplication();
			});
		}
	}

	private openDetail(media: MediaItem): void {
		this.returnRoute = this.route === "search" ? "search" : "catalog";
		this.route = "detail";
		this.detailId = media.id;
		this.renderApplication();
	}
}
