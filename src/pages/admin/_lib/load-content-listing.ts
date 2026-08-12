import { listPosts } from "@/lib/content/repository";
import type { ContentPost } from "@/lib/content/types";
import type { Result } from "@/lib/result";
import { err, ok } from "@/lib/result";

export type ContentListing = {
	entries: ContentListingEntry[];
	fetchedAt: string;
};

export type ContentListingEntry = Pick<
	ContentPost,
	"slug" | "title" | "dateString" | "draft" | "revision"
>;

export type ContentListingResult = Result<ContentListing>;

export const loadContentListing = async (
	db: Parameters<typeof listPosts>[0],
	listPostsFn: typeof listPosts = listPosts,
): Promise<ContentListingResult> => {
	try {
		const posts = await listPostsFn(db, { includeDrafts: true });
		const entries = posts.map(
			({ slug, title, dateString, draft, revision }) => ({
				slug,
				title,
				dateString,
				draft,
				revision,
			}),
		);

		return ok({
			entries,
			fetchedAt: new Date().toISOString(),
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "未知のエラーが発生しました。";
		return err(message);
	}
};
