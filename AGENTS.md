# Repository Guidelines

## Project Structure & Module Organization
Astro source lives in `src/`: `pages/` defines routes, `layouts/` hosts wrappers, `components/` holds shared UI, and `lib/` keeps helpers. Shared visuals belong in `assets/` and `styles/`. Markdown posts sit under `content/blog/` and inherit schemas from `src/content.config.ts`. Ship static files through `public/`. Production output goes to `dist/` and is deployed via the Worker config in `wrangler.toml`.

## Build, Test, and Development Commands
- `bun install` — install dependencies with Bun (required runtime).
- `bun run dev` — start the Astro dev server with hot reload.
- `bun run build` — produce the optimized bundle in `dist/`.
- `bun run preview` — serve the bundle locally to mimic Cloudflare.
- `bun run check` — run Biome lint/format checks project-wide.
- `bun run format` — apply Biome fixes in-place.

## Coding Style & Naming Conventions
Use 2-space indentation and TypeScript syntax. Components, layouts, and hooks are PascalCase (`TopCard.astro`, `OGImage.tsx`); utilities or configs can stay lowerCamel or kebab case when that matches existing files. Tailwind classes should reuse the custom breakpoint prefixes already in the repo (`2x:`, `3x:`). Let Biome enforce spacing, import order, and unused-code rules (it now formats `.astro` templates); run `bun run format` before committing.

## Testing Guidelines
There is no automated test suite; rely on linting plus manual verification. Before pushing, run `bun run check`, `bun run build`, and `bun run preview` to catch runtime errors, layout issues, and Cloudflare-specific regressions. For content edits, review `http://localhost:4321/<slug>` via `bun run dev` and ensure metadata (date, OG image) is correct. Document manual QA steps in the PR so reviewers can repeat them.

## Commit & Pull Request Guidelines
Commits follow a loose Conventional Commit style (`feat:`, `chore:`, `fix:`) or short imperative messages (“Rename 2025-11-17 post”). Squash noisy WIP commits before pushing. Pull requests should include a summary, linked issues, screenshots for visual tweaks, commands executed (`bun run check`, `bun run build`), and notes on config or content migrations. Changes touching global layouts or deployment settings should request review from an Astro maintainer.

## Deployment & Configuration Notes
Cloudflare credentials and routes live in `wrangler.toml`; update secrets with `bun run wrangler secret put` rather than storing them in source. `@astrojs/sitemap` auto-builds the sitemap, so add new dynamic paths to `astro.config.mjs` when needed. Load third-party scripts through `@astrojs/partytown` to protect main-thread performance.
