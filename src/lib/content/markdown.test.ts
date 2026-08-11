import { describe, expect, it } from "bun:test";
import { createContentMarkdownProcessor } from "./markdown";

describe("createContentMarkdownProcessor", () => {
	const processor = createContentMarkdownProcessor({
		mediaBaseUrl: "https://media.blog.ojii3.dev",
	});

	describe("markdown rendering", () => {
		it("should render GFM tables", async () => {
			const md = `| Header | Header |
|--------|--------|
| Cell   | Cell   |`;
			const result = await processor.render(md, "test-post");
			expect(result.html).toContain("<table>");
			expect(result.html).toContain("<th>Header</th>");
			expect(result.html).toContain("<td>Cell</td>");
		});

		it("should render GFM strikethrough", async () => {
			const md = `~~deleted~~`;
			const result = await processor.render(md, "test-post");
			expect(result.html).toContain("<del>deleted</del>");
		});

		it("should render GFM autolinks", async () => {
			const md = `Visit https://example.com`;
			const result = await processor.render(md, "test-post");
			expect(result.html).toContain(
				'<a href="https://example.com">https://example.com</a>',
			);
		});

		it("should render code blocks with expressive-code", async () => {
			const md = "```typescript\nconst x = 1;\n```";
			const result = await processor.render(md, "test-post");
			expect(result.html).toContain("expressive-code");
		});
	});

	describe("image URL rewriting", () => {
		it("should transform relative path to media URL", async () => {
			const md = `![test](image.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/image.png"',
			);
		});

		it("should transform ./ relative path to media URL", async () => {
			const md = `![screenshot](./screenshot.jpg)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/screenshot.jpg"',
			);
		});

		it("should preserve absolute URLs (https)", async () => {
			const md = `![external](https://example.com/image.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain('src="https://example.com/image.png"');
		});

		it("should preserve absolute URLs (http)", async () => {
			const md = `![external](http://example.com/image.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain('src="http://example.com/image.png"');
		});

		it("should preserve protocol-relative URLs", async () => {
			const md = `![external](//example.com/image.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain('src="//example.com/image.png"');
		});

		it("should preserve root-relative paths", async () => {
			const md = `![logo](/assets/logo.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain('src="/assets/logo.png"');
		});

		it("should preserve data URLs", async () => {
			const md = `![pixel](data:image/png;base64,iVBORw0KGgo=)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
		});

		it("should handle nested directory paths", async () => {
			const md = `![photo](assets/images/photo.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/assets/images/photo.png"',
			);
		});

		it("should URL-encode spaces in paths", async () => {
			const md = `![space](<my image.png>)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/my%20image.png"',
			);
		});

		it("should URL-encode spaces in nested paths", async () => {
			const md = `![space](<assets/my photos/photo.png>)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/assets/my%20photos/photo.png"',
			);
		});

		it("should handle multiple images", async () => {
			const md = `
![1](image1.png)

![2](https://example.com/external.png)

![3](./image2.png)
`;
			const result = await processor.render(md, "my-post");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/my-post/image1.png"',
			);
			expect(result.html).toContain('src="https://example.com/external.png"');
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/my-post/image2.png"',
			);
		});

		it("should not modify non-img elements", async () => {
			const md = `[link](image.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain('href="image.png"');
		});

		it("should not modify img elements without src", async () => {
			const input = '<img alt="no src">';
			const result = await processor.render(input, "2024-01-01-0");
			expect(result.html).toContain("<img");
			expect(result.html).toContain('alt="no src"');
			expect(result.html).not.toContain("src=");
		});

		it("should encode ? and # as part of filename path", async () => {
			const md = `![special](<what?is#this.png>)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/what%3Fis%23this.png"',
			);
		});

		it("should handle already-encoded segments without double-encoding", async () => {
			const md = `![encoded](my%20folder/image.png)`;
			const result = await processor.render(md, "2024-01-01-0");
			expect(result.html).toContain(
				'src="https://media.blog.ojii3.dev/2024-01-01-0/my%20folder/image.png"',
			);
		});
	});
});
