import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { posts, postTags, tags } from "../../db/schema";

const MIGRATION_SQL = `
CREATE TABLE posts (
	\`slug\` text PRIMARY KEY NOT NULL,
	\`title\` text NOT NULL,
	\`date\` text NOT NULL,
	\`draft\` integer DEFAULT false NOT NULL,
	\`body\` text NOT NULL,
	\`revision\` integer DEFAULT 1 NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
CREATE TABLE tags (\`name\` text PRIMARY KEY NOT NULL);
CREATE TABLE \`post_tags\` (
	\`post_slug\` text NOT NULL,
	\`tag_name\` text NOT NULL,
	PRIMARY KEY(\`post_slug\`, \`tag_name\`),
	FOREIGN KEY (\`post_slug\`) REFERENCES \`posts\`(\`slug\`),
	FOREIGN KEY (\`tag_name\`) REFERENCES \`tags\`(\`name\`)
);
`;

export type TestDb = ReturnType<typeof createTestDb>;

export function createTestDb() {
	const sqlite = new Database(":memory:");
	sqlite.exec(MIGRATION_SQL);
	return drizzle(sqlite, { schema: { posts, tags, postTags } });
}
