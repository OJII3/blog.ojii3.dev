import { type ActionAPIContext, defineAction } from "astro:actions";
import { getContentEnv } from "@/db/client";
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
			return handleCreatePost(input, env.DB);
		},
	}),
	updatePost: defineAction({
		accept: "json",
		input: updatePostInput,
		handler: async (input, context: ActionAPIContext) => {
			await requireAdmin(context.request.headers);
			const env = await getContentEnv();
			return handleUpdatePost(input, env.DB);
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
