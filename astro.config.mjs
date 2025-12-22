// @ts-check

import cloudflare from "@astrojs/cloudflare";
import partytown from "@astrojs/partytown";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import pagefind from "astro-pagefind";

/**
 * Expressive Code configuration shared between Astro integration and admin preview.
 * @type {import('astro-expressive-code').AstroExpressiveCodeOptions}
 */
export const expressiveCodeOptions = {
	themes: ["tokyo-night"],
	styleOverrides: {
		frames: {
			frameBoxShadowCssValue: "none",
		},
	},
};

/**
 * Shared markdown configuration for both Astro content and admin preview.
 * Note: For Astro content, syntaxHighlight is handled by expressiveCode integration.
 * For admin preview, we use rehype-expressive-code plugin directly.
 */
export const markdownConfig = {
	gfm: true,
	rehypePlugins: [],
};

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
					"node:async_hooks",
				],
			},
		},
	},
	integrations: [
		expressiveCode(expressiveCodeOptions),
		icon(),
		partytown(),
		sitemap(),
		pagefind(),
	],
	experimental: {
		liveContentCollections: true,
	},
	markdown: markdownConfig,
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
