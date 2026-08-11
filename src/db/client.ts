import { drizzle } from "drizzle-orm/d1";
import { posts, postTags, tags } from "./schema";

export type ContentEnv = {
	DB: D1Database;
	MEDIA: R2Bucket;
	MEDIA_BASE_URL: string;
};

export function createContentDb(env: Pick<ContentEnv, "DB">) {
	return drizzle(env.DB, { schema: { posts, tags, postTags } });
}
