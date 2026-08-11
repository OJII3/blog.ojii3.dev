import type { LiveLoader } from "astro/loaders";
import graymatter from "gray-matter";
import { createContentMarkdownProcessor } from "../../../../lib/content/markdown";
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

const buildGitHubRawBaseUrl = (
	owner: string,
	repo: string,
	ref: string = "main",
): string => {
	return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}`;
};

let processor: ReturnType<typeof createContentMarkdownProcessor> | null = null;
let processorMediaBaseUrl: string | null = null;

const getProcessor = (mediaBaseUrl: string) => {
	if (processor && processorMediaBaseUrl === mediaBaseUrl) return processor;
	processor = createContentMarkdownProcessor({
		mediaBaseUrl,
	});
	processorMediaBaseUrl = mediaBaseUrl;
	return processor;
};

const toEntryId = (fullPath: string, basePath: string) => {
	const withoutBase = basePath
		? fullPath.replace(new RegExp(`^${basePath}/`), "")
		: fullPath;
	return withoutBase.replace(/\/README\.md$/i, "").replace(/\.md$/i, "");
};

const buildEntries = async (
	client: ContentClient,
	items: GitHubContentItem[],
	basePath: string,
	mediaBaseUrl: string,
) => {
	const processor = getProcessor(mediaBaseUrl);
	const entries = await Promise.all(
		items.map(async (item) => {
			try {
				const file = await client.getFile({ path: item.path });
				const { data, content } = graymatter(file.content);
				const id = toEntryId(item.path, basePath);
				const result = await processor.render(content, id);
				const html = result.html;

				// バリデーションはスキーマ側で行うので、ここでは最低限の型変換のみ行う.
				const title = (data?.title as string) || "No Title";

				const rawDate = data?.date;
				const dateObj = rawDate
					? new Date(rawDate as string | number | Date)
					: new Date();
				const date = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
				const dateString = date.toISOString().split("T")[0];

				const tags = (data?.tags as string[]) || [];
				const draft = (data?.draft as boolean) || false;

				return {
					id,
					data: {
						path: item.path,
						sha: file.sha,
						content: content,
						htmlUrl: file.htmlUrl ?? undefined,
						html,
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
	const { owner, repo, ref, filename, basePath } = options;
	const mediaBaseUrl = buildGitHubRawBaseUrl(owner, repo, ref);

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

			const entries = await buildEntries(client, files, basePath, mediaBaseUrl);
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
			const path = basePath
				? `${basePath}/${id}/${filename}`
				: `${id}/${filename}`;

			const item: GitHubContentItem = {
				type: "file",
				path,
				name: filename,
				sha: "",
			};

			const entries = await buildEntries(
				client,
				[item],
				basePath,
				mediaBaseUrl,
			);
			if (!entries[0]) throw new Error(`Entry not found: ${id}`);
			return entries[0];
		},
	};
};
