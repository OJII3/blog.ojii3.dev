import { describe, expect, it } from "bun:test";
import type { ContentPost } from "@/lib/content/types";
import { loadContentListing } from "./load-content-listing";

const posts: ContentPost[] = [
	{
		slug: "2024-02-01-0",
		title: "Draft",
		date: new Date("2024-02-01"),
		dateString: "2024-02-01",
		tags: [],
		draft: true,
		body: "draft",
		revision: 3,
	},
	{
		slug: "2024-01-01-0",
		title: "Published",
		date: new Date("2024-01-01"),
		dateString: "2024-01-01",
		tags: ["test"],
		draft: false,
		body: "published",
		revision: 2,
	},
];

describe("loadContentListing", () => {
	it("returns D1 post metadata including drafts", async () => {
		const result = await loadContentListing(
			{} as Parameters<typeof loadContentListing>[0],
			async () => posts,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.value.entries).toEqual([
			{
				slug: "2024-02-01-0",
				title: "Draft",
				dateString: "2024-02-01",
				draft: true,
				revision: 3,
			},
			{
				slug: "2024-01-01-0",
				title: "Published",
				dateString: "2024-01-01",
				draft: false,
				revision: 2,
			},
		]);
	});
});
