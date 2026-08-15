import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { posts, postTags, tags } from "../../db/schema";
import {
	createPost,
	getPost,
	listPosts,
	searchPosts,
	updatePost,
} from "./repository";
import { createTestDb, type TestDb } from "./test-helper";

let testDb: TestDb;

beforeEach(() => {
	testDb = createTestDb();
});

afterEach(() => {
	// each test gets a fresh in-memory db via beforeEach
});

async function seedPost(
	testDb: TestDb,
	opts: {
		slug: string;
		title: string;
		date: string;
		draft?: boolean;
		body?: string;
		revision?: number;
		tags?: string[];
	},
) {
	const now = Date.now();
	await testDb.db
		.insert(posts)
		.values({
			slug: opts.slug,
			title: opts.title,
			date: opts.date,
			draft: opts.draft ?? false,
			body: opts.body ?? "body",
			revision: opts.revision ?? 1,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	if (opts.tags?.length) {
		for (const tagName of opts.tags) {
			await testDb.db
				.insert(tags)
				.values({ name: tagName })
				.onConflictDoNothing()
				.run();
			await testDb.db
				.insert(postTags)
				.values({ postSlug: opts.slug, tagName })
				.run();
		}
	}
}

describe("listPosts", () => {
	it("returns posts ordered by date descending", async () => {
		await seedPost(testDb, {
			slug: "older",
			title: "Older",
			date: "2024-01-01",
		});
		await seedPost(testDb, {
			slug: "newer",
			title: "Newer",
			date: "2024-06-15",
		});
		await seedPost(testDb, { slug: "mid", title: "Mid", date: "2024-03-10" });

		const result = await listPosts(testDb.db, { includeDrafts: false });

		expect(result.map((p) => p.slug)).toEqual(["newer", "mid", "older"]);
	});

	it("excludes drafts by default", async () => {
		await seedPost(testDb, {
			slug: "published",
			title: "Published",
			date: "2024-01-01",
			draft: false,
		});
		await seedPost(testDb, {
			slug: "draft",
			title: "Draft",
			date: "2024-06-15",
			draft: true,
		});

		const result = await listPosts(testDb.db, { includeDrafts: false });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("published");
	});

	it("includes drafts when includeDrafts is true", async () => {
		await seedPost(testDb, {
			slug: "published",
			title: "Published",
			date: "2024-01-01",
			draft: false,
		});
		await seedPost(testDb, {
			slug: "draft",
			title: "Draft",
			date: "2024-06-15",
			draft: true,
		});

		const result = await listPosts(testDb.db, { includeDrafts: true });

		expect(result).toHaveLength(2);
	});

	it("converts date string to Date and dateString", async () => {
		await seedPost(testDb, { slug: "post", title: "Post", date: "2024-03-15" });

		const result = await listPosts(testDb.db, { includeDrafts: false });

		expect(result[0].dateString).toBe("2024-03-15");
		expect(result[0].date).toBeInstanceOf(Date);
		expect(result[0].date.toISOString()).toMatch("2024-03-15");
	});

	it("aggregates tags for each post", async () => {
		await seedPost(testDb, {
			slug: "tagged",
			title: "Tagged",
			date: "2024-01-01",
			tags: ["typescript", "astro"],
		});

		const result = await listPosts(testDb.db, { includeDrafts: false });

		expect(result[0].tags.sort()).toEqual(["astro", "typescript"]);
	});
});

describe("getPost", () => {
	it("returns a post by slug", async () => {
		await seedPost(testDb, {
			slug: "hello",
			title: "Hello World",
			date: "2024-01-01",
			body: "content here",
			tags: ["intro"],
		});

		const post = await getPost(testDb.db, "hello");

		expect(post).not.toBeNull();
		const p = post as NonNullable<typeof post>;
		expect(p.slug).toBe("hello");
		expect(p.title).toBe("Hello World");
		expect(p.body).toBe("content here");
		expect(p.dateString).toBe("2024-01-01");
		expect(p.tags).toEqual(["intro"]);
	});

	it("returns null for non-existent slug", async () => {
		const post = await getPost(testDb.db, "nonexistent");
		expect(post).toBeNull();
	});
});

describe("createPost", () => {
	it("creates a draft with a date-based slug and tags", async () => {
		const result = await createPost(testDb.d1, {
			title: "New post",
			date: "2024-01-01",
			draft: true,
			body: "new body",
			tags: ["astro", "blog", "astro"],
		});

		expect(result).toEqual({
			kind: "created",
			slug: "2024-01-01-0",
			revision: 1,
		});

		const post = await getPost(testDb.db, "2024-01-01-0");
		expect(post).toMatchObject({
			title: "New post",
			dateString: "2024-01-01",
			draft: true,
			body: "new body",
			tags: ["astro", "blog"],
		});
	});

	it("makes the created body visible to the admin listing", async () => {
		const result = await createPost(testDb.d1, {
			title: "Listed post",
			date: "2024-01-01",
			draft: true,
			body: "# Listed body",
			tags: [],
		});

		expect(result.kind).toBe("created");
		if (result.kind !== "created") return;

		const listed = await listPosts(testDb.db, { includeDrafts: true });
		expect(listed).toContainEqual(
			expect.objectContaining({
				slug: result.slug,
				body: "# Listed body",
				revision: 1,
			}),
		);
	});

	it("uses the next sequence for the selected date", async () => {
		await seedPost(testDb, {
			slug: "2024-01-01-0",
			title: "First",
			date: "2024-01-01",
		});
		await seedPost(testDb, {
			slug: "2024-01-01-2",
			title: "Third",
			date: "2024-01-01",
		});

		const result = await createPost(testDb.d1, {
			title: "Fourth",
			date: "2024-01-01",
			draft: true,
			body: "body",
			tags: [],
		});

		expect(result).toMatchObject({
			kind: "created",
			slug: "2024-01-01-3",
		});
	});
});

describe("updatePost", () => {
	it("updates post and tags with matching revision", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Original",
			date: "2024-01-01",
			body: "old body",
			revision: 1,
			tags: ["old-tag"],
		});

		const result = await updatePost(testDb.d1, {
			slug: "post",
			title: "Updated",
			date: "2024-02-01",
			body: "new body",
			draft: false,
			tags: ["new-tag"],
			revision: 1,
		});

		expect(result).toEqual({ kind: "updated", revision: 2 });

		const updated = await getPost(testDb.db, "post");
		expect(updated).not.toBeNull();
		const u = updated as NonNullable<typeof updated>;
		expect(u.title).toBe("Updated");
		expect(u.body).toBe("new body");
		expect(u.dateString).toBe("2024-02-01");
		expect(u.tags).toEqual(["new-tag"]);
		expect(u.revision).toBe(2);
	});

	it("returns conflict for stale revision and does not mutate post or tags", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Original",
			date: "2024-01-01",
			body: "old body",
			revision: 2,
			tags: ["existing-tag"],
		});

		const result = await updatePost(testDb.d1, {
			slug: "post",
			title: "Updated",
			date: "2024-02-01",
			body: "new body",
			draft: false,
			tags: ["new-tag"],
			revision: 1,
		});

		expect(result).toEqual({ kind: "conflict" });

		const unchanged = await getPost(testDb.db, "post");
		expect(unchanged).not.toBeNull();
		const u = unchanged as NonNullable<typeof unchanged>;
		expect(u.title).toBe("Original");
		expect(u.body).toBe("old body");
		expect(u.tags).toEqual(["existing-tag"]);
		expect(u.revision).toBe(2);
	});

	it("returns not-found for non-existent slug", async () => {
		const result = await updatePost(testDb.d1, {
			slug: "nonexistent",
			title: "Updated",
			date: "2024-02-01",
			body: "new body",
			draft: false,
			tags: [],
			revision: 1,
		});

		expect(result).toEqual({ kind: "not-found" });
	});

	it("inserts tags and post_tags when updating a post that had no tags", async () => {
		await seedPost(testDb, {
			slug: "no-tags",
			title: "No Tags",
			date: "2024-01-01",
			body: "body",
			revision: 1,
			tags: [],
		});

		const result = await updatePost(testDb.d1, {
			slug: "no-tags",
			title: "Now Tagged",
			date: "2024-02-01",
			body: "new body",
			draft: false,
			tags: ["alpha", "beta"],
			revision: 1,
		});

		expect(result).toEqual({ kind: "updated", revision: 2 });

		const updated = await getPost(testDb.db, "no-tags");
		expect(updated).not.toBeNull();
		expect(updated?.tags.sort()).toEqual(["alpha", "beta"]);

		const allPostTags = await testDb.db.select().from(postTags).all();
		const rows = allPostTags
			.filter((t) => t.postSlug === "no-tags")
			.map((t) => t.tagName)
			.sort();
		expect(rows).toEqual(["alpha", "beta"]);
	});

	it("deduplicates input tags preserving first-seen order", async () => {
		await seedPost(testDb, {
			slug: "dup",
			title: "Dup",
			date: "2024-01-01",
			body: "body",
			revision: 1,
			tags: [],
		});

		const result = await updatePost(testDb.d1, {
			slug: "dup",
			title: "Dup",
			date: "2024-02-01",
			body: "body",
			draft: false,
			tags: ["alpha", "beta", "alpha", "gamma", "beta"],
			revision: 1,
		});

		expect(result).toEqual({ kind: "updated", revision: 2 });

		const updated = await getPost(testDb.db, "dup");
		expect(updated).not.toBeNull();
		expect(updated?.tags).toEqual(["alpha", "beta", "gamma"]);

		const allPostTags = await testDb.db.select().from(postTags).all();
		const rows = allPostTags
			.filter((t) => t.postSlug === "dup")
			.map((t) => t.tagName);
		expect(rows).toEqual(["alpha", "beta", "gamma"]);
	});

	it("exactly one winner in concurrent same-millisecond updates via Promise.all", async () => {
		await seedPost(testDb, {
			slug: "concurrent",
			title: "Original",
			date: "2024-01-01",
			body: "old body",
			revision: 1,
			tags: ["original-tag"],
		});

		const fixedNow = 1_700_000_000_000;
		const origDateNow = Date.now;
		Date.now = () => fixedNow;

		try {
			const [resultA, resultB] = await Promise.all([
				updatePost(testDb.d1, {
					slug: "concurrent",
					title: "A",
					date: "2024-02-01",
					body: "body A",
					draft: false,
					tags: ["tag-a"],
					revision: 1,
				}),
				updatePost(testDb.d1, {
					slug: "concurrent",
					title: "B",
					date: "2024-03-01",
					body: "body B",
					draft: false,
					tags: ["tag-b"],
					revision: 1,
				}),
			]);

			const updated = [resultA, resultB].filter((r) => r.kind === "updated");
			const conflicts = [resultA, resultB].filter((r) => r.kind === "conflict");
			expect(updated).toHaveLength(1);
			expect(conflicts).toHaveLength(1);
			expect(updated[0]).toEqual({ kind: "updated", revision: 2 });

			const finalPost = await getPost(testDb.db, "concurrent");
			expect(finalPost).not.toBeNull();
			const fp = finalPost as NonNullable<typeof finalPost>;
			expect(fp.revision).toBe(2);

			const allPostTags = await testDb.db.select().from(postTags).all();
			const postTagRows = allPostTags.filter(
				(t) => t.postSlug === "concurrent",
			);
			expect(postTagRows).toHaveLength(1);

			const winnerTag = postTagRows[0].tagName;
			expect(["tag-a", "tag-b"]).toContain(winnerTag);

			const loserTag = winnerTag === "tag-a" ? "tag-b" : "tag-a";
			expect(postTagRows.map((t) => t.tagName)).not.toContain(loserTag);

			if (winnerTag === "tag-a") {
				expect(fp.body).toBe("body A");
				expect(fp.tags).toEqual(["tag-a"]);
			} else {
				expect(fp.body).toBe("body B");
				expect(fp.tags).toEqual(["tag-b"]);
			}
		} finally {
			Date.now = origDateNow;
		}
	});
});

