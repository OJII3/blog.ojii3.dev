import type { ContentPost } from "@/lib/content/types";

export const getAllTags = (allPosts: ContentPost[]): Record<string, number> => {
	const tags: Record<string, number> = {};
	for (const post of allPosts) {
		if (post.draft) continue;
		for (const tag of post.tags ?? []) {
			tags[tag] = (tags[tag] ?? 0) + 1;
		}
	}
	return tags;
};
