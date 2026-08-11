import { and, eq, like, or, sql } from "drizzle-orm";
import { posts, postTags, tags } from "../../db/schema";
import type { ContentPost, UpdatePostInput, UpdatePostResult } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: compatible with both D1 and bun-sqlite drizzle instances
type Db = any;

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
	db: Db,
	opts: { includeDrafts: boolean },
): Promise<ContentPost[]> {
	const allPosts: PostRow[] = opts.includeDrafts
		? await db
				.select()
				.from(posts)
				.orderBy(sql`${posts.date} DESC`)
				.all()
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
	db: Db,
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
	db: Db,
	input: UpdatePostInput,
): Promise<UpdatePostResult> {
	const existing: PostRow | undefined = await db
		.select()
		.from(posts)
		.where(eq(posts.slug, input.slug))
		.get();

	if (!existing) return { kind: "not-found" };

	if (existing.revision !== input.revision) {
		return { kind: "conflict" };
	}

	const now = Date.now();
	const newRevision = input.revision + 1;

	try {
		await db.transaction(async (tx: Db) => {
			await tx
				.update(posts)
				.set({
					title: input.title,
					date: input.date,
					draft: input.draft,
					body: input.body,
					revision: newRevision,
					updatedAt: now,
				})
				.where(
					and(
						eq(posts.slug, input.slug),
						eq(posts.revision, input.revision),
					),
				);

			const updated: { revision: number } | undefined = await tx
				.select({ revision: posts.revision })
				.from(posts)
				.where(eq(posts.slug, input.slug))
				.get();

			if (!updated || updated.revision !== newRevision) {
				tx.rollback();
			}

			await tx
				.delete(postTags)
				.where(eq(postTags.postSlug, input.slug))
				.run();

			for (const tagName of input.tags) {
				await tx
					.insert(tags)
					.values({ name: tagName })
					.onConflictDoNothing()
					.run();
				await tx
					.insert(postTags)
					.values({ postSlug: input.slug, tagName })
					.run();
			}
		});
	} catch {
		return { kind: "conflict" };
	}

	return { kind: "updated", revision: newRevision };
}

export async function searchPosts(
	db: Db,
	opts: { query?: string; tags?: string[]; limit?: number },
): Promise<ContentPost[]> {
	const limit = Math.min(opts.limit ?? 50, 50);

	let matchedPosts: PostRow[];

	if (opts.query && opts.tags?.length) {
		const pattern = `%${opts.query}%`;
		const tagFilteredSlugs: Array<{ postSlug: string }> = await db
			.select({ postSlug: postTags.postSlug })
			.from(postTags)
			.where(
				or(...opts.tags.map((t: string) => eq(postTags.tagName, t))),
			)
			.all();
		const slugSet = new Set(
			tagFilteredSlugs.map((r: { postSlug: string }) => r.postSlug),
		);

		const queryResults: PostRow[] = await db
			.select()
			.from(posts)
			.where(
				or(like(posts.title, pattern), like(posts.body, pattern)),
			)
			.orderBy(sql`${posts.date} DESC`)
			.all();

		matchedPosts = queryResults.filter((p: PostRow) => slugSet.has(p.slug));
	} else if (opts.query) {
		const pattern = `%${opts.query}%`;
		matchedPosts = await db
			.select()
			.from(posts)
			.where(
				or(like(posts.title, pattern), like(posts.body, pattern)),
			)
			.orderBy(sql`${posts.date} DESC`)
			.limit(limit)
			.all();
	} else if (opts.tags?.length) {
		const tagFilteredSlugs: Array<{ postSlug: string }> = await db
			.select({ postSlug: postTags.postSlug })
			.from(postTags)
			.where(
				or(...opts.tags.map((t: string) => eq(postTags.tagName, t))),
			)
			.all();
		const slugSet = new Set(
			tagFilteredSlugs.map((r: { postSlug: string }) => r.postSlug),
		);

		const allPosts: PostRow[] = await db
			.select()
			.from(posts)
			.orderBy(sql`${posts.date} DESC`)
			.all();

		matchedPosts = allPosts.filter((p: PostRow) => slugSet.has(p.slug));
	} else {
		matchedPosts = await db
			.select()
			.from(posts)
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
