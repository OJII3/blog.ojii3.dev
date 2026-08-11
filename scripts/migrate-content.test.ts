import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArticles } from "./migrate-content-lib";

let tempDir: string;

beforeAll(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "migrate-content-test-"));

	const article1Dir = join(tempDir, "2025-01-15-0");
	await mkdir(article1Dir);
	await writeFile(
		join(article1Dir, "README.md"),
		`---
title: Test Article 1
date: 2025-01-15
tags: [test, example]
draft: false
---
This is the body of article 1.`,
	);
	await mkdir(join(article1Dir, "images"));
	await writeFile(join(article1Dir, "images", "photo.jpg"), "fake image data");
	await writeFile(join(article1Dir, "thumbnail.png"), "fake png data");

	const article2Dir = join(tempDir, "2025-02-20-1");
	await mkdir(article2Dir);
	await writeFile(
		join(article2Dir, "README.md"),
		`---
title: Draft Article
date: 2025-02-20
tags:
  - draft
draft: true
---
This is a draft article.`,
	);
	await writeFile(join(article2Dir, "screenshot.webp"), "fake webp data");
	await writeFile(join(article2Dir, "data.json"), '{"unsupported": true}');

	const invalidDateDir = join(tempDir, "2025-13-45-0");
	await mkdir(invalidDateDir);
	await writeFile(
		join(invalidDateDir, "README.md"),
		`---
title: Invalid Date Article
date: 2025-13-45
---
Invalid date.`,
	);

	const noReadmeDir = join(tempDir, "2025-03-10-0");
	await mkdir(noReadmeDir);
	await writeFile(join(noReadmeDir, "other.txt"), "no readme here");

	const whitespaceDir = join(tempDir, "2025-04-01-0");
	await mkdir(whitespaceDir);
	await writeFile(
		join(whitespaceDir, "README.md"),
		`---
title: Whitespace Test
date: 2025-04-01
---
Testing whitespace in filename.`,
	);
	await mkdir(join(whitespaceDir, "my images"));
	await writeFile(
		join(whitespaceDir, "my images", "my photo.jpg"),
		"fake data",
	);

	const nestedDir = join(tempDir, "2025-05-01-0");
	await mkdir(join(nestedDir, "assets", "nested", "deep"), { recursive: true });
	await writeFile(
		join(nestedDir, "README.md"),
		`---
title: Nested Path Test
date: 2025-05-01
---
Testing nested paths.`,
	);
	await writeFile(
		join(nestedDir, "assets", "nested", "deep", "image.png"),
		"fake data",
	);

	const badFrontmatterDir = join(tempDir, "2025-06-01-0");
	await mkdir(badFrontmatterDir);
	await writeFile(
		join(badFrontmatterDir, "README.md"),
		`---
title: Bad Frontmatter
date: not-a-date
---
Bad date format.`,
	);
});

afterAll(async () => {
	if (tempDir) {
		await rm(tempDir, { recursive: true, force: true });
	}
});

