import {
	type ActionAPIContext,
	ActionError,
	defineAction,
} from "astro:actions";
import { z } from "astro:schema";
import matter from "gray-matter";
import { getGitHubAccessToken } from "../features/admin/_lib/github/client";
import { createContentClientFromToken } from "../features/admin/_lib/github/content";

const updatePostInput = z.object({
	slug: z.string(),
	frontmatter: z.record(z.string(), z.unknown()),
	body: z.string(),
	sha: z.string().optional(),
});

export const updatePostHandler = async (
	{ slug, frontmatter, body, sha }: z.infer<typeof updatePostInput>,
	context: ActionAPIContext,
) => {
	const accessToken = await getGitHubAccessToken(context.request.headers);
	if (!accessToken) {
		throw new ActionError({
			code: "UNAUTHORIZED",
			message:
				"GitHub のアクセストークンを取得できませんでした。再ログインしてください。",
		});
	}

	try {
		// Ensure date is YYYY-MM-DD
		if (
			typeof frontmatter.date === "string" &&
			frontmatter.date.includes("T")
		) {
			frontmatter.date = frontmatter.date.split("T")[0];
		}

		let fileContent = matter.stringify(body || "", frontmatter);

		// Fix date format: remove quotes around YYYY-MM-DD date strings
		// gray-matter/js-yaml adds quotes by default, but we want unquoted dates
		// Handles both ' and " quotes and optional whitespace
		fileContent = fileContent.replace(
			/^date:\s*['"](\d{4}-\d{2}-\d{2})['"]/m,
			"date: $1",
		);

		const client = createContentClientFromToken(accessToken);
		const path = `content/${slug}/README.md`;

		const res = await client.upsertFile({
			path,
			content: fileContent,
			message: `chore(content): update post ${slug}`,
			sha,
		});

		return { success: true, data: res };
	} catch (e) {
		console.error(e);
		const msg = e instanceof Error ? e.message : "Unknown error";
		throw new ActionError({
			code: "INTERNAL_SERVER_ERROR",
			message: msg,
		});
	}
};

export const server = {
	updatePost: defineAction({
		accept: "json",
		input: updatePostInput,
		handler: updatePostHandler,
	}),
};
