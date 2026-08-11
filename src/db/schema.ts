import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	date: text("date").notNull(),
	draft: integer("draft", { mode: "boolean" }).notNull().default(false),
	body: text("body").notNull(),
	revision: integer("revision").notNull().default(1),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
	name: text("name").primaryKey(),
});

export const postTags = sqliteTable(
	"post_tags",
	{
		postSlug: text("post_slug")
			.notNull()
			.references(() => posts.slug),
		tagName: text("tag_name")
			.notNull()
			.references(() => tags.name),
	},
	(table) => [primaryKey({ columns: [table.postSlug, table.tagName] })],
);
