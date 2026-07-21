import { describe, expect, it } from "vitest";
import { hasNewSeason } from "../src/utils/media";

describe("newSeasonAvailable", () => {
	it.each([
		[1, 2, "watching", true],
		[0, 2, "watching", false],
		[undefined, 2, "watching", false],
		[1, undefined, "watching", false],
		[2, 2, "completed", false],
		[1, 2, "dropped", false],
	] as const)("berechnet %j/%j/%s", (watched, seasons, status, expected) => {
		expect(hasNewSeason(watched, seasons, status)).toBe(expected);
	});
});

