import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { LiveLoader } from "astro/loaders";
import { repoLabel } from "./client";
import { type ContentClient, createContentClientFromToken } from "./content";
import type { GitHubContentItem } from "./types";

type LiveLoaderOptions = {
	owner: string;
	repo: string;
	ref?: string;
	pattern: string;
	basePath: string;
};

type EntryData = {
	id: string;
	path: string;
	sha: string;
	content: string;
	htmlUrl?: string;
	html: string;
	title: string;
	date: Date;
	dateString: string;
	draft?: boolean;
	tags?: string[];
};

type EntryFilter = { id: string; token?: string };
type CollectionFilter = { prefix?: string; token?: string };

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | null =
	null;
const getProcessor = async () => {
	if (processor) return processor;
	processor = await createMarkdownProcessor({ syntaxHighlight: false });
	return processor;
};

const toEntryId = (fullPath: string, basePath: string) =>
	fullPath
		.replace(new RegExp(`^${basePath}/`), "")
		.replace(/\/README\.md$/i, "")
		.replace(/\.md$/i, "");

const buildEntries = async (
	client: ContentClient,
	items: GitHubContentItem[],
	basePath: string,
) => {
	const processor = await getProcessor();
	const entries = await Promise.all(
		items.map(async (item) => {
			try {
				const file = await client.getFile({ path: item.path });

				const rendered = await processor.render(file.content);
				const frontmatter = rendered.metadata?.frontmatter as Record<
					string,
					unknown
				>;
				const id = toEntryId(item.path, basePath);

				// TODO: Use Zod for validation
				const title = (frontmatter?.title as string) || "No Title";
				const dateString =
					(frontmatter?.date as string) || new Date().toISOString();
				const date = new Date(dateString);
				const tags = (frontmatter?.tags as string[]) || [];
				const draft = (frontmatter?.draft as boolean) || false;

				return {
					id,
					data: {
						id,
						path: item.path,
						sha: file.sha,
						content: file.content,
						htmlUrl: file.htmlUrl ?? undefined,
						html: rendered.code,
						title,
						date,
						dateString,
						tags,
						draft,
					},
					cacheHint: {
						tags: [repoLabel, item.path],
					},
				};
			} catch (_e) {
				return undefined;
			}
		}),
	);

	return entries.filter(
		(entry): entry is NonNullable<typeof entry> => entry !== undefined,
	);
};

export const githubLiveLoader = (
	options: LiveLoaderOptions,
): LiveLoader<EntryData, EntryFilter, CollectionFilter, Error> => {
	const { pattern, basePath } = options;

	return {
		name: "github-live-loader",
		loadCollection: async ({ filter }) => {
			const token = filter?.token;
			const client = createContentClientFromToken(token);

			const files = await client.globFiles({
				pattern,
			});

			const entries = await buildEntries(client, files, basePath);
			return {
				entries,
				cacheHint: {
					tags: [repoLabel],
				},
			};
		},

		loadEntry: async ({ filter }) => {
			const token = filter.token;
			const client = createContentClientFromToken(token);

			const id = filter.id;
			// Since we don't have a direct map from ID to path, we glob all files and match.
			// This is inefficient but functional for now.
			const files = await client.globFiles({
				pattern,
			});

			const matchedItem = files.find(
				(item) => toEntryId(item.path, basePath) === id,
			);

			if (!matchedItem) throw new Error(`Entry not found: ${id}`);

			const entries = await buildEntries(client, [matchedItem], basePath);
			if (!entries[0]) throw new Error(`Entry not found: ${id}`);
			return entries[0];
		},
	};
};
