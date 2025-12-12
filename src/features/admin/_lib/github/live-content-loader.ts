import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { LiveLoader } from "astro/loaders";
import { repoLabel } from "./client";
import { type ContentClient, createContentClientFromToken } from "./content";
import type { GitHubContentItem } from "./types";

type LiveLoaderOptions = {
	owner: string;
	repo: string;
	ref?: string;
	filename: string;
	basePath: string;
};

type EntryData = {
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

				// バリデーションはスキーマ側で行うので、ここでは最低限の型変換のみ行う.
				const title = (frontmatter?.title as string) || "No Title";
				const dateString =
					(frontmatter?.date as string) || new Date().toISOString();
				const date = new Date(dateString);
				const tags = (frontmatter?.tags as string[]) || [];
				const draft = (frontmatter?.draft as boolean) || false;

				return {
					id,
					data: {
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
	const { filename, basePath } = options;

	return {
		name: "github-live-loader",
		loadCollection: async ({ filter }) => {
			const token = filter?.token;
			const client = createContentClientFromToken(token);

			const dirs = await client.listRepoPath(basePath);

			// Construct file paths for each directory
			const files: GitHubContentItem[] = dirs
				.filter((item) => item.type === "dir")
				.map((item) => ({
					type: "file",
					path: `${item.path}/${filename}`,
					name: filename,
					sha: "", // sha is not known yet, but getFile will fetch it
				}));

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
			const path = `${basePath}/${id}/${filename}`;

			const item: GitHubContentItem = {
				type: "file",
				path,
				name: filename,
				sha: "",
			};

			const entries = await buildEntries(client, [item], basePath);
			if (!entries[0]) throw new Error(`Entry not found: ${id}`);
			return entries[0];
		},
	};
};
