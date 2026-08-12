import { describe, expect, test } from "bun:test";
import type {
	ArticleImage,
	ParsedArticle,
	ParseResult,
} from "./migrate-content-lib";
import {
	type CommandResult,
	type CommandRunner,
	escapeSqlString,
	executeSqlFile,
	fetchExistingBodies,
	generateSql,
	uploadImage,
	writeArticles,
} from "./migrate-content-writer";

function createMockRunner(
	handler: (args: string[]) => CommandResult | Promise<CommandResult>,
) {
	const calls: string[][] = [];
	const runner: CommandRunner = {
		async run(args: string[]) {
			calls.push([...args]);
			return handler(args);
		},
	};
	return { runner, calls };
}

function makeArticle(overrides: Partial<ParsedArticle> = {}): ParsedArticle {
	return {
		slug: "2025-01-15-0",
		frontmatter: {
			title: "Test Article",
			date: "2025-01-15",
			tags: ["test"],
			draft: false,
		},
		body: "Hello world",
		images: [],
		skipped: [],
		status: "valid",
		...overrides,
	};
}

function makeParseResult(
	articles: ParsedArticle[],
	overrides: Partial<ParseResult> = {},
): ParseResult {
	const errors = articles
		.filter((a) => a.status === "error")
		.map((a) => ({ slug: a.slug, message: a.error ?? "Unknown" }));
	const validArticles = articles.filter((a) => a.status === "valid");
	return {
		articles,
		validCount: validArticles.length,
		insertCandidateCount: validArticles.length,
		imageCount: articles.reduce((sum, a) => sum + a.images.length, 0),
		skippedCount: articles.reduce((sum, a) => sum + a.skipped.length, 0),
		errors,
		duplicates: [],
		...overrides,
	};
}

describe("escapeSqlString", () => {
	test("escapes single quotes by doubling them", () => {
		expect(escapeSqlString("it's a test")).toBe("it''s a test");
		expect(escapeSqlString("O'Brien's book")).toBe("O''Brien''s book");
		expect(escapeSqlString("no quotes")).toBe("no quotes");
		expect(escapeSqlString("")).toBe("");
	});
});

describe("generateSql", () => {
	test("escapes single quotes in title and body", () => {
		const article = makeArticle({
			frontmatter: {
				title: "It's a test",
				date: "2025-01-15",
				tags: ["O'Brien"],
				draft: false,
			},
			body: "Body with 'quotes'",
		});
		const sql = generateSql([article], new Map(), 1000);

		expect(sql).toContain("It''s a test");
		expect(sql).toContain("Body with ''quotes''");
		expect(sql).toContain("O''Brien");
		expect(sql).not.toContain("It's a test");
	});

	test("generates INSERT for new articles", () => {
		const article = makeArticle();
		const sql = generateSql([article], new Map(), 1000);

		expect(sql).toContain("INSERT INTO posts");
		expect(sql).toContain("'2025-01-15-0'");
		expect(sql).toContain("'Test Article'");
		expect(sql).toContain("'Hello world'");
		expect(sql).toContain("1, 1000, 1000");
		expect(sql).not.toContain("UPDATE posts");
	});

	test("generates UPDATE for existing articles with same body", () => {
		const article = makeArticle();
		const existing = new Map([["2025-01-15-0", "Hello world"]]);
		const sql = generateSql([article], existing, 2000);

		expect(sql).toContain("UPDATE posts SET");
		expect(sql).toContain("updated_at = 2000");
		expect(sql).toContain("DELETE FROM post_tags");
		expect(sql).not.toContain("INSERT INTO posts");
		expect(sql).not.toContain("revision");
	});

	test("includes tag statements", () => {
		const article = makeArticle({
			frontmatter: {
				title: "Test",
				date: "2025-01-15",
				tags: ["typescript", "astro"],
				draft: false,
			},
		});
		const sql = generateSql([article], new Map(), 1000);

		expect(sql).toContain(
			"INSERT OR IGNORE INTO tags (name) VALUES ('typescript')",
		);
		expect(sql).toContain("INSERT OR IGNORE INTO tags (name) VALUES ('astro')");
		expect(sql).toContain(
			"INSERT INTO post_tags (post_slug, tag_name) VALUES ('2025-01-15-0', 'typescript')",
		);
		expect(sql).toContain(
			"INSERT INTO post_tags (post_slug, tag_name) VALUES ('2025-01-15-0', 'astro')",
		);
	});

	test("handles draft boolean", () => {
		const draftArticle = makeArticle({
			frontmatter: {
				title: "Draft",
				date: "2025-01-15",
				tags: [],
				draft: true,
			},
		});
		const sql = generateSql([draftArticle], new Map(), 1000);
		expect(sql).toContain(", 1, ");

		const publishedArticle = makeArticle({
			frontmatter: {
				title: "Published",
				date: "2025-01-15",
				tags: [],
				draft: false,
			},
		});
		const sql2 = generateSql([publishedArticle], new Map(), 1000);
		expect(sql2).toContain(", 0, ");
	});

	test("skips error articles", () => {
		const errorArticle = makeArticle({ status: "error" });
		const sql = generateSql([errorArticle], new Map(), 1000);
		expect(sql.trim()).toBe("");
	});
});

