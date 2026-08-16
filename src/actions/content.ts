import { ActionError } from "astro:actions";
import { z } from "astro/zod";
import type { ContentD1Database } from "@/db/client";
import {
	createPost as defaultCreatePost,
	updatePost as defaultUpdatePost,
} from "@/lib/content/repository";
import type { RenderContentHtml } from "@/lib/content/types";
import {
	isValidContentSlug,
	normalizeContentDate,
} from "@/lib/content/validation";
import type { OgImagePost } from "@/lib/og-image-path";

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

export type SaveOgImage = (post: OgImagePost) => Promise<void>;

const saveOgImageIfPublished = async (
	post: OgImagePost,
	saveOgImage: SaveOgImage | undefined,
) => {
	if (!saveOgImage) return;

	try {
		await saveOgImage(post);
	} catch (error) {
		console.error("Failed to generate OG image", {
			slug: post.slug,
			revision: post.revision,
			error,
		});
		throw new ActionError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				"記事は保存されましたが、OG画像の生成に失敗しました。もう一度保存してください。",
		});
	}
};

export async function handleCreatePost(
	input: z.infer<typeof createPostInput>,
	db: ContentD1Database,
	createPostFn: typeof defaultCreatePost = defaultCreatePost,
	renderContentHtml?: RenderContentHtml,
	saveOgImage?: SaveOgImage,
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

	const createInput = {
		title: input.frontmatter.title.trim(),
		date: normalizedDate,
		tags: input.frontmatter.tags ?? [],
		draft: input.frontmatter.draft ?? true,
		body: input.body,
	};
	const result = renderContentHtml
		? await createPostFn(db, createInput, renderContentHtml)
		: await createPostFn(db, createInput);

	switch (result.kind) {
		case "created":
			if (!createInput.draft) {
				await saveOgImageIfPublished(
					{
						slug: result.slug,
						revision: result.revision,
						title: createInput.title,
						date: createInput.date,
					},
					saveOgImage,
				);
			}
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
	renderContentHtml?: RenderContentHtml,
	saveOgImage?: SaveOgImage,
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

	const updateInput = {
		slug: input.slug,
		title: input.frontmatter.title,
		date: normalizedDate,
		tags: input.frontmatter.tags ?? [],
		draft: input.frontmatter.draft ?? false,
		body: input.body,
		revision: input.revision,
	};
	const result = renderContentHtml
		? await updatePostFn(db, updateInput, renderContentHtml)
		: await updatePostFn(db, updateInput);

	switch (result.kind) {
		case "updated":
			if (!updateInput.draft) {
				await saveOgImageIfPublished(
					{
						slug: updateInput.slug,
						revision: result.revision,
						title: updateInput.title,
						date: updateInput.date,
					},
					saveOgImage,
				);
			}
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
