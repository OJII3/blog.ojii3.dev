import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { posts, postTags, tags } from "../../db/schema";
import { getPost, listPosts, searchPosts, updatePost } from "./repository";
import { createTestDb, type TestDb } from "./test-helper";

let db: TestDb;

beforeEach(() => {
	db = createTestDb();
});

afterEach(() => {
	// each test gets a fresh in-memory db via beforeEach
});

async function seedPost(
	db: TestDb,
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
	await db
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
			await db
				.insert(tags)
				.values({ name: tagName })
				.onConflictDoNothing()
				.run();
			await db.insert(postTags).values({ postSlug: opts.slug, tagName }).run();
		}
	}
}

describe("listPosts", () => {
	it("returns posts ordered by date descending", async () => {
		await seedPost(db, { slug: "older", title: "Older", date: "2024-01-01" });
		await seedPost(db, { slug: "newer", title: "Newer", date: "2024-06-15" });
		await seedPost(db, { slug: "mid", title: "Mid", date: "2024-03-10" });

		const result = await listPosts(db, { includeDrafts: false });

		expect(result.map((p) => p.slug)).toEqual(["newer", "mid", "older"]);
	});

	it("excludes drafts by default", async () => {
		await seedPost(db, {
			slug: "published",
			title: "Published",
			date: "2024-01-01",
			draft: false,
		});
		await seedPost(db, {
			slug: "draft",
			title: "Draft",
			date: "2024-06-15",
			draft: true,
		});

		const result = await listPosts(db, { includeDrafts: false });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("published");
	});

	it("includes drafts when includeDrafts is true", async () => {
		await seedPost(db, {
			slug: "published",
			title: "Published",
			date: "2024-01-01",
			draft: false,
		});
		await seedPost(db, {
			slug: "draft",
			title: "Draft",
			date: "2024-06-15",
			draft: true,
		});

		const result = await listPosts(db, { includeDrafts: true });

		expect(result).toHaveLength(2);
	});

	it("converts date string to Date and dateString", async () => {
		await seedPost(db, {
			slug: "post",
			title: "Post",
			date: "2024-03-15",
		});

		const result = await listPosts(db, { includeDrafts: false });

		expect(result[0].dateString).toBe("2024-03-15");
		expect(result[0].date).toBeInstanceOf(Date);
		expect(result[0].date.toISOString()).toMatch("2024-03-15");
	});

	it("aggregates tags for each post", async () => {
		await seedPost(db, {
			slug: "tagged",
			title: "Tagged",
			date: "2024-01-01",
			tags: ["typescript", "astro"],
		});

		const result = await listPosts(db, { includeDrafts: false });

		expect(result[0].tags.sort()).toEqual(["astro", "typescript"]);
	});
});

describe("getPost", () => {
	it("returns a post by slug", async () => {
		await seedPost(db, {
			slug: "hello",
			title: "Hello World",
			date: "2024-01-01",
			body: "content here",
			tags: ["intro"],
		});

		const post = await getPost(db, "hello");

		expect(post).not.toBeNull();
		const p = post as NonNullable<typeof post>;
		expect(p.slug).toBe("hello");
		expect(p.title).toBe("Hello World");
		expect(p.body).toBe("content here");
		expect(p.dateString).toBe("2024-01-01");
		expect(p.tags).toEqual(["intro"]);
	});

	it("returns null for non-existent slug", async () => {
		const post = await getPost(db, "nonexistent");
		expect(post).toBeNull();
	});
});

