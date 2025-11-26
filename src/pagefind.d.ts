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
		results: {
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
		}[];
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

export declare const search: Pagefind["search"];
export declare const options: Pagefind["options"];
export declare const init: Pagefind["init"];
export declare const destroy: Pagefind["destroy"];
export declare const filters: Pagefind["filters"];
export declare const preload: Pagefind["preload"];
