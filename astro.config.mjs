// @ts-check

import { fileURLToPath } from "node:url";

import cloudflare from "@astrojs/cloudflare";
import { unified } from "@astrojs/markdown-remark";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";

export const markdownConfig = {};

const resvgWasmPath = fileURLToPath(
	import.meta.resolve("@resvg/resvg-wasm/index_bg.wasm"),
);

// https://astro.build/config
export default defineConfig({
	site: "https://blog.ojii3.dev",
	output: "server",
	vite: {
		optimizeDeps: {
			include: [
				"astro/assets/services/noop",
				"astro-icon/components",
				"@iconify/utils",
			],
		},
		plugins: [
			tailwindcss(),
			{
				name: "resvg-wasm-module",
				enforce: "pre",
				resolveId(source) {
					if (source !== "@resvg/resvg-wasm/index_bg.wasm") {
						return undefined;
					}

					// Astro's Cloudflare integration does not route this package
					// subpath through its additional-module hook.
					return {
						id: `__CLOUDFLARE_MODULE__CompiledWasm__${resvgWasmPath}__CLOUDFLARE_MODULE__`,
						external: true,
					};
				},
			},
		],
	},
	integrations: [
		expressiveCode({
			themes: ["tokyo-night"],
			styleOverrides: {
				frames: {
					frameBoxShadowCssValue: "none",
				},
			},
			shiki: {
				engine: "javascript",
				bundledLangs: [
					"astro",
					"csharp",
					"diff",
					"javascript",
					"json",
					"nix",
					"python",
					"shell",
					"toml",
					"typescript",
					"yaml",
				],
			},
		}),
		icon({
			include: {
				tabler: [
					"alert-circle",
					"arrow-left",
					"arrow-right",
					"brand-github-filled",
					"device-floppy",
					"edit",
					"eye",
					"file-off",
					"home",
					"logout",
					"photo-up",
					"rocket",
					"search",
					"settings",
					"sun",
				],
			},
		}),
		partytown(),
		sitemap(),
	],
	markdown: {
		processor: unified(),
	},
	image: {
		domains: ["*.s3.amazonaws.com"],
		layout: "constrained",
	},
	adapter: cloudflare({
		prerenderEnvironment: "node",
		imageService: "passthrough",
	}),
	env: {
		schema: {
			GOOGLE_ANALYTICS_ID: envField.string({
				context: "client",
				access: "public",
				optional: true,
			}),
			GH_APP_CLIENT_ID: envField.string({
				context: "server",
				access: "public",
			}),
			GH_APP_CLIENT_SECRET: envField.string({
				context: "server",
				access: "secret",
			}),
			BETTER_AUTH_SECRET: envField.string({
				context: "server",
				access: "secret",
			}),
		},
	},
});
