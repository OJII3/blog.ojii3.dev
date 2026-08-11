import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { posts, postTags, tags } from "../../db/schema";
import {
	getPost,
	listPosts,
	searchPosts,
	updatePost,
} from "./repository";
import { type TestDb, createTestDb } from "./test-helper";

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
			await db
				.insert(postTags)
				.values({ postSlug: opts.slug, tagName })
				.run();
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
		expect(post!.slug).toBe("hello");
		expect(post!.title).toBe("Hello World");
		expect(post!.body).toBe("content here");
		expect(post!.dateString).toBe("2024-01-01");
		expect(post!.tags).toEqual(["intro"]);
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
		expect(updated!.title).toBe("Updated");
		expect(updated!.body).toBe("new body");
		expect(updated!.dateString).toBe("2024-02-01");
		expect(updated!.tags).toEqual(["new-tag"]);
		expect(updated!.revision).toBe(2);
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
		expect(unchanged!.title).toBe("Original");
		expect(unchanged!.body).toBe("old body");
		expect(unchanged!.tags).toEqual(["existing-tag"]);
		expect(unchanged!.revision).toBe(2);
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
});
