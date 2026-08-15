import { and, asc, desc, eq, gt, like, lt, or, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { ContentD1Database, ContentD1Result } from "../../db/client";
import { posts, postTags, type tags } from "../../db/schema";
import type {
	ContentPost,
	CreatePostInput,
	CreatePostResult,
	RenderContentHtml,
	UpdatePostInput,
	UpdatePostResult,
} from "./types";

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
	renderedHtml: string;
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
		renderedHtml: row.renderedHtml,
		revision: row.revision,
	};
}

export type AdjacentPost = {
	slug: string;
	title: string;
};

export async function getAdjacentPosts(
	db: DrizzleDb,
	current: { slug: string; date: string | Date },
): Promise<{ prevPost: AdjacentPost | null; nextPost: AdjacentPost | null }> {
	const date =
		current.date instanceof Date
			? current.date.toISOString().slice(0, 10)
			: current.date;

	const [prev, next] = await Promise.all([
		db
			.select({ slug: posts.slug, title: posts.title })
			.from(posts)
			.where(
				and(
					eq(posts.draft, false),
					or(
						gt(posts.date, date),
						and(eq(posts.date, date), gt(posts.slug, current.slug)),
					),
				),
			)
			.orderBy(asc(posts.date), asc(posts.slug))
			.limit(1)
			.all(),
		db
			.select({ slug: posts.slug, title: posts.title })
			.from(posts)
			.where(
				and(
					eq(posts.draft, false),
					or(
						lt(posts.date, date),
						and(eq(posts.date, date), lt(posts.slug, current.slug)),
					),
				),
			)
			.orderBy(desc(posts.date), desc(posts.slug))
			.limit(1)
			.all(),
	]);

	return {
		prevPost: prev[0] ?? null,
		nextPost: next[0] ?? null,
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
	renderContentHtml?: RenderContentHtml,
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
	const renderedHtml = renderContentHtml
		? await renderContentHtml(input.body, input.slug)
		: null;

	const uniqueTags = [...new Set(input.tags)];

	const stmts = [];

	const updateStatement =
		renderedHtml === null
			? d1
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
					)
			: d1
					.prepare(
						"UPDATE `posts` SET `title` = ?, `date` = ?, `draft` = ?, `body` = ?, `rendered_html` = ?, `revision` = ?, `updated_at` = ?, `update_token` = ? WHERE `slug` = ? AND `revision` = ?",
					)
					.bind(
						input.title,
						input.date,
						input.draft ? 1 : 0,
						input.body,
						renderedHtml,
						newRevision,
						now,
						updateToken,
						input.slug,
						input.revision,
					);
	stmts.push(updateStatement);

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

export async function createPost(
	d1: ContentD1Database,
	input: CreatePostInput,
	renderContentHtml?: RenderContentHtml,
): Promise<CreatePostResult> {
	const uniqueTags = [...new Set(input.tags)];

	for (let attempt = 0; attempt < 3; attempt++) {
		const sequenceRow = await d1
			.prepare(
				"SELECT MAX(CAST(substr(`slug`, 12) AS INTEGER)) AS `max_sequence` FROM `posts` WHERE `slug` LIKE ?",
			)
			.bind(`${input.date}-%`)
			.first<{ max_sequence: number | null }>();

		const sequence = (sequenceRow?.max_sequence ?? -1) + 1;
		const slug = `${input.date}-${sequence}`;
		const now = Date.now();
		const renderedHtml = renderContentHtml
			? await renderContentHtml(input.body, slug)
			: "";

		const statements = [
			d1
				.prepare(
					"INSERT INTO `posts` (`slug`, `title`, `date`, `draft`, `body`, `rendered_html`, `revision`, `created_at`, `updated_at`, `update_token`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
				)
				.bind(
					slug,
					input.title,
					input.date,
					input.draft ? 1 : 0,
					input.body,
					renderedHtml,
					1,
					now,
					now,
					crypto.randomUUID(),
				),
		];

		for (const tagName of uniqueTags) {
			statements.push(
				d1
					.prepare("INSERT OR IGNORE INTO `tags` (`name`) VALUES (?)")
					.bind(tagName),
			);
			statements.push(
				d1
					.prepare(
						"INSERT INTO `post_tags` (`post_slug`, `tag_name`) VALUES (?, ?)",
					)
					.bind(slug, tagName),
			);
		}

		try {
			await d1.batch(statements);
			return { kind: "created", slug, revision: 1 };
		} catch (error) {
			if (attempt === 2) throw error;
		}
	}

	return { kind: "conflict" };
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
