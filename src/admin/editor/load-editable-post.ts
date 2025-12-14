import matter from "gray-matter";
import { getGitHubAccessToken } from "@admin/github/client";
import { createContentClientFromToken } from "@admin/github/content";
import type { EditableFrontmatter, LoadEditablePostResult } from "./types";

const POST_PATH = (slug: string) => `content/${slug}/README.md`;

export const loadEditablePost = async (
	slug: string,
	headers: Headers,
): Promise<LoadEditablePostResult> => {
	const accessToken = await getGitHubAccessToken(headers);
	if (!accessToken) {
		return { status: "unauthorized" };
	}

	try {
		const client = createContentClientFromToken(accessToken);
		const file = await client.getFile({ path: POST_PATH(slug) });
		const { data, content } = matter(file.content);

		return {
			status: "ok",
			post: {
				frontmatter: data as EditableFrontmatter,
				body: content.trim(),
				sha: file.sha,
			},
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to load post";
		return { status: "error", message };
	}
};
