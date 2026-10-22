import { describe, expect, it } from "vitest";
import {
	COMMON_WRITABLE_KEYS,
	MOVIE_WRITABLE_KEYS,
	PROPERTY_SCHEMA,
	SERIES_WRITABLE_KEYS,
} from "../src/config/PropertySchema";

describe("PropertySchema", () => {
	it("enthält die verbindlichen Erkennungswerte und Schreib-Keys", () => {
		expect(PROPERTY_SCHEMA.type).toBe("type");
		expect(PROPERTY_SCHEMA.continuationStatus).toBe("continuationStatus");
		expect(PROPERTY_SCHEMA.nextSeasonNumber).toBe("nextSeasonNumber");
		expect(PROPERTY_SCHEMA.nextSeasonAirDate).toBe("nextSeasonAirDate");
		expect(COMMON_WRITABLE_KEYS).toEqual([
			"personalRating",
			"favorite",
			"watchStatus",
			"lastWatched",
		]);
		expect(MOVIE_WRITABLE_KEYS).toEqual(["watchCount"]);
		expect(SERIES_WRITABLE_KEYS).toEqual(["watchedThroughSeason"]);
	});
});
