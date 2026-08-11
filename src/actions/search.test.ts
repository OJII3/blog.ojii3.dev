import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { posts, postTags, tags } from "@/db/schema";
import { createTestDb, type TestDb } from "@/lib/content/test-helper";
import { handleSearchPosts } from "./search";

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

describe("handleSearchPosts", () => {
	it("returns empty array when no query and no tags", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Hello",
			date: "2024-01-01",
		});

		const result = await handleSearchPosts({}, testDb.db);

		expect(result).toEqual([]);
	});

	it("searches by query", async () => {
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

		const result = await handleSearchPosts({ query: "TypeScript" }, testDb.db);

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("ts-guide");
		expect(result[0].title).toBe("TypeScript Guide");
		expect(result[0].dateString).toBe("2024-01-01");
	});

	it("filters by tags", async () => {
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

		const result = await handleSearchPosts({ tags: ["typescript"] }, testDb.db);

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("ts-post");
	});

	it("excludes drafts", async () => {
		await seedPost(testDb, {
			slug: "published",
			title: "Published Post",
			date: "2024-01-01",
			body: "matching content",
			draft: false,
		});
		await seedPost(testDb, {
			slug: "draft",
			title: "Draft Post",
			date: "2024-02-01",
			body: "matching content",
			draft: true,
		});

		const result = await handleSearchPosts({ query: "matching" }, testDb.db);

		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe("published");
	});

	it("creates excerpt from body around query", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Test",
			date: "2024-01-01",
			body: "This is a long body with TypeScript mentioned in the middle of the text.",
		});

		const result = await handleSearchPosts({ query: "TypeScript" }, testDb.db);

		expect(result).toHaveLength(1);
		expect(result[0].excerpt).toContain("TypeScript");
	});

	it("returns color based on date", async () => {
		await seedPost(testDb, {
			slug: "post",
			title: "Test",
			date: "2024-01-01",
			body: "body",
		});

		const result = await handleSearchPosts({ query: "Test" }, testDb.db);

		expect(result).toHaveLength(1);
		expect(result[0].color).toMatch(/^border-/);
	});

	it("caps results at 50", async () => {
		for (let i = 0; i < 60; i++) {
			await seedPost(testDb, {
				slug: `post-${String(i).padStart(3, "0")}`,
				title: `Post ${i}`,
				date: `2024-01-${String(Math.min(i + 1, 28)).padStart(2, "0")}`,
			});
		}

		const result = await handleSearchPosts({ query: "Post" }, testDb.db);

		expect(result.length).toBeLessThanOrEqual(50);
	});
});
