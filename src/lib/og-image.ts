import { initWasm, Resvg } from "@resvg/resvg-wasm";
import bundledResvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { createElement } from "react";
import satori from "satori";
import type { VitaColor } from "@/pages/_lib/constants";
import { OGImage } from "@/pages/[slug]/_components/OGImage";

export const OG_IMAGE_FONT_PATH = "/MPLUSRounded1c-Bold.ttf";
export const OG_IMAGE_WASM_PATH = "/resvg.wasm";

export type OgImageRenderInput = {
	title: string;
	date: Date;
	color: VitaColor;
};

export type OgImageAssetLoader = (path: string) => Promise<ArrayBuffer>;
export type OgImageRenderer = (
	input: OgImageRenderInput,
) => Promise<Uint8Array>;

type OgImageRendererOptions = {
	wordmarkSrc?: string;
	wasmModule?: WebAssembly.Module;
};

let wasmInitPromise: Promise<void> | undefined;
let fontPromise: Promise<ArrayBuffer> | undefined;

const loadFont = (loadAsset: OgImageAssetLoader) => {
	fontPromise ??= loadAsset(OG_IMAGE_FONT_PATH).catch((error) => {
		fontPromise = undefined;
		throw error;
	});
	return fontPromise;
};

const initResvg = (
	loadAsset: OgImageAssetLoader,
	wasmModule?: WebAssembly.Module,
) => {
	wasmInitPromise ??= (
		wasmModule
			? initWasm(wasmModule)
			: loadAsset(OG_IMAGE_WASM_PATH).then((wasmBuffer) => initWasm(wasmBuffer))
	).catch((error) => {
		wasmInitPromise = undefined;
		throw error;
	});
	return wasmInitPromise;
};

export const getWasmModule = (
	value: unknown,
): WebAssembly.Module | undefined => {
	if (value instanceof WebAssembly.Module) return value;

	if (
		typeof value === "object" &&
		value !== null &&
		"default" in value &&
		value.default instanceof WebAssembly.Module
	) {
		return value.default;
	}

	return undefined;
};

export const createOgImageRenderer = (
	loadAsset: OgImageAssetLoader,
	options: OgImageRendererOptions = {},
): OgImageRenderer => {
	return async ({ title, date, color }) => {
		const [font] = await Promise.all([
			loadFont(loadAsset),
			initResvg(loadAsset, options.wasmModule),
		]);

		const svg = await satori(
			createElement(OGImage, {
				title,
				date,
				color,
				wordmarkSrc: options.wordmarkSrc,
			}),
			{
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
			},
		);

		const resvg = new Resvg(svg, {
			fitTo: { mode: "width", value: 1200 },
		});

		try {
			const rendered = resvg.render();
			try {
				return new Uint8Array(rendered.asPng());
			} finally {
				rendered.free();
			}
		} finally {
			resvg.free();
		}
	};
};

export const createAssetOgImageRenderer = (
	assets: Fetcher,
	baseUrl: URL | string,
	wasmModule?: WebAssembly.Module,
): OgImageRenderer => {
	const url = new URL(baseUrl);
	const bundledWasmModule = getWasmModule(bundledResvgWasm);
	return createOgImageRenderer(
		async (path) => {
			const response = await assets.fetch(new URL(path, url));
			if (!response.ok) {
				throw new Error(`Failed to load OG asset ${path}: ${response.status}`);
			}
			return response.arrayBuffer();
		},
		wasmModule
			? { wasmModule }
			: bundledWasmModule
				? { wasmModule: bundledWasmModule }
				: undefined,
	);
};
