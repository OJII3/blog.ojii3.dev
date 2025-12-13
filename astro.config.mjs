// @ts-check

import cloudflare from "@astrojs/cloudflare";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
// https://astro.build/config
export default defineConfig({
	site: "https://blog.ojii3.dev",
	vite: {
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				external: [
					"/pagefind/pagefind.js",
					"@resvg/resvg-js",
					"node:fs/promises",
				],
			},
		},
	},
	integrations: [
		expressiveCode({
			themes: ["tokyo-night"],
			styleOverrides: {
				frames: {
					frameBoxShadowCssValue: "none",
				},
			},
		}),
		icon(),
		partytown(),
		sitemap(),
		pagefind(),
	],
	experimental: {
		liveContentCollections: true,
	},
	markdown: {
		gfm: true,
		rehypePlugins: [],
	},
	image: {
		domains: ["raw.githubusercontent.com", "github.com", "*.s3.amazonaws.com"],
		layout: "constrained",
	},
	adapter: cloudflare({
		routes: {
			extend: {
				include: [{ pattern: "/admin/*" }, { pattern: "/api/*" }],
			},
		},
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
