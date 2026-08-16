import { drizzle } from "drizzle-orm/d1";
import { posts, postTags, tags } from "./schema";

export interface ContentD1Result<T = unknown> {
	results: T[];
	meta: { changes: number };
	success: boolean;
}

export interface ContentD1PreparedStatement {
	bind(...values: unknown[]): ContentD1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<ContentD1Result<T>>;
	run(): Promise<ContentD1Result>;
}

export interface ContentD1Database {
	prepare(sql: string): ContentD1PreparedStatement;
	batch(stmts: ContentD1PreparedStatement[]): Promise<ContentD1Result[]>;
}

export type ContentEnv = {
	ASSETS: Fetcher;
	DB: D1Database;
	MEDIA: R2Bucket;
	MEDIA_BASE_URL: string;
};

export async function getContentEnv(): Promise<ContentEnv> {
	const { env } = await import("cloudflare:workers");
	return env as unknown as ContentEnv;
}

export function createContentDb(env: Pick<ContentEnv, "DB">) {
	return drizzle(env.DB, { schema: { posts, tags, postTags } });
}
