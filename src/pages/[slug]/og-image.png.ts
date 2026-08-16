import type { APIRoute } from "astro";
import { createContentDb, getContentEnv } from "@/db/client";
import { getPost } from "@/lib/content/repository";
import { getOgImageKey } from "@/lib/og-image-path";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
	const { slug } = params;
	if (slug == null) {
		return new Response("Not found", { status: 404 });
	}

	const env = await getContentEnv();
	const post = await getPost(createContentDb(env), slug);
	if (!post || post.draft) {
		return new Response("Not found", { status: 404 });
	}

	const requestedRevision = Number(url.searchParams.get("v"));
	const revision =
		Number.isInteger(requestedRevision) && requestedRevision > 0
			? requestedRevision
			: post.revision;
	const object = await env.MEDIA.get(getOgImageKey(slug, revision));
	if (!object) {
		return new Response("Not found", { status: 404 });
	}

	const headers = new Headers({
		"Cache-Control": url.searchParams.has("v")
			? "public, max-age=31536000, immutable"
			: "public, max-age=300",
		"Content-Type": object.httpMetadata?.contentType ?? "image/png",
	});
	if (object.httpEtag) headers.set("ETag", object.httpEtag);

	return new Response(object.body, { headers });
};
