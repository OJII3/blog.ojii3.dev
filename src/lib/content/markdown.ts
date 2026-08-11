import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { Element, Root } from "hast";
import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

type ContentMarkdownProcessorOptions = {
	mediaBaseUrl: string;
};

const isRelativePath = (src: string): boolean => {
	if (/^https?:\/\//i.test(src) || src.startsWith("//")) {
		return false;
	}
	if (src.startsWith("/")) {
		return false;
	}
	if (src.startsWith("data:")) {
		return false;
	}
	return true;
};

const normalizeRelativePath = (src: string): string => {
	return src.replace(/^\.\//, "");
};

const createRehypeMediaImageUrl = (mediaBaseUrl: string, slug: string) => {
	return () => {
		return (tree: Root) => {
			visit(tree, "element", (node: Element) => {
				if (node.tagName !== "img") return;

				const src = node.properties?.src;
				if (typeof src !== "string" || !src) return;

				if (isRelativePath(src)) {
					const normalizedPath = normalizeRelativePath(src);
					const decodedPath = decodeURIComponent(normalizedPath);
					const encodedPath = decodedPath
						.split("/")
						.map((segment) => encodeURIComponent(segment))
						.join("/");
					node.properties.src = `${mediaBaseUrl}/${slug}/${encodedPath}`;
				}
			});
		};
	};
};

export const createContentMarkdownProcessor = (
	options: ContentMarkdownProcessorOptions,
) => {
	const { mediaBaseUrl } = options;

	const processorPromise = createMarkdownProcessor({
		gfm: true,
		rehypePlugins: [
			[
				rehypeExpressiveCode,
				{
					themes: ["tokyo-night"],
					styleOverrides: {
						frames: {
							frameBoxShadowCssValue: "none",
						},
					},
				},
			],
		],
		syntaxHighlight: false,
	});

	const transformImageUrls = async (html: string, slug: string) => {
		const result = await unified()
			.use(rehypeParse, { fragment: true })
			.use(createRehypeMediaImageUrl(mediaBaseUrl, slug))
			.use(rehypeStringify)
			.process(html);
		return String(result);
	};

	return {
		render: async (content: string, slug: string) => {
			const processor = await processorPromise;
			const result = await processor.render(content);
			const html = await transformImageUrls(result.code, slug);

			return {
				...result,
				code: html,
				html,
			};
		},
	};
};