describe("updatePost", () => {
	it("updates post and tags with matching revision", async () => {
		await seedPost(db, {
			slug: "post",
			title: "Original",
			date: "2024-01-01",
			body: "old body",
			revision: 1,
			tags: ["old-tag"],
		});

		const result = await updatePost(db, {
			slug: "post",
			title: "Updated",
			date: "2024-02-01",
			body: "new body",
			draft: false,
			tags: ["new-tag"],
			revision: 1,
		});

		expect(result).toEqual({ kind: "updated", revision: 2 });

		const updated = await getPost(db, "post");
		expect(updated).not.toBeNull();
		const u = updated as NonNullable<typeof updated>;
		expect(u.title).toBe("Updated");
		expect(u.body).toBe("new body");
		expect(u.dateString).toBe("2024-02-01");
		expect(u.tags).toEqual(["new-tag"]);
		expect(u.revision).toBe(2);
	});

	it("returns conflict for stale revision and does not mutate post or tags", async () => {
		await seedPost(db, {
			slug: "post",
			title: "Original",
			date: "2024-01-01",
			body: "old body",
			revision: 2,
			tags: ["existing-tag"],
		});

		const result = await updatePost(db, {
			slug: "post",
			title: "Updated",
			date: "2024-02-01",
			body: "new body",
			draft: false,
			tags: ["new-tag"],
			revision: 1,
		});

		expect(result).toEqual({ kind: "conflict" });

		const unchanged = await getPost(db, "post");
		expect(unchanged).not.toBeNull();
		const u = unchanged as NonNullable<typeof unchanged>;
		expect(u.title).toBe("Original");
		expect(u.body).toBe("old body");
		expect(u.tags).toEqual(["existing-tag"]);
		expect(u.revision).toBe(2);
	});

	it("returns not-found for non-existent slug", async () => {
		const result = await updatePost(db, {
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

	it("does not corrupt tags on stale revision race condition", async () => {
		await seedPost(db, {
			slug: "post",
			title: "Original",
			date: "2024-01-01",
			body: "old body",
			revision: 1,
			tags: ["original-tag"],
		});

		const staleUpdate = updatePost(db, {
			slug: "post",
			title: "Stale Update",
			date: "2024-02-01",
			body: "stale body",
			draft: false,
			tags: ["stale-tag"],
			revision: 1,
		});

		const concurrentUpdate = updatePost(db, {
			slug: "post",
			title: "Concurrent Update",
			date: "2024-03-01",
			body: "concurrent body",
			draft: false,
			tags: ["concurrent-tag"],
			revision: 1,
		});

		const results = await Promise.all([staleUpdate, concurrentUpdate]);

		const successCount = results.filter((r) => r.kind === "updated").length;
		const conflictCount = results.filter((r) => r.kind === "conflict").length;

		expect(successCount).toBe(1);
		expect(conflictCount).toBe(1);

		const finalPost = await getPost(db, "post");
		expect(finalPost).not.toBeNull();
		const fp = finalPost as NonNullable<typeof finalPost>;

		if (results[0].kind === "updated") {
			expect(fp.title).toBe("Stale Update");
			expect(fp.tags).toEqual(["stale-tag"]);
			expect(fp.revision).toBe(2);
		} else {
			expect(fp.title).toBe("Concurrent Update");
			expect(fp.tags).toEqual(["concurrent-tag"]);
			expect(fp.revision).toBe(2);
		}

		const allTags = await db.select().from(postTags).all();
		const postTags_ = allTags.filter((t) => t.postSlug === "post");
		expect(postTags_).toHaveLength(1);
	});
});

describe("searchPosts", () => {
	it("searches by title", async () => {
		await seedPost(db, {
			slug: "ts-guide",
			title: "TypeScript Guide",
			date: "2024-01-01",
			body: "some body",
		});
		await seedPost(db, {
			slug: "astro-intro",
			title: "Astro Intro",
			date: "2024-02-01",
			body: "some body",
		});

		const result = await searchPosts(db, { query: "TypeScript" });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("ts-guide");
	});

	it("searches by body content", async () => {
		await seedPost(db, {
			slug: "post1",
			title: "Post 1",
			date: "2024-01-01",
			body: "contains drizzle orm",
		});
		await seedPost(db, {
			slug: "post2",
			title: "Post 2",
			date: "2024-02-01",
			body: "unrelated content",
		});

		const result = await searchPosts(db, { query: "drizzle" });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("post1");
	});

	it("filters by tag", async () => {
		await seedPost(db, {
			slug: "ts-post",
			title: "TS Post",
			date: "2024-01-01",
			tags: ["typescript"],
		});
		await seedPost(db, {
			slug: "astro-post",
			title: "Astro Post",
			date: "2024-02-01",
			tags: ["astro"],
		});

		const result = await searchPosts(db, { tags: ["typescript"] });

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("ts-post");
	});

	it("caps results at 50", async () => {
		for (let i = 0; i < 60; i++) {
			await seedPost(db, {
				slug: `post-${String(i).padStart(3, "0")}`,
				title: `Post ${i}`,
				date: `2024-01-${String(Math.min(i + 1, 28)).padStart(2, "0")}`,
			});
		}

		const result = await searchPosts(db, { query: "Post" });

		expect(result.length).toBeLessThanOrEqual(50);
	});

	it("returns empty array when no match", async () => {
		await seedPost(db, {
			slug: "post",
			title: "Hello",
			date: "2024-01-01",
		});

		const result = await searchPosts(db, { query: "nonexistent" });

		expect(result).toEqual([]);
	});

	it("excludes drafts from all search branches", async () => {
		await seedPost(db, {
			slug: "published",
			title: "Published Post",
			date: "2024-01-01",
			body: "matching content",
			draft: false,
			tags: ["test"],
		});
		await seedPost(db, {
			slug: "draft",
			title: "Draft Post",
			date: "2024-02-01",
			body: "matching content",
			draft: true,
			tags: ["test"],
		});

		const byQuery = await searchPosts(db, { query: "matching" });
		expect(byQuery).toHaveLength(1);
		expect(byQuery[0].slug).toBe("published");

		const byTag = await searchPosts(db, { tags: ["test"] });
		expect(byTag).toHaveLength(1);
		expect(byTag[0].slug).toBe("published");

		const byQueryAndTag = await searchPosts(db, {
			query: "matching",
			tags: ["test"],
		});
		expect(byQueryAndTag).toHaveLength(1);
		expect(byQueryAndTag[0].slug).toBe("published");

		const noFilter = await searchPosts(db, {});
		expect(noFilter).toHaveLength(1);
		expect(noFilter[0].slug).toBe("published");
	});
});
