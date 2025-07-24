// @ts-check

import partytown from "@astrojs/partytown";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import react from "@astrojs/react";
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    expressiveCode({
      themes: ["andromeeda"],
styleOverrides: {
				frames: {
					frameBoxShadowCssValue: "none",
				},
			},
    }),
    icon(),
    partytown(),
    react(),
  ],
  markdown: {
    rehypePlugins: [],
  },
  image: {
    domains: [
      "raw.githubusercontent.com",
      "avatars.githubusercontent.com",
      "github.com",
    ],
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

