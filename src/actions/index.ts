import {
	type ActionAPIContext,
	ActionError,
	defineAction,
} from "astro:actions";
import { z } from "astro:schema";
import { updatePostCore } from "@/pages/admin/_lib/blog-service";
import {
	createOctokit,
	getGitHubAccessToken,
} from "@/pages/admin/_lib/github/client";

const updatePostInput = z.object({
	slug: z.string(),
	frontmatter: z.object({
		title: z.string(),
		date: z.string(),
		tags: z.array(z.string()).optional(),
		draft: z.boolean().optional(),
	}),
	body: z.string(),
	sha: z.string().optional(),
});

export const updatePostHandler = async (
	{ slug, frontmatter, body, sha }: z.infer<typeof updatePostInput>,
	context: ActionAPIContext,
) => {
	const accessToken = await getGitHubAccessToken(context.request.headers);
	if (!accessToken) {
		throw new ActionError({
			code: "UNAUTHORIZED",
			message:
				"GitHub のアクセストークンを取得できませんでした。再ログインしてください。",
		});
	}

	try {
		return await updatePostCore({
			slug,
			frontmatter,
			body,
			sha,
			accessToken,
		});
	} catch (e) {
		console.error(e);
		const msg = e instanceof Error ? e.message : "Unknown error";
		throw new ActionError({
			code: "INTERNAL_SERVER_ERROR",
			message: msg,
		});
	}
};

export const triggerDeployHandler = async (
	_input: unknown,
	context: ActionAPIContext,
) => {
	const accessToken = await getGitHubAccessToken(context.request.headers);
	if (!accessToken) {
		throw new ActionError({
			code: "UNAUTHORIZED",
			message:
				"GitHub のアクセストークンを取得できませんでした。再ログインしてください。",
		});
	}

	try {
		const octokit = createOctokit(accessToken);
		await octokit.request("POST /repos/{owner}/{repo}/dispatches", {
			owner: "ojii3",
			repo: "blog.ojii3.dev",
			event_type: "deploy",
		});
		return { success: true };
	} catch (e) {
		console.error(e);
		const msg = e instanceof Error ? e.message : "Unknown error";
		throw new ActionError({
			code: "INTERNAL_SERVER_ERROR",
			message: msg,
		});
	}
};

export const server = {
	updatePost: defineAction({
		accept: "json",
		input: updatePostInput,
		handler: updatePostHandler,
	}),
	triggerDeploy: defineAction({
		accept: "json",
		handler: triggerDeployHandler,
	}),
};
