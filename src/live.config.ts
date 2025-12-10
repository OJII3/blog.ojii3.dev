import { defineLiveCollection } from "astro:content";
import { createGitHubContentLiveLoader } from "./features/admin/_lib/github";

const liveBlog = defineLiveCollection({
	loader: createGitHubContentLiveLoader({
		basePath: "content",
	}),
});

export const collections = {
	liveBlog,
};
