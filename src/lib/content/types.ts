export type ContentPost = {
	slug: string;
	title: string;
	date: Date;
	dateString: string;
	tags: string[];
	draft: boolean;
	body: string;
	renderedHtml: string;
	revision: number;
};

export type RenderContentHtml = (body: string, slug: string) => Promise<string>;

export type UpdatePostInput = Omit<
	ContentPost,
	"date" | "dateString" | "renderedHtml" | "revision"
> & { date: string; revision: number };

export type UpdatePostResult =
	| { kind: "updated"; revision: number }
	| { kind: "conflict" }
	| { kind: "not-found" };

export type CreatePostInput = Omit<
	ContentPost,
	"slug" | "date" | "dateString" | "renderedHtml" | "revision"
> & { date: string };

export type CreatePostResult =
	| { kind: "created"; slug: string; revision: number }
	| { kind: "conflict" };
