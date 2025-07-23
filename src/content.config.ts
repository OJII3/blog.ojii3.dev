import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content" }),
  schema: z.object({
    title: z.string(),
    tags: z.string().array().optional(),
    date: z.date(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { blog };
