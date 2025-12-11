import { getCollection, getEntry } from "astro:content";
import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import { createElement } from "react";
import satori from "satori";
import { OGImage } from "../../features/posts/_components/OGImage";

export const GET: APIRoute = async ({ params }) => {
	const { slug } = params;
	if (slug == null) {
		return new Response("Not found", { status: 404 });
	}

	const post = await getEntry("blog", slug);
	if (post == null) {
		return new Response("Not found", { status: 404 });
	}

	const font = await readFile("./src/assets/MPLUSRounded1c-Bold.ttf");
	const { title, date, color } = post.data;
	const svg = await satori(createElement(OGImage, { title, date, color }), {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: "M PLUS Rounded 1c",
				data: font,
				weight: 400,
				style: "normal",
			},
		],
	});
	const png = new Resvg(svg).render().asPng();

	return new Response(png as BodyInit, {
		headers: { "Content-Type": "image/png" },
		status: 200,
	});
};

export async function getStaticPaths() {
	const posts = await getCollection("blog");

	return posts.map((post) => ({
		params: { slug: post.id },
	}));
}
