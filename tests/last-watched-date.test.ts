import { describe, expect, it } from "vitest";
import { formatLastWatchedForDisplay, parseLastWatchedInput } from "../src/phase3/lastWatchedDate";

describe("Deutsche Eingabe für Gesehen am", () => {
	it.each([
		["30.04.2026", "2026-04-30"],
		["01.01.2026", "2026-01-01"],
		["29.02.2024", "2024-02-29"],
		["2026-04-30", "2026-04-30"],
	] as const)("konvertiert %s in %s", (input, expected) => {
		expect(parseLastWatchedInput(input)).toEqual({ state: "valid", value: expected });
	});

	it.each(["29.02.2025", "31.02.2026", "32.01.2026", "00.04.2026", "15.13.2026", "2026-02-31"])(
		"verwirft das unmögliche Kalenderdatum %s",
		(input) => expect(parseLastWatchedInput(input)).toEqual({ state: "invalid" }),
	);

	it.each(["3", "30", "30.", "30.0", "30.04", "30.04.", "30.04.2", "30.04.202", "0202-04-30"])(
		"behandelt %s als unvollständigen Zwischenzustand",
		(input) => expect(parseLastWatchedInput(input)).toEqual({ state: "incomplete" }),
	);

	it("formatiert einen vorhandenen ISO-Wert ohne Zeitzonenumrechnung für die deutsche Anzeige", () => {
		expect(formatLastWatchedForDisplay("2026-04-30")).toBe("30.04.2026");
		expect(parseLastWatchedInput("")).toEqual({ state: "empty" });
	});
});
