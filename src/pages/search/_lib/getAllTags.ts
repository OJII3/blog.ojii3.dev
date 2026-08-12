import type { CollectionEntry } from "astro:content";

export const getAllTags = (
	allPosts: CollectionEntry<"blog">[],
): Record<string, number> => {
	const tags: Record<string, number> = {};
	for (const post of allPosts) {
		if (post.data.draft) continue;
		for (const tag of post.data.tags ?? []) {
			tags[tag] = (tags[tag] ?? 0) + 1;
		}
	}
	return tags;
};
