import { and, eq, like, or, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { ContentD1Database, ContentD1Result } from "../../db/client";
import { posts, postTags, type tags } from "../../db/schema";
import type { ContentPost, UpdatePostInput, UpdatePostResult } from "./types";

type Schema = {
	posts: typeof posts;
	tags: typeof tags;
	postTags: typeof postTags;
};

type DrizzleDb = BaseSQLiteDatabase<"sync" | "async", unknown, Schema>;

type PostRow = {
	slug: string;
	title: string;
	date: string;
	draft: boolean;
	body: string;
	revision: number;
};

function rowToContentPost(row: PostRow, tagList: string[]): ContentPost {
	return {
		slug: row.slug,
		title: row.title,
		date: new Date(row.date),
		dateString: row.date,
		tags: tagList,
		draft: row.draft,
		body: row.body,
		revision: row.revision,
	};
}

export async function listPosts(
	db: DrizzleDb,
	opts: { includeDrafts: boolean },
): Promise<ContentPost[]> {
	const allPosts: PostRow[] = opts.includeDrafts
		? await db.select().from(posts).orderBy(sql`${posts.date} DESC`).all()
		: await db
				.select()
				.from(posts)
				.where(eq(posts.draft, false))
				.orderBy(sql`${posts.date} DESC`)
				.all();

	const result: ContentPost[] = [];
	for (const p of allPosts) {
		const postTagRows: Array<{ tagName: string }> = await db
			.select({ tagName: postTags.tagName })
			.from(postTags)
			.where(eq(postTags.postSlug, p.slug))
			.all();
		result.push(
			rowToContentPost(
				p,
				postTagRows.map((t: { tagName: string }) => t.tagName),
			),
		);
	}
	return result;
}

export async function getPost(
	db: DrizzleDb,
	slug: string,
): Promise<ContentPost | null> {
	const post: PostRow | undefined = await db
		.select()
		.from(posts)
		.where(eq(posts.slug, slug))
		.get();

	if (!post) return null;

	const tagRows: Array<{ tagName: string }> = await db
		.select({ tagName: postTags.tagName })
		.from(postTags)
		.where(eq(postTags.postSlug, slug))
		.all();

	return rowToContentPost(
		post,
		tagRows.map((t: { tagName: string }) => t.tagName),
	);
}

export async function updatePost(
	d1: ContentD1Database,
	input: UpdatePostInput,
): Promise<UpdatePostResult> {
	const existing = await d1
		.prepare("SELECT `revision` FROM `posts` WHERE `slug` = ?")
		.bind(input.slug)
		.first<{ revision: number }>();

	if (!existing) return { kind: "not-found" };

	if (existing.revision !== input.revision) {
		return { kind: "conflict" };
	}

	const now = Date.now();
	const newRevision = input.revision + 1;
	const updateToken = crypto.randomUUID();

	const uniqueTags = [...new Set(input.tags)];

	const stmts = [];

	stmts.push(
		d1
			.prepare(
				"UPDATE `posts` SET `title` = ?, `date` = ?, `draft` = ?, `body` = ?, `revision` = ?, `updated_at` = ?, `update_token` = ? WHERE `slug` = ? AND `revision` = ?",
			)
			.bind(
				input.title,
				input.date,
				input.draft ? 1 : 0,
				input.body,
				newRevision,
				now,
				updateToken,
				input.slug,
				input.revision,
			),
	);

	stmts.push(
		d1
			.prepare(
				"DELETE FROM `post_tags` WHERE `post_slug` = ? AND EXISTS (SELECT 1 FROM `posts` WHERE `slug` = ? AND `revision` = ? AND `update_token` = ?)",
			)
			.bind(input.slug, input.slug, newRevision, updateToken),
	);

	for (const tagName of uniqueTags) {
		stmts.push(
			d1
				.prepare(
					"INSERT OR IGNORE INTO `tags`(`name`) SELECT ? WHERE EXISTS (SELECT 1 FROM `posts` WHERE `slug` = ? AND `revision` = ? AND `update_token` = ?)",
				)
				.bind(tagName, input.slug, newRevision, updateToken),
		);
	}

	for (const tagName of uniqueTags) {
		stmts.push(
			d1
				.prepare(
					"INSERT INTO `post_tags`(`post_slug`, `tag_name`) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM `posts` WHERE `slug` = ? AND `revision` = ? AND `update_token` = ?)",
				)
				.bind(input.slug, tagName, input.slug, newRevision, updateToken),
		);
	}

	const results: ContentD1Result[] = await d1.batch(stmts);

	const updateResult = results[0];
	if (updateResult.meta.changes === 0) {
		return { kind: "conflict" };
	}

	return { kind: "updated", revision: newRevision };
}

export async function searchPosts(
	db: DrizzleDb,
	opts: { query?: string; tags?: string[]; limit?: number },
): Promise<ContentPost[]> {
	const limit = Math.min(Math.max(opts.limit ?? 50, 0), 50);

	let matchedPosts: PostRow[];

	if (opts.query && opts.tags?.length) {
		const pattern = `%${opts.query}%`;
		matchedPosts = await db
			.select()
			.from(posts)
			.where(
				and(
					eq(posts.draft, false),
					or(like(posts.title, pattern), like(posts.body, pattern)),
					sql`EXISTS (SELECT 1 FROM ${postTags} WHERE ${postTags.postSlug} = ${posts.slug} AND ${postTags.tagName} IN (${sql.join(
						opts.tags.map((t: string) => sql`${t}`),
						sql`, `,
					)}))`,
				),
			)
			.orderBy(sql`${posts.date} DESC`)
			.limit(limit)
			.all();
	} else if (opts.query) {
		const pattern = `%${opts.query}%`;
		matchedPosts = await db
			.select()
			.from(posts)
			.where(
				and(
					eq(posts.draft, false),
					or(like(posts.title, pattern), like(posts.body, pattern)),
				),
			)
			.orderBy(sql`${posts.date} DESC`)
			.limit(limit)
			.all();
	} else if (opts.tags?.length) {
		matchedPosts = await db
			.select()
			.from(posts)
			.where(
				and(
					eq(posts.draft, false),
					sql`EXISTS (SELECT 1 FROM ${postTags} WHERE ${postTags.postSlug} = ${posts.slug} AND ${postTags.tagName} IN (${sql.join(
						opts.tags.map((t: string) => sql`${t}`),
						sql`, `,
					)}))`,
				),
			)
			.orderBy(sql`${posts.date} DESC`)
			.limit(limit)
			.all();
	} else {
		matchedPosts = await db
			.select()
			.from(posts)
			.where(eq(posts.draft, false))
			.orderBy(sql`${posts.date} DESC`)
			.limit(limit)
			.all();
	}

	const capped = matchedPosts.slice(0, limit);

	const result: ContentPost[] = [];
	for (const p of capped) {
		const tagRows: Array<{ tagName: string }> = await db
			.select({ tagName: postTags.tagName })
			.from(postTags)
			.where(eq(postTags.postSlug, p.slug))
			.all();
		result.push(
			rowToContentPost(
				p,
				tagRows.map((t: { tagName: string }) => t.tagName),
			),
		);
	}
	return result;
}
