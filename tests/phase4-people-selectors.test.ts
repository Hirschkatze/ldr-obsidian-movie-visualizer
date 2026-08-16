import { describe, expect, it } from "vitest";
import {
	aggregatePeople,
	selectPeople,
} from "../src/phase4/peopleSelectors";
import { movie, person, series } from "./phase2-fixtures";

describe("Phase-4B-Personenaggregation", () => {
	it("aggregiert dieselbe Person über mehrere Medien und sammelt Rollen ohne Doppelzählung", () => {
		const shared = person("People/Alex", "Alex", "People/Alex.md");
		const film = movie({ id: "Movies/A.md", directors: [shared], writers: [shared], cast: [shared] });
		const show = series({ id: "Series/A.md", creators: [], cast: [shared] });
		const [aggregate] = aggregatePeople([film, show], "all").filter((item) => item.display === "Alex");
		expect(aggregate.mediaCount).toBe(2);
		expect(aggregate.movieCount).toBe(1);
		expect(aggregate.seriesCount).toBe(1);
		expect(aggregate.roles).toEqual(["director", "writer", "cast"]);
		expect(aggregate.mediaByRole.director).toEqual([film]);
		expect(aggregate.mediaByRole.writer).toEqual([film]);
		expect(aggregate.mediaByRole.cast).toEqual([film, show]);
	});

	it("priorisiert resolvedPath und führt den passenden target-Fallback damit zusammen", () => {
		const resolved = person("People/Alex", "Alex A.", "Archive/People/Alex.md");
		const fallback = person("People/Alex.md", "Alex");
		const results = aggregatePeople([
			movie({ id: "Movies/A.md", directors: [resolved], writers: [], cast: [] }),
			series({ id: "Series/A.md", creators: [fallback], cast: [] }),
		], "all").filter((item) => item.target.includes("Alex"));
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe("resolved:Archive/People/Alex.md");
		expect(results[0].resolvedPath).toBe("Archive/People/Alex.md");
		expect(results[0].mediaCount).toBe(2);
	});

	it("verwendet ohne Auflösung den normalisierten target-Fallback", () => {
		const [aggregate] = aggregatePeople([
			movie({ directors: [person("People\\Dana.md", "Dana")], writers: [], cast: [] }),
		], "all").filter((item) => item.display === "Dana");
		expect(aggregate.id).toBe("target:People/Dana");
		expect(aggregate.resolvedPath).toBeUndefined();
	});

	it("verschmilzt identische Anzeigenamen mit verschiedenen Zielen nicht", () => {
		const results = aggregatePeople([
			movie({ directors: [person("People/Alex-One", "Alex")], writers: [], cast: [] }),
			series({ creators: [person("People/Alex-Two", "Alex")], cast: [] }),
		], "all").filter((item) => item.display === "Alex");
		expect(results).toHaveLength(2);
		expect(new Set(results.map((item) => item.id)).size).toBe(2);
	});

	it("wendet den globalen Typfilter vor Aggregation und Zählung an", () => {
		const shared = person("People/Sam", "Sam", "People/Sam.md");
		const items = [
			movie({ id: "Movies/Sam.md", directors: [shared], writers: [], cast: [] }),
			series({ id: "Series/Sam.md", creators: [shared], cast: [] }),
		];
		const [moviesOnly] = aggregatePeople(items, "movie").filter((item) => item.display === "Sam");
		expect(moviesOnly.mediaCount).toBe(1);
		expect(moviesOnly.movieCount).toBe(1);
		expect(moviesOnly.seriesCount).toBe(0);
		expect(moviesOnly.roles).toEqual(["director"]);
	});

	it("sucht case-insensitiv in display und target und filtert nach Rolle", () => {
		const people = aggregatePeople([
			movie({ directors: [person("People/Greta-Gerwig", "Greta Gerwig")], writers: [], cast: [] }),
			series({ creators: [], cast: [person("People/BRYAN-CRANSTON", "Bryan Cranston")] }),
		], "all");
		expect(selectPeople(people, "greta", "all", "name").map((item) => item.display)).toEqual(["Greta Gerwig"]);
		expect(selectPeople(people, "bryan-cranston", "cast", "name").map((item) => item.display)).toEqual(["Bryan Cranston"]);
		expect(selectPeople(people, "", "director", "name").map((item) => item.display)).toEqual(["Greta Gerwig"]);
	});

	it("sortiert standardmäßig nach Medienzahl mit Name als Tie-Breaker oder direkt nach Name", () => {
		const alex = person("People/Alex", "Alex");
		const zoe = person("People/Zoe", "Zoe");
		const people = aggregatePeople([
			movie({ id: "Movies/A.md", directors: [alex, zoe], writers: [], cast: [] }),
			series({ id: "Series/A.md", creators: [zoe], cast: [] }),
		], "all");
		expect(selectPeople(people, "", "all", "media-count").slice(0, 2).map((item) => item.display)).toEqual(["Zoe", "Alex"]);
		expect(selectPeople(people, "", "all", "name").slice(0, 2).map((item) => item.display)).toEqual(["Alex", "Zoe"]);
	});
});

