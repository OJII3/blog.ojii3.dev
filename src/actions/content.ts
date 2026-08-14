import { ActionError } from "astro:actions";
import { z } from "astro/zod";
import type { ContentD1Database } from "@/db/client";
import {
	createPost as defaultCreatePost,
	updatePost as defaultUpdatePost,
} from "@/lib/content/repository";
import {
	isValidContentSlug,
	normalizeContentDate,
} from "@/lib/content/validation";

export const updatePostInput = z.object({
	slug: z.string(),
	frontmatter: z.object({
		title: z.string(),
		date: z.string(),
		tags: z.array(z.string()).optional(),
		draft: z.boolean().optional(),
	}),
	body: z.string(),
	revision: z.number(),
});

export const createPostInput = z.object({
	frontmatter: z.object({
		title: z.string(),
		date: z.string(),
		tags: z.array(z.string()).optional(),
		draft: z.boolean().optional(),
	}),
	body: z.string(),
});

export async function handleCreatePost(
	input: z.infer<typeof createPostInput>,
	db: ContentD1Database,
	createPostFn: typeof defaultCreatePost = defaultCreatePost,
) {
	if (!input.frontmatter.title.trim()) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "タイトルを入力してください。",
		});
	}

	const normalizedDate = normalizeContentDate(input.frontmatter.date);
	if (!normalizedDate) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "日付が不正な形式です。",
		});
	}

	const result = await createPostFn(db, {
		title: input.frontmatter.title.trim(),
		date: normalizedDate,
		tags: input.frontmatter.tags ?? [],
		draft: input.frontmatter.draft ?? true,
		body: input.body,
	});

	switch (result.kind) {
		case "created":
			return { slug: result.slug, revision: result.revision };
		case "conflict":
			throw new ActionError({
				code: "CONFLICT",
				message: "記事の作成に失敗しました。もう一度お試しください。",
			});
	}
}

export async function handleUpdatePost(
	input: z.infer<typeof updatePostInput>,
	db: ContentD1Database,
	updatePostFn: typeof defaultUpdatePost = defaultUpdatePost,
) {
	if (!isValidContentSlug(input.slug)) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: `記事のslugが不正な形式です: ${input.slug}`,
		});
	}

	const normalizedDate = normalizeContentDate(input.frontmatter.date);
	if (!normalizedDate) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "日付が不正な形式です。",
		});
	}

	const result = await updatePostFn(db, {
		slug: input.slug,
		title: input.frontmatter.title,
		date: normalizedDate,
		tags: input.frontmatter.tags ?? [],
		draft: input.frontmatter.draft ?? false,
		body: input.body,
		revision: input.revision,
	});

	switch (result.kind) {
		case "updated":
			return { revision: result.revision };
		case "conflict":
			throw new ActionError({
				code: "CONFLICT",
				message: "コンフリクトが発生しました。ページを再読み込みしてください。",
			});
		case "not-found":
			throw new ActionError({
				code: "NOT_FOUND",
				message: "記事が見つかりません。",
			});
	}
}
