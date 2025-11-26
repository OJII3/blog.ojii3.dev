export interface PagefindResult {
	id: string;
	data: () => Promise<{
		url: string;
		excerpt: string;
		meta: {
			title: string;
			date: string;
			image?: string;
			[key: string]: unknown;
		};
		content: string;
		sub_results: {
			title: string;
			url: string;
			excerpt: string;
		}[];
	}>;
}

interface Pagefind {
	search: (
		query: string | null,
		options?: {
			filters?: {
				tag?: string | string[];
				[key: string]: string | string[] | undefined;
			};
			sort?: Record<string, "asc" | "desc">;
		},
	) => Promise<{
		results: PagefindResult[];
	}>;
	options: (options: {
		bundlePath?: string;
		[key: string]: unknown;
	}) => Promise<void>;
	init: () => Promise<void>;
	destroy: () => Promise<void>;
	filters: () => Promise<Record<string, Record<string, number>>>;
	preload: (
		query: string,
		options?: { filters?: Record<string, unknown> },
	) => Promise<void>;
}

declare module "/pagefind/pagefind.js" {
	export const search: Pagefind["search"];
	export const options: Pagefind["options"];
	export const init: Pagefind["init"];
	export const destroy: Pagefind["destroy"];
	export const filters: Pagefind["filters"];
	export const preload: Pagefind["preload"];
}
