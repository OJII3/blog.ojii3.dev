// @ts-check

import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
// https://astro.build/config
export default defineConfig({
  site: "https://blog.ojii3.dev",
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
    sitemap(),
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

