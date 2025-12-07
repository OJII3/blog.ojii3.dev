import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import type { VitaColor } from "./constants";

export const getColorIndex = (date: Date): VitaColor => {
	return date.getDate() % 7; // 0-6 for 7 colors
};

const blog = defineCollection({
	loader: glob({
		pattern: "**/README.md",
		base: "./content",
		generateId: ({ entry }) =>
			entry
				.replace(/\\/g, "/")
				.replace(/\/README\.md$/i, "")
				.replace(/\.md$/, ""),
	}),
	schema: z
		.object({
			title: z.string(),
			tags: z.string().array().optional(),
			date: z.date(),
			draft: z.boolean().optional(),
		})
		.transform((data) => ({
			...data,
			// YYYY-MM-DD 形式の日付
			dateString: data.date.toISOString().split("T")[0],
			// 記事作成日を基準に、その記事の色を決定する.
			color: getColorIndex(data.date),
			// data-pagefind-ignore で扱いやすいように、true / undefined に変換
			draft: data.draft ? true : undefined,
		})),
});

export const collections = { blog };
