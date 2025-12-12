import { defineLiveCollection, z } from "astro:content";
import type { VitaColor } from "./constants";
import { githubLiveLoader } from "./features/admin/_lib/github";

export const getColorIndex = (date: Date): VitaColor => {
	return date.getDate() % 7; // 0-6 for 7 colors
};

const liveBlog = defineLiveCollection({
	loader: githubLiveLoader({
		owner: "OJII3",
		repo: "blog.ojii3.dev",
		basePath: "content",
		pattern: "**/*.md",
	}),
	schema: z
		.object({
			id: z.string(),
			path: z.string(),
			sha: z.string(),
			content: z.string(),
			html: z.string(),
			htmlUrl: z.string().optional(),
			title: z.string(),
			date: z.date(),
			dateString: z.string(), // YYYY-MM-DD 形式の日付
			draft: z.boolean().optional(),
			tags: z.string().array().optional(),
		})
		.transform((data) => {
			return {
				...data,
				// 記事作成日を基準に、その記事の色を決定する.
				color: getColorIndex(data.date),
			};
		}),
});

export const collections = {
	liveBlog,
};
