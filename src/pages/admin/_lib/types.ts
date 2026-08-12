import type { AuthResult } from "@/lib/result";

export type EditableFrontmatter = {
	title?: string;
	date?: string | Date;
	tags?: string[];
	draft?: boolean;
};

export type EditablePost = {
	frontmatter: EditableFrontmatter;
	body: string;
	revision: number;
};

/** 記事読み込みの結果型 */
export type LoadEditablePostResult = AuthResult<EditablePost>;
