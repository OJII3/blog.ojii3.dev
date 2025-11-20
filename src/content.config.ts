import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import type { VitaColor } from "./constants";

export const getColorIndex = (date: Date): number => {
	return date.getDate() % 7; // 0-6 for 7 colors
};

const blog = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./content" }),
	schema: z
		.object({
			title: z.string(),
			tags: z.string().array().optional(),
			date: z.date(),
			draft: z.boolean().optional(),
		})
		.transform((data) => ({
			...data,
			dateString: data.date.toISOString().split("T")[0],
			// 記事作成日を基準に、その記事の色を決定する.
			color: getColorIndex(data.date) as VitaColor,
		})),
});

export const collections = { blog };