describe("parseArticles", () => {
	test("should parse all articles and return correct counts", async () => {
		const result = await parseArticles(tempDir);

		expect(result.articles.length).toBe(7);
		expect(result.validCount).toBe(4);
		expect(result.insertCandidateCount).toBe(4);
		expect(result.errors.length).toBe(3);
		expect(result.duplicates.length).toBe(0);
	});

	test("should correctly parse article with images", async () => {
		const result = await parseArticles(tempDir);
		const article1 = result.articles.find((a) => a.slug === "2025-01-15-0");

		expect(article1).toBeDefined();
		expect(article1?.status).toBe("valid");
		expect(article1?.frontmatter.title).toBe("Test Article 1");
		expect(article1?.frontmatter.date).toBe("2025-01-15");
		expect(article1?.frontmatter.tags).toEqual(["test", "example"]);
		expect(article1?.frontmatter.draft).toBe(false);
		expect(article1?.images.length).toBe(2);

		const jpgImage = article1?.images.find(
			(img) => img.relativePath === "images/photo.jpg",
		);
		expect(jpgImage).toBeDefined();
		expect(jpgImage?.r2Key).toBe("2025-01-15-0/images/photo.jpg");
		expect(jpgImage?.mimeType).toBe("image/jpeg");

		const pngImage = article1?.images.find(
			(img) => img.relativePath === "thumbnail.png",
		);
		expect(pngImage).toBeDefined();
		expect(pngImage?.r2Key).toBe("2025-01-15-0/thumbnail.png");
		expect(pngImage?.mimeType).toBe("image/png");
	});

	test("should handle draft articles", async () => {
		const result = await parseArticles(tempDir);
		const draftArticle = result.articles.find((a) => a.slug === "2025-02-20-1");

		expect(draftArticle).toBeDefined();
		expect(draftArticle?.frontmatter.draft).toBe(true);
		expect(draftArticle?.images.length).toBe(1);
		expect(draftArticle?.skipped.length).toBe(1);
		expect(draftArticle?.skipped[0].path).toBe("data.json");
		expect(draftArticle?.skipped[0].reason).toBe("Unsupported file type");

		expect(result.insertCandidateCount).toBe(result.validCount);
	});

	test("should detect invalid date", async () => {
		const result = await parseArticles(tempDir);
		const invalidDate = result.articles.find((a) => a.slug === "2025-13-45-0");

		expect(invalidDate).toBeDefined();
		expect(invalidDate?.status).toBe("error");
		expect(invalidDate?.error).toContain("Invalid date");

		const error = result.errors.find((e) => e.slug === "2025-13-45-0");
		expect(error).toBeDefined();
	});

	test("should detect missing README.md", async () => {
		const result = await parseArticles(tempDir);
		const noReadme = result.articles.find((a) => a.slug === "2025-03-10-0");

		expect(noReadme).toBeDefined();
		expect(noReadme?.status).toBe("error");
		expect(noReadme?.error).toContain("README.md not found");
	});

	test("should handle whitespace in filenames", async () => {
		const result = await parseArticles(tempDir);
		const whitespace = result.articles.find((a) => a.slug === "2025-04-01-0");

		expect(whitespace).toBeDefined();
		expect(whitespace?.images.length).toBe(1);
		expect(whitespace?.images[0].relativePath).toBe("my images/my photo.jpg");
		expect(whitespace?.images[0].r2Key).toBe(
			"2025-04-01-0/my images/my photo.jpg",
		);
	});

	test("should handle nested paths", async () => {
		const result = await parseArticles(tempDir);
		const nested = result.articles.find((a) => a.slug === "2025-05-01-0");

		expect(nested).toBeDefined();
		expect(nested?.images.length).toBe(1);
		expect(nested?.images[0].relativePath).toBe("assets/nested/deep/image.png");
		expect(nested?.images[0].r2Key).toBe(
			"2025-05-01-0/assets/nested/deep/image.png",
		);
	});

	test("should detect bad frontmatter date", async () => {
		const result = await parseArticles(tempDir);
		const badFm = result.articles.find((a) => a.slug === "2025-06-01-0");

		expect(badFm).toBeDefined();
		expect(badFm?.status).toBe("error");
		expect(badFm?.error).toContain("Invalid date");
	});

	test("should count images and skipped files correctly", async () => {
		const result = await parseArticles(tempDir);

		expect(result.imageCount).toBe(5);
		expect(result.skippedCount).toBe(1);
	});

	test("should ignore non-article directories", async () => {
		const invalidDir = join(tempDir, "not-a-slug");
		await mkdir(invalidDir);
		await writeFile(join(invalidDir, "README.md"), "---\ntitle: Invalid\n---");

		const result = await parseArticles(tempDir);
		const invalid = result.articles.find((a) => a.slug === "not-a-slug");

		expect(invalid).toBeUndefined();

		await rm(invalidDir, { recursive: true, force: true });
	});

	test("should detect duplicate slugs", async () => {
		const dupDir = join(tempDir, "2025-01-15-0-copy");
		await mkdir(dupDir);
		await writeFile(
			join(dupDir, "README.md"),
			`---
title: Duplicate
date: 2025-01-15
---
Duplicate article.`,
		);

		const result = await parseArticles(tempDir);
		expect(result.duplicates.length).toBe(0);
		expect(
			result.errors.some((error) => error.slug === "2025-01-15-0-copy"),
		).toBe(true);

		await rm(dupDir, { recursive: true, force: true });
	});

	test("should reject invalid draft and mismatched slug date", async () => {
		const invalidDraftDir = join(tempDir, "2025-07-01-0");
		await mkdir(invalidDraftDir);
		await writeFile(
			join(invalidDraftDir, "README.md"),
			'---\ntitle: Invalid draft\ndate: 2025-07-01\ndraft: "true"\n---\n',
		);

		const mismatchedDateDir = join(tempDir, "2025-07-02-0");
		await mkdir(mismatchedDateDir);
		await writeFile(
			join(mismatchedDateDir, "README.md"),
			"---\ntitle: Mismatched date\ndate: 2025-07-03\n---\n",
		);

		try {
			const result = await parseArticles(tempDir);
			expect(
				result.errors.find((error) => error.slug === "2025-07-01-0")?.message,
			).toBe("Invalid draft value");
			expect(
				result.errors.find((error) => error.slug === "2025-07-02-0")?.message,
			).toBe("Slug date does not match frontmatter date");
		} finally {
			await rm(invalidDraftDir, { recursive: true, force: true });
			await rm(mismatchedDateDir, { recursive: true, force: true });
		}
	});
});
