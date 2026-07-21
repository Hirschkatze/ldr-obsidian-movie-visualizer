export const PLUGIN_ID = "new-almanach-cinema-visualizer";
export const PLUGIN_NAME = "New Almanach | Cinema Visualizer";
export const VIEW_TYPE = "new-almanach-cinema-visualizer-view";
export const COMMAND_ID = "open-new-almanach-cinema-visualizer";
export const PERSISTENCE_NAMESPACE = PLUGIN_ID;

export const PERSISTENCE_PATHS = {
	rankOrder: `.obsidian/plugins/${PERSISTENCE_NAMESPACE}/rank-order.json`,
	allOrder: `.obsidian/plugins/${PERSISTENCE_NAMESPACE}/all-order.json`,
	tierList: `.obsidian/plugins/${PERSISTENCE_NAMESPACE}/tierlist.json`,
} as const;

