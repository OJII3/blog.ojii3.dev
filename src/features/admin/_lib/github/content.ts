import type { Octokit } from "@octokit/core";
import { RequestError } from "@octokit/request-error";
import { createOctokitClient, repoName, repoOwner } from "./client";
import type {
	DeleteContentParams,
	GitHubContentItem,
	GitHubFileCommit,
	Result,
	UpsertContentParams,
} from "./types";

const DEFAULT_PATH = "content";

type ContentClient = {
	listRepoPath: (path: string) => Promise<Result<GitHubContentItem[]>>;
	upsertFile: (
		params: UpsertContentParams,
	) => Promise<Result<GitHubFileCommit>>;
	deleteFile: (
		params: DeleteContentParams,
	) => Promise<Result<GitHubFileCommit>>;
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
		const data = items as GitHubContentItem[];

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
	};

	return { status: "ok", data: client };
};