describe("searchPosts", () => {
	it("searches by title", async () => {
		await seedPost(testDb, {
			slug: "ts-guide",
			title: "TypeScript Guide",
			date: "2024-01-01",
			body: "some body",
		});
		await seedPost(testDb, {
			slug: "astro-intro",
			title: "Astro Intro",
			date: "2024-02-01",
			body: "some body",
		});

		const result = await searchPosts(testDb.db, { query: "TypeScript" });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("ts-guide");
	});

	it("searches by body content", async () => {
		await seedPost(testDb, {
			slug: "post1",
			title: "Post 1",
			date: "2024-01-01",
			body: "contains drizzle orm",
		});
		await seedPost(testDb, {
			slug: "post2",
			title: "Post 2",
			date: "2024-02-01",
			body: "unrelated content",
		});

		const result = await searchPosts(testDb.db, { query: "drizzle" });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("post1");
	});

	it("filters by tag", async () => {
		await seedPost(testDb, {
			slug: "ts-post",
			title: "TS Post",
			date: "2024-01-01",
			tags: ["typescript"],
		});
		await seedPost(testDb, {
			slug: "astro-post",
			title: "Astro Post",
			date: "2024-02-01",
			tags: ["astro"],
		});

		const result = await searchPosts(testDb.db, { tags: ["typescript"] });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("ts-post");
	});

	it("caps results at 50", async () => {
		for (let i = 0; i < 60; i++) {
			await seedPost(testDb, {
				slug: `post-${String(i).padStart(3, "0")}`,
				title: `Post ${i}`,
				date: `2024-01-${String(Math.min(i + 1, 28)).padStart(2, "0")}`,
			});
		}

		const result = await searchPosts(testDb.db, { query: "Post" });

		expect(result.length).toBeLessThanOrEqual(50);
	});

	it("caps tag-filtered results at limit", async () => {
		for (let i = 0; i < 60; i++) {
			await seedPost(testDb, {
				slug: `post-${String(i).padStart(3, "0")}`,
				title: `Post ${i}`,
				date: `2024-01-${String(Math.min(i + 1, 28)).padStart(2, "0")}`,
				tags: ["common"],
			});
		}

		const result = await searchPosts(testDb.db, {
			tags: ["common"],
			limit: 10,
		});

		expect(result).toHaveLength(10);
	});

	it("caps tag+query results at limit", async () => {
		for (let i = 0; i < 60; i++) {
			await seedPost(testDb, {
				slug: `post-${String(i).padStart(3, "0")}`,
				title: `Post ${i}`,
				date: `2024-01-${String(Math.min(i + 1, 28)).padStart(2, "0")}`,
				body: "searchable content",
				tags: ["common"],
			});
		}

		const result = await searchPosts(testDb.db, {
			query: "searchable",
			tags: ["common"],
			limit: 10,
		});

		expect(result).toHaveLength(10);
	});

	it("clamps negative limit to zero and returns empty", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Hello",
			date: "2024-01-01",
		});

		const result = await searchPosts(testDb.db, { query: "Hello", limit: -10 });

		expect(result).toEqual([]);
	});

	it("returns empty array when no match", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Hello",
			date: "2024-01-01",
		});

		const result = await searchPosts(testDb.db, { query: "nonexistent" });

		expect(result).toEqual([]);
	});

	it("excludes drafts from all search branches", async () => {
		await seedPost(testDb, {
			slug: "published",
			title: "Published Post",
			date: "2024-01-01",
			body: "matching content",
			draft: false,
			tags: ["test"],
		});
		await seedPost(testDb, {
			slug: "draft",
			title: "Draft Post",
			date: "2024-02-01",
			body: "matching content",
			draft: true,
			tags: ["test"],
		});

		const byQuery = await searchPosts(testDb.db, { query: "matching" });
		expect(byQuery).toHaveLength(1);
		expect(byQuery[0].slug).toBe("published");

		const byTag = await searchPosts(testDb.db, { tags: ["test"] });
		expect(byTag).toHaveLength(1);
		expect(byTag[0].slug).toBe("published");

		const byQueryAndTag = await searchPosts(testDb.db, {
			query: "matching",
			tags: ["test"],
		});
		expect(byQueryAndTag).toHaveLength(1);
		expect(byQueryAndTag[0].slug).toBe("published");

		const noFilter = await searchPosts(testDb.db, {});
		expect(noFilter).toHaveLength(1);
		expect(noFilter[0].slug).toBe("published");
	});

	it("applies tag filter before limit in tag-only search", async () => {
		await seedPost(testDb, {
			slug: "older-with-tag",
			title: "Older With Tag",
			date: "2024-01-01",
			body: "body",
			tags: ["target"],
		});
		await seedPost(testDb, {
			slug: "newer-no-tag",
			title: "Newer No Tag",
			date: "2024-02-01",
			body: "body",
			tags: [],
		});

		const result = await searchPosts(testDb.db, { tags: ["target"], limit: 1 });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("older-with-tag");
	});

	it("applies tag filter before limit in tag+query search", async () => {
		await seedPost(testDb, {
			slug: "older-with-tag",
			title: "Older With Tag",
			date: "2024-01-01",
			body: "searchable",
			tags: ["target"],
		});
		await seedPost(testDb, {
			slug: "newer-no-tag",
			title: "Newer No Tag",
			date: "2024-02-01",
			body: "searchable",
			tags: [],
		});

		const result = await searchPosts(testDb.db, {
			query: "searchable",
			tags: ["target"],
			limit: 1,
		});

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("older-with-tag");
	});
});
