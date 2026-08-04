import { describe, expect, it } from "vitest";
import {
	localDateString,
	toBoolean,
	toDateString,
	toNumber,
	toRating,
	toStringArray,
	toWatchStatus,
} from "../src/utils/frontmatter";

describe("Frontmatter-Normalisierung", () => {
	it("behandelt Einzelwerte und Listen gleich", () => {
		expect(toStringArray("Drama")).toEqual(["Drama"]);
		expect(toStringArray(["Drama", "Mystery"])).toEqual(["Drama", "Mystery"]);
		expect(toStringArray(undefined)).toEqual([]);
	});

	it("normalisiert Zahlen und Booleanwerte robust", () => {
		expect(toNumber("42")).toBe(42);
		expect(toNumber("x")).toBeUndefined();
		expect(toBoolean(true)).toBe(true);
		expect(toBoolean("true")).toBe(true);
		expect(toBoolean("false", true)).toBe(false);
	});

	it("behandelt persönliche Bewertung 0 als nicht bewertet", () => {
		expect(toRating(0)).toBeUndefined();
		expect(toRating(8.5)).toBe(8.5);
		expect(toRating(11)).toBeUndefined();
	});

	it("verwendet planned nur als internen Status-Fallback", () => {
		expect(toWatchStatus(undefined)).toBe("planned");
		expect(toWatchStatus("ungültig")).toBe("planned");
		expect(toWatchStatus("watching")).toBe("watching");
	});

	it("akzeptiert ISO-Kalenderdaten und erzeugt lokale Kalenderdaten", () => {
		expect(toDateString("2026-07-21")).toBe("2026-07-21");
		expect(toDateString("21.07.2026")).toBeUndefined();
		expect(toDateString("2026-02-30")).toBeUndefined();
		const local = new Date(2026, 6, 21, 0, 5);
		expect(localDateString(local)).toBe("2026-07-21");
	});
});
