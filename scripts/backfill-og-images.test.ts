import { describe, expect, it } from "bun:test";
import { parseRows } from "./backfill-og-images";

describe("parseRows", () => {
	it("parses the Wrangler D1 response", () => {
		expect(
			parseRows(
				JSON.stringify([
					{
						results: [
							{
								slug: "2024-01-01-1",
								title: "Post",
								date: "2024-01-01",
								revision: 2,
							},
						],
					},
				]),
			),
		).toEqual([
			{
				slug: "2024-01-01-1",
				title: "Post",
				date: "2024-01-01",
				revision: 2,
			},
		]);
	});

	it("rejects malformed JSON", () => {
		expect(() => parseRows("not-json")).toThrow("Failed to parse D1 response");
	});
});
