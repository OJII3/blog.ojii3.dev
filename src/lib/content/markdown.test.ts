import { describe, expect, it } from "bun:test";
import { createContentMarkdownProcessor } from "./markdown";

describe("createContentMarkdownProcessor", () => {
	const processor = createContentMarkdownProcessor({
		mediaBaseUrl: "https://media.blog.ojii3.dev",
	});

	describe("markdown rendering", () => {
		it("should render code blocks when WebAssembly is unavailable", async () => {
			const originalInstantiate = WebAssembly.instantiate;
			WebAssembly.instantiate = async () => {
				throw new Error("WebAssembly is unavailable");
			};

			try {
				const processor = createContentMarkdownProcessor({
					mediaBaseUrl: "https://media.blog.ojii3.dev",
				});
				const result = await processor.render(
					"```typescript\nconst x = 1;\n```",
					"test-post",
				);
				expect(result.html).toContain("expressive-code");
			} finally {
				WebAssembly.instantiate = originalInstantiate;
			}
		});

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

		it("should render Python code blocks with expressive-code", async () => {
			const md = '```python\nprint("hello")\n```';
			const result = await processor.render(md, "test-post");
			expect(result.html).toContain("expressive-code");
			expect(result.html).toContain('data-language="python"');
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
				// Uppercase DATA: is not a recognized protocol, so src is removed
				expect(result.html).not.toContain("src=");
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

			it("should leave .//secret.png unchanged (starts with // after normalization)", async () => {
				const md = `![evil](.//secret.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src=".//secret.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should leave .///secret.png unchanged (starts with /// after normalization)", async () => {
				const md = `![evil](.///secret.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src=".///secret.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should handle .//secret%ZZ.png without throwing", async () => {
				const md = `![evil](.//secret%ZZ.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src=".//secret%ZZ.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});

			it("should handle .///secret%ZZ.png without throwing", async () => {
				const md = `![evil](.///secret%ZZ.png)`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain('src=".///secret%ZZ.png"');
				expect(result.html).not.toContain("media.blog.ojii3.dev");
			});
		});

		describe("security: XSS prevention", () => {
			it("should remove script tags", async () => {
				const md = `<script>alert('xss')</script>`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).not.toContain("<script>");
				expect(result.html).not.toContain("alert");
			});

			it("should remove onerror event handlers", async () => {
				const md = `<img src="x" onerror="alert('xss')">`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).not.toContain("onerror");
				expect(result.html).not.toContain("alert");
			});

			it("should remove javascript: URLs", async () => {
				const md = `[click me](javascript:alert('xss'))`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).not.toContain("javascript:");
				expect(result.html).not.toContain("alert");
			});

			it("should preserve safe HTML elements", async () => {
				const md = `<div class="test">Hello</div>`;
				const result = await processor.render(md, "2024-01-01-0");
				expect(result.html).toContain("<div");
				expect(result.html).toContain("Hello");
			});

			it("should preserve expressive-code output structure", async () => {
				const md = "```typescript\nconst x = 1;\n```";
				const result = await processor.render(md, "2024-01-01-0");
				// Check for the expressive-code wrapper div with className
				expect(result.html).toContain('<div class="expressive-code');
				// Check for the style element that expressive-code generates
				expect(result.html).toContain("<style>");
				// Check for the code block content (tokenized by syntax highlighter)
				expect(result.html).toContain("const");
				expect(result.html).toContain("x");
				expect(result.html).toContain("1");
			});
		});
	});

	it("should reuse the expensive syntax-highlighting processor", () => {
		const first = createContentMarkdownProcessor({
			mediaBaseUrl: "https://media.example.com",
		});
		const second = createContentMarkdownProcessor({
			mediaBaseUrl: "https://media.example.com",
		});
		const otherOrigin = createContentMarkdownProcessor({
			mediaBaseUrl: "https://other.example.com",
		});

		expect(second).toBe(first);
		expect(otherOrigin).not.toBe(first);
	});
});
