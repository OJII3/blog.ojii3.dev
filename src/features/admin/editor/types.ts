export type EditableFrontmatter = {
	title?: string;
	date?: string | Date;
	tags?: string[];
	draft?: boolean;
};

export type EditablePost = {
	frontmatter: EditableFrontmatter;
	body: string;
	sha: string;
};

export type LoadEditablePostResult =
	| { status: "ok"; post: EditablePost }
	| { status: "unauthorized" }
	| { status: "error"; message: string };
