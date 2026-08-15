ALTER TABLE `posts` ADD `rendered_html` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE INDEX `posts_published_order_idx` ON `posts` (`draft`, `date`, `slug`);