describe("fetchExistingBodies", () => {
	test("returns empty map for no slugs", async () => {
		const { runner, calls } = createMockRunner(() => ({
			exitCode: 0,
			stdout: "[]",
			stderr: "",
		}));
		const result = await fetchExistingBodies([], false, runner);
		expect(result.size).toBe(0);
		expect(calls.length).toBe(0);
	});

	test("passes --local flag when not remote", async () => {
		const { runner, calls } = createMockRunner(() => ({
			exitCode: 0,
			stdout: JSON.stringify([{ results: [] }]),
			stderr: "",
		}));
		await fetchExistingBodies(["slug1"], false, runner);
		expect(calls[0]).toContain("--local");
		expect(calls[0]).not.toContain("--remote");
	});

	test("passes --remote flag when remote", async () => {
		const { runner, calls } = createMockRunner(() => ({
			exitCode: 0,
			stdout: JSON.stringify([{ results: [] }]),
			stderr: "",
		}));
		await fetchExistingBodies(["slug1"], true, runner);
		expect(calls[0]).toContain("--remote");
		expect(calls[0]).not.toContain("--local");
	});

	test("parses D1 JSON response correctly", async () => {
		const { runner } = createMockRunner(() => ({
			exitCode: 0,
			stdout: JSON.stringify([
				{
					results: [
						{ slug: "2025-01-15-0", body: "existing body" },
						{ slug: "2025-02-20-1", body: "another body" },
					],
				},
			]),
			stderr: "",
		}));
		const result = await fetchExistingBodies(
			["2025-01-15-0", "2025-02-20-1"],
			false,
			runner,
		);
		expect(result.get("2025-01-15-0")).toBe("existing body");
		expect(result.get("2025-02-20-1")).toBe("another body");
		expect(result.size).toBe(2);
	});

	test("throws on D1 failure", async () => {
		const { runner } = createMockRunner(() => ({
			exitCode: 1,
			stdout: "",
			stderr: "database error",
		}));
		expect(fetchExistingBodies(["slug1"], false, runner)).rejects.toThrow(
			"Failed to query existing posts",
		);
	});
});

describe("executeSqlFile", () => {
	test("passes --local flag when not remote", async () => {
		const { runner, calls } = createMockRunner(() => ({
			exitCode: 0,
			stdout: "",
			stderr: "",
		}));
		await executeSqlFile("SELECT 1;", false, runner);

		const fileCall = calls.find((c) => c.includes("--file"));
		expect(fileCall).toBeDefined();
		expect(fileCall).toContain("--local");
		expect(fileCall).not.toContain("--remote");
		expect(fileCall).toContain("--yes");
	});

	test("passes --remote flag when remote", async () => {
		const { runner, calls } = createMockRunner(() => ({
			exitCode: 0,
			stdout: "",
			stderr: "",
		}));
		await executeSqlFile("SELECT 1;", true, runner);

		const fileCall = calls.find((c) => c.includes("--file"));
		expect(fileCall).toContain("--remote");
		expect(fileCall).not.toContain("--local");
	});

	test("throws on D1 execution failure", async () => {
		const { runner } = createMockRunner(() => ({
			exitCode: 1,
			stdout: "",
			stderr: "SQL error",
		}));
		expect(executeSqlFile("BAD SQL;", false, runner)).rejects.toThrow(
			"D1 execution failed",
		);
	});
});

