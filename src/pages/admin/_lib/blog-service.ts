import matter from "gray-matter";
import { createContentClientFromToken } from "@/pages/admin/_lib/github/content";

export interface UpdatePostParams {
	slug: string;
	frontmatter: {
		title: string;
		date: string;
		tags?: string[];
		draft?: boolean;
	};
	body: string;
	sha?: string;
	accessToken: string;
}

export const updatePostCore = async ({
	slug,
	frontmatter,
	body,
	sha,
	accessToken,
}: UpdatePostParams) => {
	// Ensure date is YYYY-MM-DD
	if (typeof frontmatter.date === "string" && frontmatter.date.includes("T")) {
		frontmatter.date = frontmatter.date.split("T")[0];
	}

	let fileContent = matter.stringify(body || "", frontmatter);

	// Fix date format: remove quotes around YYYY-MM-DD date strings
	// gray-matter/js-yaml adds quotes by default, but we want unquoted dates
	// Handles both ' and " quotes and optional whitespace
	fileContent = fileContent.replace(
		/^date:\s*['"](\d{4}-\d{2}-\d{2})['"]/m,
		"date: $1",
	);

	const client = createContentClientFromToken(accessToken);
	const path = `${slug}/README.md`;

	const res = await client.upsertFile({
		path,
		content: fileContent,
		message: `chore(content): update post ${slug}`,
		sha,
	});

	return {
		success: true,
		sha: res.content?.sha,
	};
};
