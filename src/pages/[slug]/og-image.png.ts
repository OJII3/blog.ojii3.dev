import { getLiveEntry } from "astro:content";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { APIRoute } from "astro";
import { createElement } from "react";
import satori from "satori";
import { OGImage } from "./_components/OGImage";

export const prerender = false;

let wasmInitPromise: Promise<void> | undefined;
let fontPromise: Promise<ArrayBuffer> | undefined;

const fetchAsset = async (path: string, baseUrl: URL): Promise<ArrayBuffer> => {
	const response = await fetch(new URL(path, baseUrl));
	if (!response.ok) {
		throw new Error(`Failed to load OG asset ${path}: ${response.status}`);
	}
	return response.arrayBuffer();
};

const initResvg = (baseUrl: URL) => {
	wasmInitPromise ??= fetchAsset("/resvg.wasm", baseUrl)
		.then((wasmBuffer) => initWasm(wasmBuffer))
		.catch((error) => {
			wasmInitPromise = undefined;
			throw error;
		});
	return wasmInitPromise;
};

const loadFont = (baseUrl: URL) => {
	fontPromise ??= fetchAsset("/MPLUSRounded1c-Bold.ttf", baseUrl).catch(
		(error) => {
			fontPromise = undefined;
			throw error;
		},
	);
	return fontPromise;
};

export const GET: APIRoute = async ({ params, url }) => {
	const { slug } = params;
	if (slug == null) {
		return new Response("Not found", { status: 404 });
	}

	const { entry: post, error } = await getLiveEntry("blog", { id: slug });
	if (error) {
		if (error.name !== "LiveEntryNotFoundError") throw error;
		return new Response("Not found", { status: 404 });
	}
	if (!post || post.data.draft) {
		return new Response("Not found", { status: 404 });
	}

	const font = await loadFont(url);

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

	await initResvg(url);
	const resvg = new Resvg(svg, {
		fitTo: { mode: "width", value: 1200 },
	});

	try {
		const rendered = resvg.render();
		try {
			const png = rendered.asPng();
			return new Response(png as BodyInit, {
				headers: { "Content-Type": "image/png" },
				status: 200,
			});
		} finally {
			rendered.free();
		}
	} finally {
		resvg.free();
	}
};
