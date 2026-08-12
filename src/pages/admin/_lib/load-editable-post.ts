import { auth } from "@/auth";
import { getPost } from "@/lib/content/repository";
import { err, ok, unauthorized } from "@/lib/result";
import type { EditableFrontmatter, LoadEditablePostResult } from "./types";

export const loadEditablePost = async (
	slug: string,
	headers: Headers,
	db: Parameters<typeof getPost>[0],
): Promise<LoadEditablePostResult> => {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) {
		return unauthorized();
	}

	try {
		const post = await getPost(db, slug);
		if (!post) {
			return err("記事が見つかりません");
		}

		return ok({
			frontmatter: {
				title: post.title,
				date: post.dateString,
				tags: post.tags,
				draft: post.draft,
			} as EditableFrontmatter,
			body: post.body,
			revision: post.revision,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "記事の読み込みに失敗しました";
		return err(message);
	}
};
