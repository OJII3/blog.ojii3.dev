import { type ActionAPIContext, defineAction } from "astro:actions";
import { getContentEnv } from "@/db/client";
import { createContentMarkdownProcessor } from "@/lib/content/markdown";
import { createAssetOgImageRenderer } from "@/lib/og-image";
import { createOgImageSaver } from "@/lib/og-image-storage";
import { requireAdmin } from "@/pages/admin/_lib/auth/require-admin";
import {
	createPostInput,
	handleCreatePost,
	handleUpdatePost,
	updatePostInput,
} from "./content";
import { handleUploadImage } from "./media";
import { searchPostsAction, searchPostsInput } from "./search";

export const server = {
	createPost: defineAction({
		accept: "json",
		input: createPostInput,
		handler: async (input, context: ActionAPIContext) => {
			await requireAdmin(context.request.headers);
			const env = await getContentEnv();
			const processor = createContentMarkdownProcessor({
				mediaBaseUrl: env.MEDIA_BASE_URL,
			});
			const saveOgImage = createOgImageSaver({
				media: env.MEDIA,
				render: createAssetOgImageRenderer(env.ASSETS, context.request.url),
			});
			return handleCreatePost(
				input,
				env.DB,
				undefined,
				async (body, slug) => {
					return (await processor.render(body, slug)).html;
				},
				saveOgImage,
			);
		},
	}),
	updatePost: defineAction({
		accept: "json",
		input: updatePostInput,
		handler: async (input, context: ActionAPIContext) => {
			await requireAdmin(context.request.headers);
			const env = await getContentEnv();
			const processor = createContentMarkdownProcessor({
				mediaBaseUrl: env.MEDIA_BASE_URL,
			});
			const saveOgImage = createOgImageSaver({
				media: env.MEDIA,
				render: createAssetOgImageRenderer(env.ASSETS, context.request.url),
			});
			return handleUpdatePost(
				input,
				env.DB,
				undefined,
				async (body, slug) => {
					return (await processor.render(body, slug)).html;
				},
				saveOgImage,
			);
		},
	}),
	uploadImage: defineAction({
		accept: "form",
		handler: async (formData, context: ActionAPIContext) => {
			await requireAdmin(context.request.headers);
			const env = await getContentEnv();
			return handleUploadImage(formData, env.MEDIA, env.MEDIA_BASE_URL);
		},
	}),
	searchPosts: defineAction({
		accept: "json",
		input: searchPostsInput,
		handler: searchPostsAction,
	}),
};
