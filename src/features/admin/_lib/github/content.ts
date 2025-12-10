import type { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
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
	Result,
	UpsertContentParams,
} from "./types";

const DEFAULT_PATH = "content";

export type ContentClient = {
	listRepoPath: (path: string) => Promise<Result<GitHubContentItem[]>>;
	upsertFile: (
		params: UpsertContentParams,
	) => Promise<Result<GitHubFileCommit>>;
	deleteFile: (
		params: DeleteContentParams,
	) => Promise<Result<GitHubFileCommit>>;
	getFile: (params: GetFileParams) => Promise<Result<GitHubFileContent>>;
};

const trimBody = (body: string) =>
	body.length > 200 ? `${body.slice(0, 200)}...` : body;

const normalizePath = (path: string) => {
	const cleaned = path.replace(/^\/+/, "");
	return cleaned.length === 0 ? DEFAULT_PATH : cleaned;
};

const toBase64 = (content: string) => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(content, "utf8").toString("base64");
	}
	const encoded = new TextEncoder().encode(content);
	let binary = "";
	for (const byte of encoded) binary += String.fromCharCode(byte);
	return btoa(binary);
};

const toErrorResult = (error: unknown): Result<never> => {
	if (error instanceof RequestError) {
		const body =
			typeof error.response?.data === "string"
				? error.response.data
				: JSON.stringify(error.response?.data ?? "");
		return {
			status: "error",
			message: `GitHub API が ${error.status ?? "unknown"} を返しました: ${trimBody(body)}`,
		};
	}
	const message =
		error instanceof Error ? error.message : "未知のエラーが発生しました。";
	return { status: "error", message };
};

const listRepoPathWithOctokit = async (
	octokit: Octokit,
	path: string,
): Promise<Result<GitHubContentItem[]>> => {
	const resolvedPath = normalizePath(path);
	try {
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
		const data = items.map((item) => ({
			type: item.type,
			path: item.path,
			name: item.name,
			sha: item.sha,
			htmlUrl: "html_url" in item ? item.html_url : undefined,
		}));

		return { status: "ok", data };
	} catch (error) {
		return toErrorResult(error);
	}
};

const upsertFileWithOctokit = async (
	octokit: Octokit,
	params: UpsertContentParams,
): Promise<Result<GitHubFileCommit>> => {
	const { path, content, message, branch, sha, author, committer } = params;
	const resolvedPath = normalizePath(path);
	try {
		const response = await octokit.request(
			"PUT /repos/{owner}/{repo}/contents/{path}",
			{
				owner: repoOwner,
				repo: repoName,
				path: resolvedPath,
				message,
				content: toBase64(content),
				branch,
				sha,
				author,
				committer,
			},
		);

		return { status: "ok", data: response.data as GitHubFileCommit };
	} catch (error) {
		return toErrorResult(error);
	}
};

const deleteFileWithOctokit = async (
	octokit: Octokit,
	params: DeleteContentParams,
): Promise<Result<GitHubFileCommit>> => {
	const { path, message, sha, branch, author, committer } = params;
	const resolvedPath = normalizePath(path);
	try {
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

		return { status: "ok", data: response.data as GitHubFileCommit };
	} catch (error) {
		return toErrorResult(error);
	}
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
): Promise<Result<GitHubFileContent>> => {
	const { path, ref } = params;
	const resolvedPath = normalizePath(path);
	try {
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
			return {
				status: "error",
				message: "Expected a file but received a directory listing.",
			};
		}

		if (!("type" in response.data) || response.data.type !== "file") {
			return {
				status: "error",
				message: "Expected a file but received a non-file response.",
			};
		}

		const { content, sha, html_url: htmlUrl, encoding } = response.data;
		if (!content || encoding !== "base64") {
			return {
				status: "error",
				message: "Unsupported file response from GitHub.",
			};
		}

		return {
			status: "ok",
			data: {
				path: resolvedPath,
				sha,
				htmlUrl,
				content: decodeBase64(content),
			},
		};
	} catch (error) {
		return toErrorResult(error);
	}
};

export const createContentClient = async (
	headers: Headers,
): Promise<Result<ContentClient>> => {
	const octokitResult = await createOctokitClient(headers);
	if (octokitResult.status === "error") return octokitResult;

	const client: ContentClient = {
		listRepoPath: (path: string) =>
			listRepoPathWithOctokit(octokitResult.data, path),
		upsertFile: (params: UpsertContentParams) =>
			upsertFileWithOctokit(octokitResult.data, params),
		deleteFile: (params: DeleteContentParams) =>
			deleteFileWithOctokit(octokitResult.data, params),
		getFile: (params: GetFileParams) =>
			getFileWithOctokit(octokitResult.data, params),
	};

	return { status: "ok", data: client };
};

export const createContentClientFromToken = (
	accessToken?: string,
): Result<ContentClient> => {
	const octokit = createOctokit(accessToken);
	const client: ContentClient = {
		listRepoPath: (path: string) => listRepoPathWithOctokit(octokit, path),
		upsertFile: (params: UpsertContentParams) =>
			upsertFileWithOctokit(octokit, params),
		deleteFile: (params: DeleteContentParams) =>
			deleteFileWithOctokit(octokit, params),
		getFile: (params: GetFileParams) => getFileWithOctokit(octokit, params),
	};
	return { status: "ok", data: client };
};
