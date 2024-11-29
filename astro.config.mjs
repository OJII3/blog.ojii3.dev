import starlight from "@astrojs/starlight";
// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import starlightBlogPlugin from "starlight-blog";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      sidebar: [
        {
          label: "blog/2024",
          autogenerate: { directory: "2024" },
        },
      ],
      title: "晴れときどき崩壊の日々",
      social: {
        github: "https://github.com/ojii3",
        "x.com": "https://x.com/ojii3dev",
      },
      logo: {
        src: "./src/assets/icon.png",
      },
      favicon: "/favicon.ico",
      customCss: ["./src/styles/custom.css", "./src/styles/tailwind.css"],
      plugins: [starlightBlogPlugin()],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
