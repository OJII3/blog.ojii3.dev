import { defineLiveCollection, z } from "astro:content";
import { getColorIndex } from "./pages/_lib/utils/color";
import { githubLiveLoader } from "./pages/admin/_lib/github";

const liveBlog = defineLiveCollection({
	loader: githubLiveLoader({
		owner: "OJII3",
		repo: "blog.ojii3.dev",
		basePath: "content",
		filename: "README.md",
	}),
	schema: z
		.object({
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
