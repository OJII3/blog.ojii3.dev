import type { Octokit } from "@octokit/core";
import {
	createOctokit,
	createOctokitClient,
	repoName,
	repoOwner,
} from "./client";
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

const toBase64 = (content: string) => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(content, "utf8").toString("base64");
	}
	const encoded = new TextEncoder().encode(content);
	let binary = "";
	for (const byte of encoded) binary += String.fromCharCode(byte);
	return btoa(binary);
};

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
			content: isBase64 ? content : toBase64(content),
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

const decodeBase64 = (content: string) => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(content, "base64").toString("utf8");
	}
	const binary = atob(content);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
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

export const createContentClient = async (
	headers: Headers,
): Promise<ContentClient> => {
	const octokit = await createOctokitClient(headers);

	const client: ContentClient = {
		listRepoPath: (path: string) => listRepoPathWithOctokit(octokit, path),
		upsertFile: (params: UpsertContentParams) =>
			upsertFileWithOctokit(octokit, params),
		deleteFile: (params: DeleteContentParams) =>
			deleteFileWithOctokit(octokit, params),
		getFile: (params: GetFileParams) => getFileWithOctokit(octokit, params),
	};

	return client;
};

export const createContentClientFromToken = (
	accessToken?: string,
): ContentClient => {
	const octokit = createOctokit(accessToken);
	const client: ContentClient = {
		listRepoPath: (path: string) => listRepoPathWithOctokit(octokit, path),
		upsertFile: (params: UpsertContentParams) =>
			upsertFileWithOctokit(octokit, params),
		deleteFile: (params: DeleteContentParams) =>
			deleteFileWithOctokit(octokit, params),
		getFile: (params: GetFileParams) => getFileWithOctokit(octokit, params),
	};
	return client;
};
