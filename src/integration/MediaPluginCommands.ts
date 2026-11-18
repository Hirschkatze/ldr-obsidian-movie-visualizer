export type MediaPluginAction = "import-movie" | "import-series" | "update-series" | "update-movie-imdb";

export interface CommandDispatcher {
	executeCommandById(id: string): boolean;
}

export interface MediaPluginCommandResult {
	status: "opened" | "unavailable";
	message?: string;
}

export const MEDIA_PLUGIN_COMMAND_IDS: Record<MediaPluginAction, string> = {
	"import-movie": "new-almanach-media-importer:import-movie",
	"import-series": "new-almanach-media-importer:import-series",
	"update-series": "new-almanach-media-updater:check-series-updates",
	"update-movie-imdb": "new-almanach-media-updater:update-movie-imdb-ratings",
};

const UNAVAILABLE_MESSAGES: Record<MediaPluginAction, string> = {
	"import-movie": "Der New Almanach Media Importer ist nicht installiert oder nicht aktiviert.",
	"import-series": "Der New Almanach Media Importer ist nicht installiert oder nicht aktiviert.",
	"update-series": "Der New Almanach Media Updater ist nicht installiert oder nicht aktiviert.",
	"update-movie-imdb": "Der New Almanach Media Updater ist nicht installiert oder nicht aktiviert.",
};

export function executeMediaPluginCommand(
	dispatcher: CommandDispatcher | undefined,
	action: MediaPluginAction
): MediaPluginCommandResult {
	try {
		if (dispatcher?.executeCommandById(MEDIA_PLUGIN_COMMAND_IDS[action]) === true) {
			return { status: "opened" };
		}
	} catch {
		// Disabled, missing, or otherwise unavailable external plugin command.
	}
	return { status: "unavailable", message: UNAVAILABLE_MESSAGES[action] };
}
