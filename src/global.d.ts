export {};

declare global {
	interface Window {
		pagefind: {
			search: (query: string) => Promise<{
				results: {
					data: () => Promise<{
						url: string;
						excerpt: string;
						meta: {
							title: string;
							date: string;
						};
					}>;
				}[];
			}>;
		};
	}
}
