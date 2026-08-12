import { ActionError } from "astro:actions";
import { z } from "astro/zod";
import type { ContentD1Database } from "@/db/client";
import { updatePost as defaultUpdatePost } from "@/lib/content/repository";
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
