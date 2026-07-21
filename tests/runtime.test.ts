import { describe, expect, it } from "vitest";
import { parseRuntime } from "../src/utils/runtime";

describe("parseRuntime", () => {
	it.each([
		[142, 142],
		["142", 142],
		["2:22", 142],
		["PT2H22M", 142],
		["2h 22m", 142],
	])("normalisiert %j zu Minuten", (input, expected) => {
		expect(parseRuntime(input)).toBe(expected);
	});

	it.each([undefined, null, "", "2:75", "unbekannt"])("verwirft %j", (input) => {
		expect(parseRuntime(input)).toBeUndefined();
	});
});

