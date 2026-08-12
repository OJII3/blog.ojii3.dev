import { describe, expect, it } from "bun:test";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { rehypeImageUrl } from "./rehype-image-url";

const processHtml = async (html: string, slug: string) => {
	const processor = unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeImageUrl, {
			owner: "OJII3",
			repo: "content",
			slug,
		})
		.use(rehypeStringify);

	const result = await processor.process(html);
	return String(result);
};

describe("rehypeImageUrl", () => {
	it("should transform relative path to GitHub raw URL", async () => {
		const input = '<img src="image.png" alt="test">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain(
			'src="https://raw.githubusercontent.com/OJII3/content/main/2024-01-01-0/image.png"',
		);
	});

	it("should transform ./ relative path to GitHub raw URL", async () => {
		const input = '<img src="./screenshot.jpg" alt="screenshot">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain(
			'src="https://raw.githubusercontent.com/OJII3/content/main/2024-01-01-0/screenshot.jpg"',
		);
	});

	it("should preserve absolute URLs (https)", async () => {
		const input = '<img src="https://example.com/image.png" alt="external">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain('src="https://example.com/image.png"');
	});

	it("should preserve absolute URLs (http)", async () => {
		const input = '<img src="http://example.com/image.png" alt="external">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain('src="http://example.com/image.png"');
	});

	it("should preserve root-relative paths", async () => {
		const input = '<img src="/assets/logo.png" alt="logo">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain('src="/assets/logo.png"');
	});

	it("should handle multiple images", async () => {
		const input = `
			<p><img src="image1.png" alt="1"></p>
			<p><img src="https://example.com/external.png" alt="2"></p>
			<p><img src="./image2.png" alt="3"></p>
		`;
		const result = await processHtml(input, "my-post");

		expect(result).toContain(
			'src="https://raw.githubusercontent.com/OJII3/content/main/my-post/image1.png"',
		);
		expect(result).toContain('src="https://example.com/external.png"');
		expect(result).toContain(
			'src="https://raw.githubusercontent.com/OJII3/content/main/my-post/image2.png"',
		);
	});

	it("should handle nested directory paths", async () => {
		const input = '<img src="assets/images/photo.png" alt="photo">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain(
			'src="https://raw.githubusercontent.com/OJII3/content/main/2024-01-01-0/assets/images/photo.png"',
		);
	});

	it("should not modify non-img elements", async () => {
		const input = '<a href="image.png">link</a>';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain('href="image.png"');
	});

	it("should handle images without src attribute", async () => {
		const input = '<img alt="no src">';
		const result = await processHtml(input, "2024-01-01-0");

		expect(result).toContain("<img");
		expect(result).toContain('alt="no src"');
	});
});