describe("uploadImage", () => {
	test("passes correct R2 key with spaces as single argument", async () => {
		const { runner, calls } = createMockRunner((args) => {
			if (args[4] === "get") {
				return {
					exitCode: 1,
					stdout: "",
					stderr: "The specified key does not exist.",
				};
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});
		const image: ArticleImage = {
			relativePath: "my images/my photo.jpg",
			r2Key: "2025-04-01-0/my images/my photo.jpg",
			mimeType: "image/jpeg",
		};
		await uploadImage("/source", "2025-04-01-0", image, false, runner);

		const r2Call = calls.find((c) => c[4] === "put");
		expect(r2Call).toBeDefined();
		expect(r2Call?.[5]).toBe("blog-media/2025-04-01-0/my images/my photo.jpg");
		expect(r2Call).toContain("--file");
		expect(r2Call).toContain("--content-type");
		expect(r2Call).toContain("image/jpeg");
		expect(r2Call).toContain("--local");
		expect(r2Call).toContain("--force");
		expect(r2Call).not.toContain("--yes");
	});

	test("passes nested path correctly", async () => {
		const { runner, calls } = createMockRunner((args) => {
			if (args[4] === "get") {
				return {
					exitCode: 1,
					stdout: "",
					stderr: "The specified key does not exist.",
				};
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});
		const image: ArticleImage = {
			relativePath: "assets/nested/deep/image.png",
			r2Key: "2025-05-01-0/assets/nested/deep/image.png",
			mimeType: "image/png",
		};
		await uploadImage("/source", "2025-05-01-0", image, true, runner);

		const r2Call = calls.find((c) => c[4] === "put");
		expect(r2Call?.[5]).toBe(
			"blog-media/2025-05-01-0/assets/nested/deep/image.png",
		);
		expect(r2Call).toContain("--remote");
	});

	test("skips an existing R2 object without overwriting it", async () => {
		const { runner, calls } = createMockRunner((args) => {
			if (args[4] === "get") {
				return { exitCode: 0, stdout: "", stderr: "" };
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});
		const image: ArticleImage = {
			relativePath: "photo.jpg",
			r2Key: "2025-01-15-0/photo.jpg",
			mimeType: "image/jpeg",
		};

		const result = await uploadImage(
			"/source",
			"2025-01-15-0",
			image,
			false,
			runner,
		);

		expect(result).toEqual({ success: true, skipped: true });
		expect(calls.some((call) => call[4] === "put")).toBe(false);
	});

	test("returns failure on error", async () => {
		const { runner } = createMockRunner((args) => {
			if (args[4] === "get") {
				return {
					exitCode: 1,
					stdout: "",
					stderr: "The specified key does not exist.",
				};
			}
			return { exitCode: 1, stdout: "", stderr: "upload failed" };
		});
		const image: ArticleImage = {
			relativePath: "photo.jpg",
			r2Key: "2025-01-15-0/photo.jpg",
			mimeType: "image/jpeg",
		};
		const result = await uploadImage(
			"/source",
			"2025-01-15-0",
			image,
			false,
			runner,
		);
		expect(result.success).toBe(false);
		expect(result.error).toBe("upload failed");
	});
});

describe("writeArticles", () => {
	test("aborts with no SQL/R2 when body conflicts exist", async () => {
		const article = makeArticle({ body: "new body" });
		const parseResult = makeParseResult([article]);

		const { runner, calls } = createMockRunner((args) => {
			if (args.includes("--command")) {
				return {
					exitCode: 0,
					stdout: JSON.stringify([
						{ results: [{ slug: "2025-01-15-0", body: "different body" }] },
					]),
					stderr: "",
				};
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});

		const result = await writeArticles("/source", parseResult, false, runner);

		expect(result.conflicts).toEqual(["2025-01-15-0"]);
		expect(result.inserted).toBe(0);
		expect(result.updated).toBe(0);
		expect(result.imagesUploaded).toBe(0);

		const hasFileCall = calls.some((c) => c.includes("--file"));
		const hasR2Call = calls.some((c) => c[2] === "r2");
		expect(hasFileCall).toBe(false);
		expect(hasR2Call).toBe(false);
	});

	test("updates metadata without revision reset on same-body rerun", async () => {
		const article = makeArticle({
			frontmatter: {
				title: "Updated Title",
				date: "2025-01-15",
				tags: ["new-tag"],
				draft: true,
			},
			body: "Same body",
			images: [
				{
					relativePath: "photo.jpg",
					r2Key: "2025-01-15-0/photo.jpg",
					mimeType: "image/jpeg",
				},
			],
		});
		const parseResult = makeParseResult([article]);

		const { runner, calls } = createMockRunner((args) => {
			if (args.includes("--command")) {
				return {
					exitCode: 0,
					stdout: JSON.stringify([
						{ results: [{ slug: "2025-01-15-0", body: "Same body" }] },
					]),
					stderr: "",
				};
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});

		const result = await writeArticles("/source", parseResult, false, runner);

		expect(result.conflicts).toEqual([]);
		expect(result.updated).toBe(1);
		expect(result.inserted).toBe(0);
		expect(result.imagesSkipped).toEqual(["2025-01-15-0/photo.jpg"]);

		const fileCall = calls.find((c) => c.includes("--file"));
		expect(fileCall).toBeDefined();
		expect(calls.some((call) => call[2] === "r2")).toBe(false);
	});

	test("inserts new articles", async () => {
		const article = makeArticle();
		const parseResult = makeParseResult([article]);

		const { runner, calls } = createMockRunner((args) => {
			if (args.includes("--command")) {
				return {
					exitCode: 0,
					stdout: JSON.stringify([{ results: [] }]),
					stderr: "",
				};
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});

		const result = await writeArticles("/source", parseResult, false, runner);

		expect(result.inserted).toBe(1);
		expect(result.updated).toBe(0);
		expect(result.conflicts).toEqual([]);

		const fileCall = calls.find((c) => c.includes("--file"));
		expect(fileCall).toBeDefined();
	});

	test("records failed images and continues processing", async () => {
		const image1: ArticleImage = {
			relativePath: "photo.jpg",
			r2Key: "2025-01-15-0/photo.jpg",
			mimeType: "image/jpeg",
		};
		const image2: ArticleImage = {
			relativePath: "thumb.png",
			r2Key: "2025-01-15-0/thumb.png",
			mimeType: "image/png",
		};
		const article = makeArticle({ images: [image1, image2] });
		const parseResult = makeParseResult([article]);

		const { runner } = createMockRunner((args) => {
			if (args.includes("--command")) {
				return {
					exitCode: 0,
					stdout: JSON.stringify([{ results: [] }]),
					stderr: "",
				};
			}
			if (args[2] === "r2") {
				if (args[4] === "get") {
					return {
						exitCode: 1,
						stdout: "",
						stderr: "The specified key does not exist.",
					};
				}
				const r2Key = args[5];
				if (r2Key === "blog-media/2025-01-15-0/photo.jpg") {
					return { exitCode: 1, stdout: "", stderr: "upload error" };
				}
				return { exitCode: 0, stdout: "", stderr: "" };
			}
			return { exitCode: 0, stdout: "", stderr: "" };
		});

		const result = await writeArticles("/source", parseResult, false, runner);

		expect(result.imagesUploaded).toBe(1);
		expect(result.failedImages.length).toBe(1);
		expect(result.inserted).toBe(0);
		expect(result.failedImages[0].key).toBe("2025-01-15-0/photo.jpg");
		expect(result.failedImages[0].error).toBe("upload error");
	});

	test("uses --remote flag throughout when remote", async () => {
		const article = makeArticle({
			images: [
				{
					relativePath: "photo.jpg",
					r2Key: "2025-01-15-0/photo.jpg",
					mimeType: "image/jpeg",
				},
			],
		});
		const parseResult = makeParseResult([article]);

		const { runner, calls } = createMockRunner((args) => {
			if (args[2] === "r2" && args[4] === "get") {
				return {
					exitCode: 1,
					stdout: "",
					stderr: "The specified key does not exist.",
				};
			}
			return {
				exitCode: 0,
				stdout: JSON.stringify([{ results: [] }]),
				stderr: "",
			};
		});

		await writeArticles("/source", parseResult, true, runner);

		for (const call of calls) {
			if (call[2] === "d1" || call[2] === "r2") {
				expect(call).toContain("--remote");
				expect(call).not.toContain("--local");
			}
		}
	});
});
