export interface EventRef {
	event: string;
	callback: (...args: unknown[]) => void;
}

export class TFile {
	path: string;
	basename: string;
	extension: string;

	constructor(path: string) {
		this.path = path;
		const name = path.replace(/\\/g, "/").split("/").pop() ?? path;
		const dot = name.lastIndexOf(".");
		this.extension = dot >= 0 ? name.slice(dot + 1) : "";
		this.basename = dot >= 0 ? name.slice(0, dot) : name;
	}
}

export function testFile(path: string): TFile {
	return new TFile(path);
}

export class ItemView {}
export class WorkspaceLeaf {}
export class Plugin {}
export class App {}
export class Notice {
	static messages: string[] = [];
	constructor(message: string) { Notice.messages.push(message); }
}
