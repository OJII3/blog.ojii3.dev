import { z } from "astro/zod";
import { createContentDb, getContentEnv } from "@/db/client";
import { searchPosts } from "@/lib/content/repository";
import type { ContentPost } from "@/lib/content/types";

const MAX_QUERY_LENGTH = 200;
const MAX_TAGS = 10;
const TAG_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_RESULTS = 50;

export const searchPostsInput = z.object({
	query: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

export type SearchResultItem = {
	slug: string;
	title: string;
	excerpt: string;
	dateString: string;
	color: string;
};

function createExcerpt(body: string, query: string | undefined): string {
	if (!query) {
		return body.slice(0, 100);
	}
	const index = body.toLowerCase().indexOf(query.toLowerCase());
	if (index === -1) {
		return body.slice(0, 100);
	}
	const start = Math.max(0, index - 40);
	const end = Math.min(body.length, index + query.length + 60);
	return body.slice(start, end);
}

function getColorFromDate(dateString: string): string {
	const dateNumber = new Date(dateString).getDate();
	const colorIndex = dateNumber % 7;
	const colors = [
		"border-rose-500",
		"border-orange-500",
		"border-yellow-500",
		"border-lime-500",
		"border-emerald-500",
		"border-indigo-500",
		"border-purple-500",
	];
	return colors[colorIndex];
}

type SearchableDb = Parameters<typeof searchPosts>[0];

export async function handleSearchPosts(
	input: z.infer<typeof searchPostsInput>,
	db: SearchableDb,
): Promise<SearchResultItem[]> {
	const rawQuery = input.query?.trim() || undefined;
	const rawTags = input.tags?.length ? input.tags : undefined;

	if (rawQuery && rawQuery.length > MAX_QUERY_LENGTH) {
		return [];
	}

	if (rawTags && rawTags.length > MAX_TAGS) {
		return [];
	}

	if (rawTags && !rawTags.every((t) => TAG_PATTERN.test(t))) {
		return [];
	}

	const query = rawQuery;
	const tags = rawTags;

	if (!query && !tags) {
		return [];
	}

	const posts: ContentPost[] = await searchPosts(db, {
		query,
		tags,
		limit: MAX_RESULTS,
	});

	return posts.map((post) => ({
		slug: post.slug,
		title: post.title,
		excerpt: createExcerpt(post.body, query),
		dateString: post.dateString,
		color: getColorFromDate(post.dateString),
	}));
}

export async function searchPostsAction(
	input: z.infer<typeof searchPostsInput>,
): Promise<SearchResultItem[]> {
	const env = await getContentEnv();
	const db = createContentDb(env);
	return handleSearchPosts(input, db);
}
