// @ts-check

import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    expressiveCode({
      themes: ["github-light", "github-dark"],
      plugins: [
        {
          name: "Starlight Plugin",
          hooks: {
            postprocessRenderedBlock: ({ renderData }) => {
              renderData.blockAst.properties.className += " not-content";
            },
          },
        },
      ],
    }),
    icon(),
  ],
  markdown: {
    rehypePlugins: [],
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

