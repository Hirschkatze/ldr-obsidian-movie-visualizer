import { toNumber, toOptionalString } from "./frontmatter";

export function parseRuntime(value: unknown): number | undefined {
	if (typeof value === "number") {
		return Number.isFinite(value) && value >= 0 ? value : undefined;
	}

	const raw = toOptionalString(value);
	if (!raw) return undefined;

	if (/^\d+(?:\.\d+)?$/.test(raw)) {
		return toNumber(raw);
	}

	const clock = raw.match(/^(\d+):(\d{1,2})$/);
	if (clock) {
		const hours = Number(clock[1]);
		const minutes = Number(clock[2]);
		return minutes < 60 ? hours * 60 + minutes : undefined;
	}

	const iso = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
	if (iso && (iso[1] || iso[2])) {
		return Number(iso[1] ?? 0) * 60 + Number(iso[2] ?? 0);
	}

	const text = raw.match(/^(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/i);
	if (text && (text[1] || text[2])) {
		return Number(text[1] ?? 0) * 60 + Number(text[2] ?? 0);
	}

	return undefined;
}

