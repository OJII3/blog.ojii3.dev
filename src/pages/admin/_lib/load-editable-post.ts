import matter from "gray-matter";
import { err, ok, unauthorized } from "@/lib/result";
import { getGitHubAccessToken } from "@/pages/admin/_lib/github/client";
import { createContentClient } from "@/pages/admin/_lib/github/content";
import type { EditableFrontmatter, LoadEditablePostResult } from "./types";

const POST_PATH = (slug: string) => `${slug}/README.md`;

export const loadEditablePost = async (
	slug: string,
	headers: Headers,
): Promise<LoadEditablePostResult> => {
	const accessToken = await getGitHubAccessToken(headers);
	if (!accessToken) {
		return unauthorized();
	}

	try {
		const client = createContentClient(accessToken);
		const file = await client.getFile({ path: POST_PATH(slug) });
		const { data, content } = matter(file.content);

		return ok({
			frontmatter: data as EditableFrontmatter,
			body: content.trim(),
			sha: file.sha,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to load post";
		return err(message);
	}
};
