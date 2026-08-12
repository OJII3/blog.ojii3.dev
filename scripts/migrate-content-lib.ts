import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import matter from "gray-matter";

export interface ArticleFrontmatter {
	title: string;
	date: string;
	tags: string[];
	draft: boolean;
}

export interface ArticleImage {
	relativePath: string;
	r2Key: string;
	mimeType: string;
}

export interface SkippedFile {
	path: string;
	reason: string;
}

export interface ArticleError {
	slug: string;
	message: string;
}

export interface ParsedArticle {
	slug: string;
	frontmatter: ArticleFrontmatter;
	body: string;
	images: ArticleImage[];
	skipped: SkippedFile[];
	status: "valid" | "error";
	error?: string;
}

export interface ParseResult {
	articles: ParsedArticle[];
	validCount: number;
	insertCandidateCount: number;
	imageCount: number;
	skippedCount: number;
	errors: ArticleError[];
	duplicates: string[];
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".svg",
]);

const MIME_TYPES: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
};

const SLUG_PATTERN = /^(\d{4}-\d{2}-\d{2})-\d+$/;

function isWithinRoot(path: string, root: string): boolean {
	return path === root || path.startsWith(`${root}${sep}`);
}

function validateDate(dateStr: string): boolean {
	const datePattern = /^\d{4}-\d{2}-\d{2}$/;
	if (!datePattern.test(dateStr)) {
		return false;
	}
	const [yearStr, monthStr, dayStr] = dateStr.split("-");
	const year = Number.parseInt(yearStr, 10);
	const month = Number.parseInt(monthStr, 10);
	const day = Number.parseInt(dayStr, 10);

	if (month < 1 || month > 12) {
		return false;
	}
	if (day < 1 || day > 31) {
		return false;
	}

	const date = new Date(`${yearStr}-${monthStr}-${dayStr}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) {
		return false;
	}
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() + 1 === month &&
		date.getUTCDate() === day
	);
}

function normalizeDate(date: unknown): string {
	if (date instanceof Date) {
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, "0");
		const day = String(date.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}
	if (typeof date === "string") {
		return date;
	}
	if (typeof date === "number") {
		const d = new Date(date);
		const year = d.getUTCFullYear();
		const month = String(d.getUTCMonth() + 1).padStart(2, "0");
		const day = String(d.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}
	return String(date);
}

function normalizeTags(tags: unknown): string[] | null {
	if (tags === undefined) return [];

	const values = Array.isArray(tags) ? tags : [tags];
	if (!values.every((tag) => typeof tag === "string")) return null;

	return [
		...new Set(values.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
	];
}

function getMimeType(filePath: string): string | null {
	const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
	if (!ext) return null;
	return MIME_TYPES[ext] ?? null;
}

function isSupportedImage(filePath: string): boolean {
	const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
	if (!ext) return false;
	return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
}

async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await lstat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

async function walkDir(
	dir: string,
	basePath: string,
	sourceRoot: string,
): Promise<string[]> {
	const files: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		const relativePath = relative(basePath, fullPath).split(sep).join("/");
		const linkInfo = await lstat(fullPath);
		if (linkInfo.isSymbolicLink()) {
			const target = await realpath(fullPath).catch(() => null);
			if (!target || !isWithinRoot(target, sourceRoot)) continue;
			continue;
		}

		const realPath = await stat(fullPath).then(
			(s) => s,
			() => null,
		);
		if (!realPath) continue;

		const resolvedPath = resolve(fullPath);
		const resolvedSource = resolve(sourceRoot);
		if (!isWithinRoot(resolvedPath, resolvedSource)) {
			continue;
		}

		if (realPath.isDirectory()) {
			const subFiles = await walkDir(fullPath, basePath, sourceRoot);
			files.push(...subFiles);
		} else if (realPath.isFile()) {
			files.push(relativePath);
		}
	}

	return files;
}

async function parseArticle(
	articleDir: string,
	sourceRoot: string,
): Promise<ParsedArticle> {
	const slug = basename(articleDir);
	const readmePath = join(articleDir, "README.md");

	if (!(await fileExists(readmePath))) {
		return {
			slug,
			frontmatter: { title: "", date: "", tags: [], draft: false },
			body: "",
			images: [],
			skipped: [],
			status: "error",
			error: "README.md not found",
		};
	}

	let content: string;
	try {
		content = await readFile(readmePath, "utf-8");
	} catch (e) {
		return {
			slug,
			frontmatter: { title: "", date: "", tags: [], draft: false },
			body: "",
			images: [],
			skipped: [],
			status: "error",
			error: `Failed to read README.md: ${e instanceof Error ? e.message : String(e)}`,
		};
	}

	let parsed: matter.GrayMatterFile<string>;
	try {
		parsed = matter(content);
	} catch (e) {
		return {
			slug,
			frontmatter: { title: "", date: "", tags: [], draft: false },
			body: "",
			images: [],
			skipped: [],
			status: "error",
			error: `Failed to parse frontmatter: ${e instanceof Error ? e.message : String(e)}`,
		};
	}

	const fm = parsed.data;
	const title = typeof fm.title === "string" ? fm.title : "";
	const dateRaw = normalizeDate(fm.date);
	const date = dateRaw;
	const tags = normalizeTags(fm.tags);
	const draft = fm.draft === undefined ? false : fm.draft;

	const slugDate = SLUG_PATTERN.exec(slug)?.[1] ?? "";
	if (tags === null) {
		return {
			slug,
			frontmatter: { title, date, tags: [], draft: false },
			body: parsed.content,
			images: [],
			skipped: [],
			status: "error",
			error: "Invalid tags value",
		};
	}

	if (!title) {
		return {
			slug,
			frontmatter: { title, date, tags, draft },
			body: parsed.content,
			images: [],
			skipped: [],
			status: "error",
			error: "Missing title",
		};
	}

	if (typeof draft !== "boolean") {
		return {
			slug,
			frontmatter: { title, date, tags, draft: false },
			body: parsed.content,
			images: [],
			skipped: [],
			status: "error",
			error: "Invalid draft value",
		};
	}

	if (!validateDate(date) || !validateDate(slugDate)) {
		return {
			slug,
			frontmatter: { title, date, tags, draft },
			body: parsed.content,
			images: [],
			skipped: [],
			status: "error",
			error: `Invalid date: ${date}`,
		};
	}

	if (date !== slugDate) {
		return {
			slug,
			frontmatter: { title, date, tags, draft },
			body: parsed.content,
			images: [],
			skipped: [],
			status: "error",
			error: "Slug date does not match frontmatter date",
		};
	}

	let allFiles: string[];
	try {
		allFiles = await walkDir(articleDir, articleDir, sourceRoot);
	} catch (error) {
		return {
			slug,
			frontmatter: { title, date, tags, draft },
			body: parsed.content,
			images: [],
			skipped: [],
			status: "error",
			error: `Failed to enumerate files: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
	const images: ArticleImage[] = [];
	const skipped: SkippedFile[] = [];

	for (const relPath of allFiles) {
		if (relPath === "README.md") continue;

		const fullPath = join(articleDir, relPath);
		const resolvedPath = resolve(fullPath);
		const resolvedSource = resolve(sourceRoot);

		if (!isWithinRoot(resolvedPath, resolvedSource)) {
			skipped.push({ path: relPath, reason: "Path traversal detected" });
			continue;
		}

		if (isSupportedImage(relPath)) {
			const mimeType = getMimeType(relPath);
			if (mimeType) {
				const r2Key = `${slug}/${relPath}`;
				images.push({ relativePath: relPath, r2Key, mimeType });
			} else {
				skipped.push({
					path: relPath,
					reason: "Could not determine MIME type",
				});
			}
		} else {
			skipped.push({ path: relPath, reason: "Unsupported file type" });
		}
	}

	return {
		slug,
		frontmatter: { title, date, tags, draft },
		body: parsed.content,
		images,
		skipped,
		status: "valid",
	};
}

export async function parseArticles(sourceDir: string): Promise<ParseResult> {
	const resolvedSource = await realpath(resolve(sourceDir));
	const entries = await readdir(resolvedSource, { withFileTypes: true });

	const articleDirs: string[] = [];
	const errors: ArticleError[] = [];
	const articleDirectoryPattern = /^\d{4}-\d{2}-\d{2}-.+$/;
	for (const entry of entries) {
		if (!articleDirectoryPattern.test(entry.name)) continue;
		if (!entry.isDirectory() || !SLUG_PATTERN.test(entry.name)) {
			errors.push({
				slug: entry.name,
				message: "Invalid article directory name",
			});
			continue;
		}
		articleDirs.push(join(resolvedSource, entry.name));
	}

	const articles: ParsedArticle[] = [];
	const duplicates: string[] = [];
	const seenSlugs = new Set<string>();

	for (const dir of articleDirs) {
		const article = await parseArticle(dir, resolvedSource);

		if (seenSlugs.has(article.slug)) {
			duplicates.push(article.slug);
		} else {
			seenSlugs.add(article.slug);
		}

		if (article.status === "error") {
			errors.push({
				slug: article.slug,
				message: article.error ?? "Unknown error",
			});
		}

		articles.push(article);
	}

	const validArticles = articles.filter((a) => a.status === "valid");
	const insertCandidates = validArticles;
	const imageCount = articles.reduce((sum, a) => sum + a.images.length, 0);
	const skippedCount = articles.reduce((sum, a) => sum + a.skipped.length, 0);

	return {
		articles,
		validCount: validArticles.length,
		insertCandidateCount: insertCandidates.length,
		imageCount,
		skippedCount,
		errors,
		duplicates,
	};
}
