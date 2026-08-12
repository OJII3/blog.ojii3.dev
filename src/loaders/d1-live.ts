import type { LiveLoader } from "astro/loaders";
import { type ContentEnv, createContentDb } from "../db/client";
import type { ContentPost } from "../lib/content/types";

type ContentDb = ReturnType<typeof createContentDb>;
type MarkdownProcessor = {
	render: (content: string, slug: string) => Promise<{ html: string }>;
};
export type D1LiveLoaderDatabase = ContentDb;
export type D1LiveLoaderEnvironment = Pick<ContentEnv, "DB" | "MEDIA_BASE_URL">;

type ListPostsFn = (
	db: ContentDb,
	opts: { includeDrafts: boolean },
) => Promise<ContentPost[]>;
type GetPostFn = (db: ContentDb, slug: string) => Promise<ContentPost | null>;
type CreateMarkdownProcessorFn = (opts: {
	mediaBaseUrl: string;
}) => MarkdownProcessor;

export type D1LiveLoaderOptions = {
	getEnv?: () => D1LiveLoaderEnvironment | Promise<D1LiveLoaderEnvironment>;
	getDb?: (env: D1LiveLoaderEnvironment) => D1LiveLoaderDatabase;
	deps?: {
		listPosts: ListPostsFn;
		getPost: GetPostFn;
		createMarkdownProcessor: CreateMarkdownProcessorFn;
	};
};

export type D1EntryData = {
	path: string;
	content: string;
	html: string;
	title: string;
	date: Date;
	dateString: string;
	draft: boolean;
	tags: string[];
	revision: number;
};

async function getDefaultListPosts(): Promise<ListPostsFn> {
	const mod = await import("../lib/content/repository");
	return mod.listPosts;
}

async function getDefaultGetPost(): Promise<GetPostFn> {
	const mod = await import("../lib/content/repository");
	return mod.getPost;
}

async function getDefaultCreateMarkdownProcessor(): Promise<CreateMarkdownProcessorFn> {
	const mod = await import("../lib/content/markdown");
	return mod.createContentMarkdownProcessor;
}

const getWorkerEnv = async (): Promise<D1LiveLoaderEnvironment> => {
	const { env } = await import("cloudflare:workers");
	return env as unknown as D1LiveLoaderEnvironment;
};

const toEntryData = async (
	post: ContentPost,
	processor: MarkdownProcessor,
	renderHtml = true,
): Promise<{ id: string; data: D1EntryData }> => {
	const html = renderHtml
		? (await processor.render(post.body, post.slug)).html
		: "";
	return {
		id: post.slug,
		data: {
			path: post.slug,
			content: post.body,
			html,
			title: post.title,
			date: post.date,
			dateString: post.dateString,
			draft: post.draft,
			tags: post.tags,
			revision: post.revision,
		},
	};
};

export function d1LiveLoader(
	options: D1LiveLoaderOptions = {},
): LiveLoader<D1EntryData, { id: string }, never, Error> {
	return {
		name: "d1-live-loader",
		loadCollection: async () => {
			const env = await (options.getEnv?.() ?? getWorkerEnv());
			const db = options.getDb?.(env) ?? createContentDb(env);
			const mediaBaseUrl = env.MEDIA_BASE_URL;

			const listPosts =
				options.deps?.listPosts ?? (await getDefaultListPosts());
			const createMarkdownProcessor =
				options.deps?.createMarkdownProcessor ??
				(await getDefaultCreateMarkdownProcessor());

			const processor = createMarkdownProcessor({ mediaBaseUrl });
			const posts = await listPosts(db, { includeDrafts: true });

			const entries = await Promise.all(
				posts.map((post) => toEntryData(post, processor, false)),
			);

			return { entries };
		},
		loadEntry: async ({ filter }) => {
			const env = await (options.getEnv?.() ?? getWorkerEnv());
			const db = options.getDb?.(env) ?? createContentDb(env);
			const mediaBaseUrl = env.MEDIA_BASE_URL;

			const getPost = options.deps?.getPost ?? (await getDefaultGetPost());
			const createMarkdownProcessor =
				options.deps?.createMarkdownProcessor ??
				(await getDefaultCreateMarkdownProcessor());

			const processor = createMarkdownProcessor({ mediaBaseUrl });
			const post = await getPost(db, filter.id);

			if (!post) return undefined;

			return toEntryData(post, processor);
		},
	};
}
