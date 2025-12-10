import type { LiveLoader } from "astro/loaders";
import { repoLabel } from "./client";
import { type ContentClient, createContentClientFromToken } from "./content";

type LiveLoaderOptions = {
	basePath?: string;
};

type EntryData = {
	path: string;
	sha: string;
	content: string;
	htmlUrl?: string;
};

type EntryFilter = { id: string; token?: string };
type CollectionFilter = { prefix?: string; token?: string };

const README_NAME = "README.md";
const DEFAULT_BASE_PATH = "content";

const normalizeBasePath = (path: string | undefined) => {
	const cleaned = (path ?? DEFAULT_BASE_PATH)
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
	return cleaned.length === 0 ? DEFAULT_BASE_PATH : cleaned;
};

const toEntryId = (fullPath: string, basePath: string) =>
	fullPath
		.replace(new RegExp(`^${basePath}/`), "")
		.replace(/\/README\.md$/i, "")
		.replace(/\.md$/i, "");

const ensureLeadingBase = (basePath: string, suffix?: string) =>
	suffix ? `${basePath}/${suffix}` : basePath;

const resolveToken = (token?: string) =>
	token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? undefined;

const buildEntries = async (
	client: ContentClient,
	basePath: string,
	paths: string[],
) => {
	const entries = await Promise.all(
		paths.map(async (path) => {
			const file = await client.getFile({ path });
			if (file.status === "error") return undefined;

			return {
				id: toEntryId(path, basePath),
				data: {
					path,
					sha: file.data.sha,
					content: file.data.content,
					htmlUrl: file.data.htmlUrl ?? undefined,
				},
				cacheHint: {
					tags: [repoLabel, path],
				},
			};
		}),
	);

	return entries.filter(
		(entry): entry is NonNullable<(typeof entries)[number]> =>
			entry !== undefined,
	);
};

export const githubLiveLoader = (
	options?: LiveLoaderOptions,
): LiveLoader<EntryData, EntryFilter, CollectionFilter> => {
	const basePath = normalizeBasePath(options?.basePath);

	return {
		name: "github-live-loader",

		loadCollection: async ({ filter }) => {
			const token = resolveToken(filter?.token);
			const clientResult = createContentClientFromToken(token);
			if (clientResult.status === "error") {
				return { error: new Error(clientResult.message) };
			}

			const rootPath = ensureLeadingBase(basePath, filter?.prefix);
			const root = await clientResult.data.listRepoPath(rootPath);
			if (root.status === "error") return { error: new Error(root.message) };

			const readmePaths = root.data
				.map((item) => {
					if (
						item.type === "file" &&
						item.name.toLowerCase() === README_NAME.toLowerCase()
					) {
						return item.path;
					}
					if (item.type === "dir") {
						return `${item.path}/${README_NAME}`;
					}
					return null;
				})
				.filter((path): path is string => !!path);

			const entries = await buildEntries(
				clientResult.data,
				basePath,
				readmePaths,
			);
			return {
				entries,
				cacheHint: {
					tags: [repoLabel],
				},
			};
		},

		loadEntry: async ({ filter }) => {
			const token =
				typeof filter === "string" ? undefined : (filter.token ?? undefined);
			const clientResult = createContentClientFromToken(token);
			if (clientResult.status === "error") {
				return { error: new Error(clientResult.message) };
			}

			const id = typeof filter === "string" ? filter : filter.id;
			const path = `${basePath}/${id}/${README_NAME}`;
			const entries = await buildEntries(clientResult.data, basePath, [path]);
			return entries[0] ?? { error: new Error(`Entry not found: ${id}`) };
		},
	};
};
