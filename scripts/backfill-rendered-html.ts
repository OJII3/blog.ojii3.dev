#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { createContentMarkdownProcessor } from "../src/lib/content/markdown";
import {
	BunCommandRunner,
	type CommandRunner,
	escapeSqlString,
	executeSqlFile,
} from "./migrate-content-writer";

type BackfillPost = {
	slug: string;
	body: string;
};

type WranglerResult = {
	results?: BackfillPost[];
};

function parseRows(stdout: string): BackfillPost[] {
	try {
		const parsed = JSON.parse(stdout) as WranglerResult | WranglerResult[];
		const result = Array.isArray(parsed) ? parsed[0] : parsed;
		return (result?.results ?? []).filter(
			(row): row is BackfillPost =>
				typeof row.slug === "string" && typeof row.body === "string",
		);
	} catch {
		throw new Error(`Failed to parse D1 response: ${stdout}`);
	}
}

async function fetchPosts(
	isRemote: boolean,
	runner: CommandRunner,
): Promise<BackfillPost[]> {
	const locationFlag = isRemote ? "--remote" : "--local";
	const result = await runner.run([
		"bun",
		"wrangler",
		"d1",
		"execute",
		"blog-content",
		locationFlag,
		"--command",
		"SELECT slug, body FROM posts WHERE rendered_html = ''",
		"--json",
	]);

	if (result.exitCode !== 0) {
		throw new Error(`Failed to query posts: ${result.stderr}`);
	}

	return parseRows(result.stdout);
}

export async function generateBackfillSql(
	posts: BackfillPost[],
	mediaBaseUrl: string,
): Promise<string> {
	const processor = createContentMarkdownProcessor({ mediaBaseUrl });
	const statements: string[] = [];

	for (const post of posts) {
		const rendered = await processor.render(post.body, post.slug);
		statements.push(
			`UPDATE posts SET rendered_html = '${escapeSqlString(rendered.html)}' WHERE slug = '${escapeSqlString(post.slug)}' AND rendered_html = '';`,
		);
	}

	return statements.join("\n");
}

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		remote: { type: "boolean" },
		"dry-run": { type: "boolean" },
	},
	strict: true,
});

const isRemote = values.remote ?? false;
const isDryRun = values["dry-run"] ?? false;
const mediaBaseUrl =
	process.env.MEDIA_BASE_URL ?? "https://media.blog.ojii3.dev";
const runner = new BunCommandRunner();
const posts = await fetchPosts(isRemote, runner);

console.log(`Posts to backfill: ${posts.length}`);
console.log(`Remote: ${isRemote ? "enabled" : "disabled"}`);

if (isDryRun || posts.length === 0) process.exit(0);

const sql = await generateBackfillSql(posts, mediaBaseUrl);
const result = await executeSqlFile(sql, isRemote, runner);

if (result.exitCode !== 0) {
	console.error(result.stderr);
	process.exit(result.exitCode);
}

console.log("Rendered HTML backfill completed.");
