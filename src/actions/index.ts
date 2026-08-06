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
import { createContentClientFromToken } from "@/pages/admin/_lib/github/content";

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

const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadImageHandler = async (
	formData: FormData,
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

	const file = formData.get("image") as File | null;
	const slug = formData.get("slug") as string | null;

	if (!file || !(file instanceof File)) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "画像ファイルが選択されていません。",
		});
	}

	if (!slug) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "記事のslugが指定されていません。",
		});
	}

	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: `対応していないファイル形式です: ${file.type}`,
		});
	}

	if (file.size > MAX_FILE_SIZE) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "ファイルサイズが10MBを超えています。",
		});
	}

	try {
		const arrayBuffer = await file.arrayBuffer();
		const base64Content = Buffer.from(arrayBuffer).toString("base64");

		const contentClient = createContentClientFromToken(accessToken);
		const path = `${slug}/${file.name}`;

		await contentClient.upsertFile({
			path,
			content: base64Content,
			message: `Upload image: ${file.name}`,
			isBase64: true,
		});

		return { filename: file.name, path };
	} catch (e) {
		console.error(e);
		const msg = e instanceof Error ? e.message : "Unknown error";
		throw new ActionError({
			code: "INTERNAL_SERVER_ERROR",
			message: `画像のアップロードに失敗しました: ${msg}`,
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
	uploadImage: defineAction({
		accept: "form",
		handler: uploadImageHandler,
	}),
	triggerDeploy: defineAction({
		accept: "json",
		handler: triggerDeployHandler,
	}),
};
