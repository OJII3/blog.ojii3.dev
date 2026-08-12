import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { Element, Root } from "hast";
import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

type ContentMarkdownProcessorOptions = {
	mediaBaseUrl: string;
};

type ContentMarkdownProcessor = ReturnType<
	typeof createUncachedContentMarkdownProcessor
>;

const processorCache = new Map<string, ContentMarkdownProcessor>();

const isRelativePath = (src: string): boolean => {
	if (/^https?:\/\//i.test(src) || src.startsWith("//")) {
		return false;
	}
	if (src.startsWith("/")) {
		return false;
	}
	if (/^[a-z][a-z0-9+.-]*:/i.test(src)) {
		return false;
	}
	return true;
};

const normalizeRelativePath = (src: string): string => {
	return src.replace(/^\.\//, "");
};

const isInvalidNormalizedPath = (normalized: string): boolean => {
	return normalized.startsWith("/") || normalized.startsWith("//");
};

const safeDecodeURIComponent = (str: string): string | null => {
	try {
		return decodeURIComponent(str);
	} catch {
		return null;
	}
};

const hasPathTraversal = (segments: string[]): boolean => {
	return segments.some((segment) => segment === ".." || segment === ".");
};

const isAbsolutePathAfterDecode = (decoded: string): boolean => {
	return decoded.startsWith("/");
};

const isValidSlug = (slug: string): boolean => {
	return slug !== "." && slug !== "..";
};

// Custom sanitize schema that preserves expressive-code classes and safe attributes
const sanitizeSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		"*": [
			...((defaultSchema.attributes?.["*"] as string[]) || []),
			"className", // HAST property name for class
			"data*", // Allow all data attributes
			"style", // Allow inline styles
		],
		code: [
			...((defaultSchema.attributes?.code as string[]) || []),
			"data(ec)",
			"data-code-block",
		],
		img: [...((defaultSchema.attributes?.img as string[]) || [])],
	},
	// Allow data: and blob: protocols for img src
	protocols: {
		...defaultSchema.protocols,
		src: [
			...((defaultSchema.protocols?.src as string[]) || []),
			"data",
			"blob",
		],
	},
	tagNames: [...(defaultSchema.tagNames || []), "div", "span", "style"],
};

const createRehypeMediaImageUrl = (mediaBaseUrl: string, slug: string) => {
	if (!isValidSlug(slug)) {
		return () => {
			return (_tree: Root) => {
				// Do not rewrite URLs if slug is invalid
			};
		};
	}

	const encodedSlug = encodeURIComponent(slug);
	const baseWithSlug = `${mediaBaseUrl}/${encodedSlug}/`;
	const expectedOrigin = new URL(mediaBaseUrl).origin;

	return () => {
		return (tree: Root) => {
			visit(tree, "element", (node: Element) => {
				if (node.tagName !== "img") return;

				const src = node.properties?.src;
				if (typeof src !== "string" || !src) return;

				if (!isRelativePath(src)) return;

				const normalizedPath = normalizeRelativePath(src);

				if (isInvalidNormalizedPath(normalizedPath)) return;

				const decoded = safeDecodeURIComponent(normalizedPath);
				if (decoded === null) {
					const segments = normalizedPath.split("/");
					if (hasPathTraversal(segments)) return;
					const encodedPath = segments
						.map((segment) => encodeURIComponent(segment))
						.join("/");
					try {
						const resultUrl = new URL(encodedPath, baseWithSlug);
						if (resultUrl.origin !== expectedOrigin) return;
						node.properties.src = resultUrl.href;
					} catch {
						// Malformed URL, leave unchanged
					}
					return;
				}

				if (isAbsolutePathAfterDecode(decoded)) return;

				const segments = decoded.split("/");
				if (hasPathTraversal(segments)) return;

				const encodedPath = segments
					.map((segment) => encodeURIComponent(segment))
					.join("/");
				try {
					const resultUrl = new URL(encodedPath, baseWithSlug);
					if (resultUrl.origin !== expectedOrigin) return;
					node.properties.src = resultUrl.href;
				} catch {
					// Malformed URL, leave unchanged
				}
			});
		};
	};
};

const createUncachedContentMarkdownProcessor = (
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
					shiki: {
						engine: "javascript",
					},
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
			.use(rehypeSanitize, sanitizeSchema)
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

export const createContentMarkdownProcessor = (
	options: ContentMarkdownProcessorOptions,
): ContentMarkdownProcessor => {
	const cached = processorCache.get(options.mediaBaseUrl);
	if (cached) return cached;

	const processor = createUncachedContentMarkdownProcessor(options);
	processorCache.set(options.mediaBaseUrl, processor);
	return processor;
};
