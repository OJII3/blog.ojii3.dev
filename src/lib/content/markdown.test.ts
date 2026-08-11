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

		describe("security: path traversal and scheme rejection", () => {
			it("should leave ../ path traversal unchanged (not rewritten)", async () => {
				const md = `![evil](../../../etc/passwd)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="../../../etc/passwd"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should leave encoded %2e%2e path traversal unchanged", async () => {
				const md = `![evil](%2e%2e/%2e%2e/etc/passwd)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="%2e%2e/%2e%2e/etc/passwd"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should leave encoded slash traversal unchanged", async () => {
				const md = `![evil](..%2F..%2Fetc%2Fpasswd)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="..%2F..%2Fetc%2Fpasswd"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should leave %2F%2Fevil.example unchanged (protocol-relative encoded)", async () => {
				const md = `![evil](%2F%2Fevil.example/image.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="%2F%2Fevil.example/image.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should leave %2Fevil.png unchanged (decoded to root-relative)", async () => {
				const md = `![evil](%2Fevil.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="%2Fevil.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should handle malformed % safely without throwing", async () => {
				const md = `![broken](100%real.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain(
					'src="https://media.blog.ojii3.dev/2024-01-01-0/100%25real.png"',
				);
			});

			it("should reject blob: scheme", async () => {
				const md = `![blob](blob:https://example.com/image)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="blob:');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should reject uppercase DATA: scheme", async () => {
				const md = `![data](DATA:image/png;base64,abc)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src="DATA:');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should preserve configured origin for all relative paths", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				const srcMatch = result.html.match(/src="([^"]+)"/);
				expect(srcMatch).toBeTruthy();
				const url = new URL(srcMatch?.[1] ?? "");
				expect(url.origin).toBe("https://media.blog.ojii3.dev");
			});
		});

		describe("security: slug encoding", () => {
			it("should encode slug containing ../ to prevent path traversal", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, "../evil");
				expect(result.html).toContain(
					'src="https://media.blog.ojii3.dev/..%2Fevil/image.png"',
				);
				expect(result.html).not.toContain("../");
			});

			it("should encode slug containing ? to prevent query injection", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, "post?evil=true");
				expect(result.html).toContain(
					'src="https://media.blog.ojii3.dev/post%3Fevil%3Dtrue/image.png"',
				);
				expect(result.html).not.toContain("?");
			});

			it("should encode slug containing # to prevent fragment injection", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, "post#evil");
				expect(result.html).toContain(
					'src="https://media.blog.ojii3.dev/post%23evil/image.png"',
				);
				expect(result.html).not.toContain("#");
			});

			it("should preserve configured origin even with hostile slug", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, "../evil#post?hack=true");
				const srcMatch = result.html.match(/src="([^"]+)"/);
				expect(srcMatch).toBeTruthy();
				const url = new URL(srcMatch?.[1] ?? "");
				expect(url.origin).toBe("https://media.blog.ojii3.dev");
			});

			it("should not rewrite URLs when slug is exactly '.'", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, ".");
				expect(result.html).toContain('src="image.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should not rewrite URLs when slug is exactly '..'", async () => {
				const md = `![test](image.png)`;
				const result = await processor.render(md, "..");
				expect(result.html).toContain('src="image.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});
		});
	});
});
