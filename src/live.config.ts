import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { d1LiveLoader } from "./loaders/d1-live";
import { getColorIndex } from "./pages/_lib/utils/color";

const blog = defineLiveCollection({
	loader: d1LiveLoader(),
	schema: z
		.object({
			path: z.string(),
			content: z.string(),
			html: z.string(),
			title: z.string(),
			date: z.date(),
			dateString: z.string(), // YYYY-MM-DD 形式の日付
			draft: z.boolean(),
			tags: z.string().array(),
			revision: z.number(),
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
	blog,
};
