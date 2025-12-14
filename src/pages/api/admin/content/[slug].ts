import type { APIRoute } from "astro";
import matter from "gray-matter";
import yaml from "js-yaml";
import { getGitHubAccessToken } from "../../../../features/admin/_lib/github/client";
import { createContentClientFromToken } from "../../../../features/admin/_lib/github/content";

export const prerender = false;

type UpdateRequestBody = {
	frontmatter?: string | Record<string, unknown>;
	body?: string;
	sha?: string;
};

export const PUT: APIRoute = async ({ params, request }) => {
	const { slug } = params;
	if (!slug) {
		return new Response(JSON.stringify({ message: "Slug required" }), {
			status: 400,
		});
	}

	const accessToken = await getGitHubAccessToken(request.headers);
	if (!accessToken) {
		return new Response(JSON.stringify({ message: "Unauthorized" }), {
			status: 401,
		});
	}

	try {
		const bodyJson = (await request.json()) as UpdateRequestBody;
		const { frontmatter, body, sha } = bodyJson;

		let data = {};
		if (frontmatter) {
			if (typeof frontmatter === "string") {
				try {
					data = yaml.load(frontmatter) as object;
				} catch (_e) {
					return new Response(
						JSON.stringify({ message: "Invalid YAML in frontmatter" }),
						{ status: 400 },
					);
				}
			} else {
				data = frontmatter;
			}
		}

		const fileContent = matter.stringify(body || "", data);
		const client = createContentClientFromToken(accessToken);
		const path = `content/${slug}/README.md`;

		const res = await client.upsertFile({
			path,
			content: fileContent,
			message: `chore(content): update post ${slug}`,
			sha,
		});

		return new Response(JSON.stringify({ result: res }), { status: 200 });
	} catch (e) {
		console.error(e);
		const msg = e instanceof Error ? e.message : "Unknown error";
		return new Response(JSON.stringify({ message: msg }), { status: 500 });
	}
};
