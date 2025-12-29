import type { Element, Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

export type RehypeImageUrlOptions = {
	owner: string;
	repo: string;
	slug: string;
	branch?: string;
};

const isRelativePath = (src: string): boolean => {
	// Absolute URLs (http://, https://, //)
	if (/^https?:\/\//i.test(src) || src.startsWith("//")) {
		return false;
	}
	// Root-relative paths
	if (src.startsWith("/")) {
		return false;
	}
	// Data URLs
	if (src.startsWith("data:")) {
		return false;
	}
	return true;
};

const normalizeRelativePath = (src: string): string => {
	// Remove leading ./
	return src.replace(/^\.\//, "");
};

export const rehypeImageUrl: Plugin<[RehypeImageUrlOptions], Root> = (
	options,
) => {
	const { owner, repo, slug, branch = "main" } = options;
	const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${slug}`;

	return (tree) => {
		visit(tree, "element", (node: Element) => {
			if (node.tagName !== "img") return;

			const src = node.properties?.src;
			if (typeof src !== "string" || !src) return;

			if (isRelativePath(src)) {
				const normalizedPath = normalizeRelativePath(src);
				node.properties.src = `${baseUrl}/${normalizedPath}`;
			}
		});
	};
};
