import type { components } from "@octokit/openapi-types";

export type Result<T> =
	| { status: "ok"; data: T }
	| { status: "error"; message: string };

export type GitHubContentItem =
	| components["schemas"]["content-file"]
	| components["schemas"]["content-directory"]
	| components["schemas"]["content-symlink"]
	| components["schemas"]["content-submodule"];

export type GitHubFileCommit = components["schemas"]["file-commit"];

export type UpsertContentParams = {
	path: string;
	content: string;
	message: string;
	branch?: string;
	sha?: string; // required when updating existing file
	author?: { name: string; email: string };
	committer?: { name: string; email: string };
};

export type DeleteContentParams = {
	path: string;
	message: string;
	sha: string;
	branch?: string;
	author?: { name: string; email: string };
	committer?: { name: string; email: string };
};
