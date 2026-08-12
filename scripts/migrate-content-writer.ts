import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
	ArticleImage,
	ParsedArticle,
	ParseResult,
} from "./migrate-content-lib";

export interface CommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface CommandRunner {
	run(args: string[]): Promise<CommandResult>;
}

export class BunCommandRunner implements CommandRunner {
	async run(args: string[]): Promise<CommandResult> {
		const proc = Bun.spawn({
			cmd: args,
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		return { exitCode, stdout, stderr };
	}
}

export interface WriteResult {
	inserted: number;
	updated: number;
	conflicts: string[];
	imagesUploaded: number;
	imagesSkipped: string[];
	failedImages: { key: string; error: string }[];
}

export function escapeSqlString(value: string): string {
	return value.replace(/'/g, "''");
}

function sqlStr(value: string): string {
	return `'${escapeSqlString(value)}'`;
}

function sqlBool(value: boolean): string {
	return value ? "1" : "0";
}

function sqlInt(value: number): string {
	return String(value);
}

export async function fetchExistingBodies(
	slugs: string[],
	isRemote: boolean,
	runner: CommandRunner,
): Promise<Map<string, string>> {
	const result = new Map<string, string>();
	if (slugs.length === 0) return result;

	const slugList = slugs.map((s) => sqlStr(s)).join(", ");
	const sql = `SELECT slug, body FROM posts WHERE slug IN (${slugList})`;
	const locationFlag = isRemote ? "--remote" : "--local";

	const cmdResult = await runner.run([
		"bun",
		"wrangler",
		"d1",
		"execute",
		"blog-content",
		locationFlag,
		"--command",
		sql,
		"--json",
	]);

	if (cmdResult.exitCode !== 0) {
		throw new Error(`Failed to query existing posts: ${cmdResult.stderr}`);
	}

	try {
		const parsed = JSON.parse(cmdResult.stdout);
		const rows: Array<{ slug?: string; body?: string }> = Array.isArray(parsed)
			? (parsed[0]?.results ?? [])
			: (parsed?.results ?? []);
		for (const row of rows) {
			if (row.slug && typeof row.body === "string") {
				result.set(row.slug, row.body);
			}
		}
	} catch {
		throw new Error(`Failed to parse D1 response: ${cmdResult.stdout}`);
	}

	return result;
}

export function generateSql(
	articles: ParsedArticle[],
	existingBodies: Map<string, string>,
	now: number,
): string {
	const statements: string[] = [];

	for (const article of articles) {
		if (article.status !== "valid") continue;

		const { slug, frontmatter, body } = article;
		const isUpdate = existingBodies.has(slug);

		if (isUpdate) {
			statements.push(
				`UPDATE posts SET title = ${sqlStr(frontmatter.title)}, date = ${sqlStr(frontmatter.date)}, draft = ${sqlBool(frontmatter.draft)}, updated_at = ${sqlInt(now)} WHERE slug = ${sqlStr(slug)};`,
			);
			statements.push(
				`DELETE FROM post_tags WHERE post_slug = ${sqlStr(slug)};`,
			);
		} else {
			statements.push(
				`INSERT INTO posts (slug, title, date, draft, body, revision, created_at, updated_at) VALUES (${sqlStr(slug)}, ${sqlStr(frontmatter.title)}, ${sqlStr(frontmatter.date)}, ${sqlBool(frontmatter.draft)}, ${sqlStr(body)}, 1, ${sqlInt(now)}, ${sqlInt(now)});`,
			);
		}

		for (const tag of frontmatter.tags) {
			statements.push(
				`INSERT OR IGNORE INTO tags (name) VALUES (${sqlStr(tag)});`,
			);
			statements.push(
				`INSERT INTO post_tags (post_slug, tag_name) VALUES (${sqlStr(slug)}, ${sqlStr(tag)});`,
			);
		}
	}

	if (statements.length === 0) return "";
	return statements.join("\n");
}

export async function executeSqlFile(
	sql: string,
	isRemote: boolean,
	runner: CommandRunner,
): Promise<CommandResult> {
	const tmpDir = await mkdtemp(join(tmpdir(), "migrate-sql-"));
	const sqlFile = join(tmpDir, "migration.sql");

	try {
		await writeFile(sqlFile, sql, "utf-8");

		const locationFlag = isRemote ? "--remote" : "--local";
		const result = await runner.run([
			"bun",
			"wrangler",
			"d1",
			"execute",
			"blog-content",
			locationFlag,
			"--file",
			sqlFile,
			"--yes",
		]);

		if (result.exitCode !== 0) {
			throw new Error(`D1 execution failed: ${result.stderr}`);
		}

		return result;
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

export async function r2ObjectExists(
	r2Key: string,
	isRemote: boolean,
	runner: CommandRunner,
): Promise<boolean> {
	const tmpDir = await mkdtemp(join(tmpdir(), "r2-check-"));
	const outputFile = join(tmpDir, "object");

	try {
		const locationFlag = isRemote ? "--remote" : "--local";
		const result = await runner.run([
			"bun",
			"wrangler",
			"r2",
			"object",
			"get",
			r2Key,
			locationFlag,
			"--file",
			outputFile,
		]);

		if (result.exitCode === 0) return true;

		const error = `${result.stderr}\n${result.stdout}`.toLowerCase();
		if (error.includes("does not exist") || error.includes("not found")) {
			return false;
		}

		throw new Error(`Failed to check R2 object ${r2Key}: ${result.stderr}`);
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

export async function uploadImage(
	sourceDir: string,
	slug: string,
	image: ArticleImage,
	isRemote: boolean,
	runner: CommandRunner,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
	const sourcePath = join(sourceDir, slug, image.relativePath);
	const r2Key = `blog-media/${image.r2Key}`;

	if (await r2ObjectExists(r2Key, isRemote, runner)) {
		return { success: true, skipped: true };
	}

	const locationFlag = isRemote ? "--remote" : "--local";
	const result = await runner.run([
		"bun",
		"wrangler",
		"r2",
		"object",
		"put",
		r2Key,
		"--file",
		sourcePath,
		"--content-type",
		image.mimeType,
		locationFlag,
		"--force",
	]);

	if (result.exitCode !== 0) {
		return { success: false, error: result.stderr || "Unknown error" };
	}
	return { success: true, skipped: false };
}

export async function writeArticles(
	sourceDir: string,
	parseResult: ParseResult,
	isRemote: boolean,
	runner: CommandRunner,
): Promise<WriteResult> {
	const validArticles = parseResult.articles.filter(
		(a) => a.status === "valid",
	);
	const slugs = validArticles.map((a) => a.slug);

	const existingBodies = await fetchExistingBodies(slugs, isRemote, runner);

	const conflicts: string[] = [];
	const toProcess: ParsedArticle[] = [];

	for (const article of validArticles) {
		const existingBody = existingBodies.get(article.slug);
		if (existingBody !== undefined && existingBody !== article.body) {
			conflicts.push(article.slug);
		} else {
			toProcess.push(article);
		}
	}

	if (conflicts.length > 0) {
		return {
			inserted: 0,
			updated: 0,
			conflicts,
			imagesUploaded: 0,
			imagesSkipped: [],
			failedImages: [],
		};
	}

	let imagesUploaded = 0;
	const imagesSkipped: string[] = [];
	const failedImages: { key: string; error: string }[] = [];

	for (const article of toProcess) {
		for (const image of article.images) {
			if (existingBodies.has(article.slug)) {
				imagesSkipped.push(image.r2Key);
				continue;
			}

			const imgResult = await uploadImage(
				sourceDir,
				article.slug,
				image,
				isRemote,
				runner,
			);
			if (imgResult.success && imgResult.skipped) {
				imagesSkipped.push(image.r2Key);
			} else if (imgResult.success) {
				imagesUploaded++;
			} else {
				failedImages.push({
					key: image.r2Key,
					error: imgResult.error ?? "Unknown error",
				});
			}
		}
	}

	if (failedImages.length > 0) {
		return {
			inserted: 0,
			updated: 0,
			conflicts,
			imagesUploaded,
			imagesSkipped,
			failedImages,
		};
	}

	const now = Date.now();
	const sql = generateSql(toProcess, existingBodies, now);

	if (sql.trim().length > 0) {
		await executeSqlFile(sql, isRemote, runner);
	}

	let inserted = 0;
	let updated = 0;
	for (const article of toProcess) {
		if (existingBodies.has(article.slug)) {
			updated++;
		} else {
			inserted++;
		}
	}

	return {
		inserted,
		updated,
		conflicts,
		imagesUploaded,
		imagesSkipped,
		failedImages,
	};
}
