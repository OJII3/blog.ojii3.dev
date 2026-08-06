import type { Octokit } from "@octokit/core";
import {
	createOctokit,
	createOctokitClient,
	repoName,
	repoOwner,
} from "./client";
import { decodeBase64, encodeBase64 } from "./encoding";
import type {
	DeleteContentParams,
	GetFileParams,
	GitHubContentItem,
	GitHubFileCommit,
	GitHubFileContent,
	UpsertContentParams,
} from "./types";

export type ContentClient = {
	listRepoPath: (path: string) => Promise<GitHubContentItem[]>;
	upsertFile: (params: UpsertContentParams) => Promise<GitHubFileCommit>;
	deleteFile: (params: DeleteContentParams) => Promise<GitHubFileCommit>;
	getFile: (params: GetFileParams) => Promise<GitHubFileContent>;
};

const normalizePath = (path: string) => path.replace(/^\/+/, "");

const listRepoPathWithOctokit = async (
	octokit: Octokit,
	path: string,
): Promise<GitHubContentItem[]> => {
	const resolvedPath = normalizePath(path);
	const response = await octokit.request(
		"GET /repos/{owner}/{repo}/contents/{path}",
		{
			owner: repoOwner,
			repo: repoName,
			path: resolvedPath,
		},
	);

	const items = Array.isArray(response.data)
		? response.data
		: [response.data].filter(Boolean);
	return items.map((item) => ({
		type: item.type,
		path: item.path,
		name: item.name,
		sha: item.sha,
		htmlUrl: "html_url" in item ? item.html_url : undefined,
	}));
};

const upsertFileWithOctokit = async (
	octokit: Octokit,
	params: UpsertContentParams,
): Promise<GitHubFileCommit> => {
	const { path, content, message, branch, sha, author, committer, isBase64 } =
		params;
	const resolvedPath = normalizePath(path);
	const response = await octokit.request(
		"PUT /repos/{owner}/{repo}/contents/{path}",
		{
			owner: repoOwner,
			repo: repoName,
			path: resolvedPath,
			message,
			content: isBase64 ? content : encodeBase64(content),
			branch,
			sha,
			author,
			committer,
		},
	);

	return response.data as GitHubFileCommit;
};

const deleteFileWithOctokit = async (
	octokit: Octokit,
	params: DeleteContentParams,
): Promise<GitHubFileCommit> => {
	const { path, message, sha, branch, author, committer } = params;
	const resolvedPath = normalizePath(path);
	const response = await octokit.request(
		"DELETE /repos/{owner}/{repo}/contents/{path}",
		{
			owner: repoOwner,
			repo: repoName,
			path: resolvedPath,
			message,
			sha,
			branch,
			author,
			committer,
		},
	);

	return response.data as GitHubFileCommit;
};

const getFileWithOctokit = async (
	octokit: Octokit,
	params: GetFileParams,
): Promise<GitHubFileContent> => {
	const { path, ref } = params;
	const resolvedPath = normalizePath(path);
	const response = await octokit.request(
		"GET /repos/{owner}/{repo}/contents/{path}",
		{
			owner: repoOwner,
			repo: repoName,
			path: resolvedPath,
			ref,
		},
	);

	if (Array.isArray(response.data)) {
		throw new Error("Expected a file but received a directory listing.");
	}

	if (!("type" in response.data) || response.data.type !== "file") {
		throw new Error("Expected a file but received a non-file response.");
	}

	const { content, sha, html_url: htmlUrl, encoding } = response.data;
	if (!content || encoding !== "base64") {
		throw new Error("Unsupported file response from GitHub.");
	}

	return {
		path: resolvedPath,
		sha,
		htmlUrl,
		content: decodeBase64(content),
	};
};

/**
 * トークンを直接指定してContentClientを作成（主要API）
 */
export const createContentClient = (accessToken?: string): ContentClient => {
	const octokit = createOctokit(accessToken);
	return {
		listRepoPath: (path: string) => listRepoPathWithOctokit(octokit, path),
		upsertFile: (params: UpsertContentParams) =>
			upsertFileWithOctokit(octokit, params),
		deleteFile: (params: DeleteContentParams) =>
			deleteFileWithOctokit(octokit, params),
		getFile: (params: GetFileParams) => getFileWithOctokit(octokit, params),
	};
};

/**
 * Headersからトークンを取得してContentClientを作成
 */
export const createContentClientFromHeaders = async (
	headers: Headers,
): Promise<ContentClient> => {
	const octokit = await createOctokitClient(headers);
	return {
		listRepoPath: (path: string) => listRepoPathWithOctokit(octokit, path),
		upsertFile: (params: UpsertContentParams) =>
			upsertFileWithOctokit(octokit, params),
		deleteFile: (params: DeleteContentParams) =>
			deleteFileWithOctokit(octokit, params),
		getFile: (params: GetFileParams) => getFileWithOctokit(octokit, params),
	};
};

/** @deprecated Use createContentClient instead */
export const createContentClientFromToken = createContentClient;
