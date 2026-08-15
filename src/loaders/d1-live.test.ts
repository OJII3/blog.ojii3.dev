import { describe, expect, it } from "bun:test";
import type { D1Database } from "@cloudflare/workers-types";
import type { ContentPost } from "../lib/content/types";
import { type D1LiveLoaderDatabase, d1LiveLoader } from "./d1-live";

const fakePosts: ContentPost[] = [
	{
		slug: "hello-world",
		title: "Hello World",
		date: new Date("2024-01-01"),
		dateString: "2024-01-01",
		tags: ["intro"],
		draft: false,
		body: "# Hello\n\nWorld",
		renderedHtml: "<div>stored hello</div>",
		revision: 1,
	},
	{
		slug: "draft-post",
		title: "Draft Post",
		date: new Date("2024-02-01"),
		dateString: "2024-02-01",
		tags: [],
		draft: true,
		body: "# Draft",
		renderedHtml: "<div>stored draft</div>",
		revision: 2,
	},
];

const fakeListPosts = async (
	_db: D1LiveLoaderDatabase,
	opts: { includeDrafts: boolean },
) => {
	if (opts.includeDrafts) return fakePosts;
	return fakePosts.filter((p) => !p.draft);
};

const fakeGetPost = async (_db: D1LiveLoaderDatabase, slug: string) => {
	return fakePosts.find((p) => p.slug === slug) ?? null;
};

const createLoader = () =>
	d1LiveLoader({
		getEnv: () => ({
			DB: {} as D1Database,
			MEDIA_BASE_URL: "https://media.example.com",
		}),
		getDb: () => ({}) as D1LiveLoaderDatabase,
		deps: {
			listPosts: fakeListPosts,
			getPost: fakeGetPost,
		},
	});

describe("d1LiveLoader", () => {
	it("has the correct name", () => {
		const loader = d1LiveLoader();
		expect(loader.name).toBe("d1-live-loader");
	});

	describe("loadCollection", () => {
		it("returns all posts including drafts", async () => {
			const loader = createLoader();
			const result = await loader.loadCollection({ collection: "blog" });

			if ("error" in result) {
				throw result.error;
			}

			expect(result.entries).toHaveLength(2);
			const ids = result.entries.map((e) => e.id).sort();
			expect(ids).toEqual(["draft-post", "hello-world"]);
		});

		it("returns entries with correct shape", async () => {
			const loader = createLoader();
			const result = await loader.loadCollection({ collection: "blog" });

			if ("error" in result) {
				throw result.error;
			}

			const entry = result.entries.find((e) => e.id === "hello-world");
			expect(entry).toBeDefined();
			expect(entry?.data.path).toBe("hello-world");
			expect(entry?.data.content).toBe("# Hello\n\nWorld");
			expect(entry?.data.html).toBe("");
			expect(entry?.data.title).toBe("Hello World");
			expect(entry?.data.date).toBeInstanceOf(Date);
			expect(entry?.data.dateString).toBe("2024-01-01");
			expect(entry?.data.draft).toBe(false);
			expect(entry?.data.tags).toEqual(["intro"]);
			expect(entry?.data.revision).toBe(1);
		});

		it("includes draft entries", async () => {
			const loader = createLoader();
			const result = await loader.loadCollection({ collection: "blog" });

			if ("error" in result) {
				throw result.error;
			}

			const draftEntry = result.entries.find((e) => e.id === "draft-post");
			expect(draftEntry).toBeDefined();
			expect(draftEntry?.data.draft).toBe(true);
			expect(draftEntry?.data.revision).toBe(2);
		});
	});

	describe("loadEntry", () => {
		it("returns the correct entry", async () => {
			const loader = createLoader();
			const result = await loader.loadEntry({
				filter: { id: "hello-world" },
				collection: "blog",
			});

			if (!result || "error" in result) {
				throw new Error("Expected entry");
			}

			expect(result.id).toBe("hello-world");
			expect(result.data.title).toBe("Hello World");
			expect(result.data.path).toBe("hello-world");
			expect(result.data.content).toBe("# Hello\n\nWorld");
			expect(result.data.html).toBe("<div>stored hello</div>");
		});

		it("returns undefined for unknown slug", async () => {
			const loader = createLoader();
			const result = await loader.loadEntry({
				filter: { id: "nonexistent" },
				collection: "blog",
			});

			expect(result).toBeUndefined();
		});
	});
});
