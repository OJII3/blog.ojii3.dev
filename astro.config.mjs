// @ts-check

import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField, passthroughImageService } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
// https://astro.build/config
export default defineConfig({
	site: "https://blog.ojii3.dev",
	vite: {
		plugins: [tailwindcss()],
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
		react(),
		sitemap(),
		pagefind(),
	],
	markdown: {
		gfm: true,
		rehypePlugins: [],
	},
	image: {
		domains: ["raw.githubusercontent.com", "github.com", "*.s3.amazonaws.com"],
		layout: "constrained",
		service: passthroughImageService(),
	},
	env: {
		schema: {
			GOOGLE_ANALYTICS_ID: envField.string({
				context: "client",
				access: "public",
				optional: true,
			}),
		},
	},
});
