export type GitHubContentItem = {
	type: "file" | "dir" | "symlink" | "submodule";
	name: string;
	path: string;
	sha: string;
	htmlUrl?: string | null;
};

export type GitHubFileCommitContent = {
	sha: string;
	name: string;
	path: string;
	html_url?: string | null;
};

export type GitHubFileCommit = {
	content: GitHubFileCommitContent | null;
	commit: {
		sha: string;
		message: string;
	};
};

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

export type GetFileParams = {
	path: string;
	ref?: string;
};

export type GitHubFileContent = {
	path: string;
	sha: string;
	htmlUrl?: string | null;
	content: string;
};
