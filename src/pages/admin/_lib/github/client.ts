import { Octokit } from "@octokit/core";
import { auth } from "@/auth";

export const repoOwner = "ojii3";
export const repoName = "content";
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
): Promise<string> => {
	const response = await auth.api.getAccessToken({
		headers,
		body: { providerId: "github" },
	});

	const accessToken = response?.accessToken;
	if (!accessToken) {
		throw new Error(
			"GitHub のアクセストークンを取得できませんでした。再ログインしてください。",
		);
	}

	return accessToken;
};

export const createOctokitFromToken = (accessToken?: string): Octokit => {
	return createOctokit(accessToken);
};

export const createOctokitClient = async (
	headers: Headers,
): Promise<Octokit> => {
	const accessToken = await getGitHubAccessToken(headers);
	return createOctokit(accessToken);
};
