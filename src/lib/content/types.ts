export type ContentPost = {
	slug: string;
	title: string;
	date: Date;
	dateString: string;
	tags: string[];
	draft: boolean;
	body: string;
	revision: number;
};

export type UpdatePostInput = Omit<
	ContentPost,
	"date" | "dateString" | "revision"
> & { date: string; revision: number };

export type UpdatePostResult =
	| { kind: "updated"; revision: number }
	| { kind: "conflict" }
	| { kind: "not-found" };
