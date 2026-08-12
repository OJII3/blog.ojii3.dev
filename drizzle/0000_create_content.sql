CREATE TABLE `post_tags` (
	`post_slug` text NOT NULL,
	`tag_name` text NOT NULL,
	PRIMARY KEY(`post_slug`, `tag_name`),
	FOREIGN KEY (`post_slug`) REFERENCES `posts`(`slug`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_name`) REFERENCES `tags`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`draft` integer DEFAULT false NOT NULL,
	`body` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL
);
