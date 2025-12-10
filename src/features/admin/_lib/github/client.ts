import { Octokit } from "@octokit/core";
import { createAuth } from "../../../../auth";
import type { Result } from "./types";

const auth = createAuth();

export const repoOwner = "ojii3";
export const repoName = "blog.ojii3.dev";
export const repoLabel = `${repoOwner}/${repoName}`;

const USER_AGENT = "blog.ojii3.dev-admin";

export const createOctokit = (accessToken?: string) =>
	new Octokit({
		auth: accessToken,
		userAgent: USER_AGENT,
		request: {
			fetch,
		},
	});

export const getGitHubAccessToken = async (
	headers: Headers,
): Promise<Result<string>> => {
	try {
		const response = await auth.api.getAccessToken({
			headers,
			body: { providerId: "github" },
		});

		const accessToken = response?.accessToken;
		if (!accessToken) {
			return {
				status: "error",
				message:
					"GitHub のアクセストークンを取得できませんでした。再ログインしてください。",
			};
		}

		return { status: "ok", data: accessToken };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "未知のエラーが発生しました。";
		return { status: "error", message };
	}
};

export const createOctokitFromToken = (
	accessToken?: string,
): Result<Octokit> => {
	try {
		return { status: "ok", data: createOctokit(accessToken) };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "未知のエラーが発生しました。";
		return { status: "error", message };
	}
};

export const createOctokitClient = async (
	headers: Headers,
): Promise<Result<Octokit>> => {
	const tokenResult = await getGitHubAccessToken(headers);
	if (tokenResult.status === "error") return tokenResult;

	return { status: "ok", data: createOctokit(tokenResult.data) };
};
