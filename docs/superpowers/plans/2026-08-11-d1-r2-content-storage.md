# D1/R2 Content Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub repositoryへの記事・画像依存を除去し、D1の記事とR2の画像をAstro Live Content Collectionから即時配信する。

**Architecture:** Drizzle ORMでD1 accessをrepositoryへ集約し、`blog` Live Collectionがrepositoryから記事を読み込む。管理画面の更新、画像upload、検索はAstro Actionsから同じrepositoryとCloudflare bindingsを使う。GitHub OAuthはBetter Authの認証にのみ残す。

**Tech Stack:** Astro 7, Astro Cloudflare adapter, Astro Live Content Collection, Drizzle ORM, Cloudflare D1, Cloudflare R2, Astro Actions, Zod, Wrangler, Bun.

---

## File Map

### Create

- `src/db/schema.ts`: Drizzle schema for `posts`, `tags`, and `post_tags`.
- `src/db/client.ts`: D1 bindingからDrizzle clientを作る関数とWorker binding型。
- `src/lib/content/repository.ts`: 記事一覧、slug取得、更新、検索のD1 repository。
- `src/lib/content/types.ts`: repositoryとLive loaderが共有する記事型。
- `src/lib/content/markdown.ts`: Markdown processorとR2画像URL変換。
- `src/loaders/d1-live.ts`: D1-backed Live Collection loader。
- `drizzle.config.ts`: Drizzle KitのD1設定。
- `drizzle/0000_create_content.sql`: 初回D1 migration。
- `scripts/migrate-content.ts`: ローカルcontent directoryからD1/R2へ移行するCLI。
- `src/pages/admin/_lib/auth/require-admin.ts`: Actions共通のsession検証。

### Modify

- `package.json`, `bun.lock`: Drizzle依存とmigration/migration検証script。
- `wrangler.jsonc`: `DB` D1 bindingと`MEDIA` R2 binding。
- `src/live.config.ts`: `blog` collectionをD1 loaderで定義。
- `src/content.config.ts`: 静的collection定義を削除。
- `src/actions/index.ts`: GitHub処理を除去し、D1/R2 Actionsへ置換。
- `src/pages/index.astro`: `getLiveCollection("blog")`へ移行。
- `src/pages/[slug]/index.astro`: SSR + `getLiveEntry("blog")`へ移行。
- `src/pages/[slug]/_layout/PostLayout.astro`: Live entryのHTMLと型に合わせる。
- `src/pages/[slug]/og-image.png.ts`: Live entryからOG imageを生成。
- `src/pages/admin/index.astro`, `src/pages/admin/edit/[slug].astro`, `src/pages/admin/preview/[slug].astro`: D1/Live Collectionへ移行。
- `src/pages/admin/_lib/blog-service.ts`, `load-content-listing.ts`, `load-editable-post.ts`, `types.ts`: GitHub clientをrepositoryへ置換し、`sha`を`revision`へ変更。
- `src/pages/admin/_lib/image-upload.client.ts`, `edit-post.client.ts`: Actionの新しい戻り値とrevision conflictへ対応。
- `src/pages/search/index.astro`, `_client.ts`, `_components/SearchForm.astro`, `_lib/getAllTags.ts`: PagefindをD1 searchへ置換。
- `astro.config.mjs`: Pagefind integration、GitHub用画像domain、不要な外部設定を削除。
- `src/pages/admin/_lib/github/`: 記事保存・画像URL・live loader関連を削除。OAuth関連は認証に必要な範囲だけ残すか削除する。
- `README.md`: D1/R2 setup、migration、local Worker手順を記載。

### Delete

- `src/loaders/github-glob.ts`
- `src/pages/admin/_lib/github/content.ts`
- `src/pages/admin/_lib/github/encoding.ts`
- `src/pages/admin/_lib/github/live-content-loader.ts`
- `src/pages/admin/_lib/github/rehype-image-url.ts`
- `src/pages/admin/_lib/github/rehype-image-url.test.ts`（新しいcontent URL transformer testへ移設）
- `src/content.config.ts`（静的collectionを完全に廃止）
- Pagefind専用の型とclient実装

---

### Task 1: D1 schema and bindings

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_create_content.sql`
- Modify: `package.json`, `wrangler.jsonc`, `README.md`
- Test: `src/db/schema.test.ts`

- [ ] **Step 1: Install Drizzle packages**

Run:

```bash
bun add drizzle-orm
bun add -d drizzle-kit
```

Expected: `package.json` and `bun.lock` contain both packages.

- [ ] **Step 2: Write the schema test**

Create a test that asserts the schema exposes the three tables and the required columns:

```ts
import { describe, expect, it } from "bun:test";
import { posts, postTags, tags } from "./schema";

describe("content schema", () => {

	it("defines the content tables", () => {
		expect(posts.slug.name).toBe("slug");
		expect(posts.revision.name).toBe("revision");
		expect(tags.name.name).toBe("name");
		expect(postTags.postSlug.name).toBe("post_slug");
	});
});
```

- [ ] **Step 3: Run the schema test and verify it fails**

Run: `bun test src/db/schema.test.ts`

Expected: FAIL because `src/db/schema.ts` does not exist yet.

- [ ] **Step 4: Implement the Drizzle schema**

Define SQLite tables with these columns and constraints:

```ts
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
	slug: text("slug").primaryKey(),
	title: text("title").notNull(),
	date: text("date").notNull(),
	draft: integer("draft", { mode: "boolean" }).notNull().default(false),
	body: text("body").notNull(),
	revision: integer("revision").notNull().default(1),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const tags = sqliteTable("tags", {
	name: text("name").primaryKey(),
});

export const postTags = sqliteTable(
	"post_tags",
	{
		postSlug: text("post_slug").notNull().references(() => posts.slug),
		tagName: text("tag_name").notNull().references(() => tags.name),
	},
	(table) => ({
		primaryKey: primaryKey({ columns: [table.postSlug, table.tagName] }),
	}),
);
```

- [ ] **Step 5: Implement the D1 client and environment type**

Export `type ContentEnv = { DB: D1Database; MEDIA: R2Bucket; MEDIA_BASE_URL: string }` and `createContentDb(env: Pick<ContentEnv, "DB">)`. The function must call `drizzle(env.DB, { schema: { posts, tags, postTags } })` and must not cache a client globally.

- [ ] **Step 6: Generate and inspect the migration**

Run:

```bash
bunx drizzle-kit generate
```

Expected: the generated migration creates `posts`, `tags`, `post_tags`, primary keys, and foreign keys. Move or rename the generated first migration to `drizzle/0000_create_content.sql` if necessary; do not hand-edit generated SQL except to preserve the checked-in migration name.

- [ ] **Step 7: Add Wrangler bindings**

Create the D1 database and R2 bucket before filling deployment identifiers:

```bash
bun wrangler d1 create blog-content
bun wrangler r2 bucket create blog-media
```

Add the returned D1 `database_id` and the R2 bucket name to `wrangler.jsonc`:

```jsonc
"d1_databases": [
	{
		"binding": "DB",
		"database_name": "blog-content",
		"migrations_dir": "drizzle"
	}
],
"r2_buckets": [
	{
		"binding": "MEDIA",
		"bucket_name": "blog-media"
	}
]
```

Add the `database_id` property to the D1 entry using the exact `database_id` returned by `bun wrangler d1 create blog-content`. The committed config must contain that real resource identifier.

- [ ] **Step 8: Apply the local migration and run the schema test**

Run:

```bash
bun wrangler d1 migrations apply blog-content --local
bun test src/db/schema.test.ts
```

Expected: migration succeeds and the schema test passes.

- [ ] **Step 9: Commit the database foundation**

```bash
git commit -m "feat: add D1 content schema"
```

### Task 2: Content repository

**Files:**
- Create: `src/lib/content/types.ts`, `src/lib/content/repository.ts`
- Test: `src/lib/content/repository.test.ts`

- [ ] **Step 1: Write repository tests against a local D1 database**

Cover these cases: list sorted by date descending, slug lookup, draft filtering, tags, search over title/body, tag filtering, successful revision update, and stale revision rejection. Use a test helper that applies `drizzle/0000_create_content.sql` to a local D1 database before each test.

The update test must assert the stale revision leaves both the post and its `post_tags` rows unchanged:

```ts
const result = await updatePost(db, {
	slug: "2025-01-01-0",
	revision: 1,
	title: "stale",
	date: "2025-01-01",
	tags: ["stale"],
	draft: false,
	body: "stale body",
});

expect(result).toEqual({ kind: "conflict" });
expect(await getPost(db, "2025-01-01-0")).toMatchObject({
	title: "original",
	revision: 2,
	tags: ["original"],
});
```

- [ ] **Step 2: Run the repository tests and verify they fail**

Run: `bun test src/lib/content/repository.test.ts`

Expected: FAIL because repository functions are not implemented.

- [ ] **Step 3: Define the shared content types**

Define:

```ts
export type ContentPost = {
	slug: string;
	title: string;
	date: Date;
	dateString: string;
	tags: string[];
	draft: boolean;
	body: string;
	revision: number;
};

export type UpdatePostInput = Omit<ContentPost, "date" | "dateString" | "revision"> & {
	date: string;
	revision: number;
};

export type UpdatePostResult =
	| { kind: "updated"; revision: number }
	| { kind: "conflict" }
	| { kind: "not-found" };
```

- [ ] **Step 4: Implement read queries**

Implement `listPosts(db, { includeDrafts })`, `getPost(db, slug)`, and `searchPosts(db, { query, tags, limit })`. Convert D1 date strings to `Date` and aggregate `post_tags` into `tags`. Public reads must add `draft = false`; search must cap the result at 50 rows.

- [ ] **Step 5: Implement the revision-guarded update**

Use a D1 batch containing:

1. `UPDATE posts ... WHERE slug = ? AND revision = ?`
2. `DELETE FROM post_tags WHERE post_slug = ? AND EXISTS (SELECT 1 FROM posts WHERE slug = ? AND revision = ?)`
3. One guarded `INSERT ... SELECT` per new tag, each with the same updated-revision existence condition

Return `conflict` when the update affects zero rows. Return the incremented revision on success. Do not update tags when the revision condition fails.

- [ ] **Step 6: Run repository tests and verify they pass**

Run: `bun test src/lib/content/repository.test.ts`

Expected: all repository tests pass, including the stale revision test.

- [ ] **Step 7: Commit the repository**

```bash
git commit -m "feat: add D1 content repository"
```

### Task 3: Markdown rendering and R2 image URLs

**Files:**
- Create: `src/lib/content/markdown.ts`, `src/lib/content/markdown.test.ts`
- Modify: `astro.config.mjs`
- Delete: `src/pages/admin/_lib/github/rehype-image-url.ts`, `src/pages/admin/_lib/github/rehype-image-url.test.ts`

- [ ] **Step 1: Move the image URL test to the content module**

Keep the existing cases for relative, `./` relative, absolute HTTP(S), root-relative, data URLs, multiple images, nested paths, non-image elements, and missing `src`. Change the expected URL from GitHub Raw to:

```text
https://media.blog.ojii3.dev/2024-01-01-0/image.png
```

Pass the base URL as an option rather than hard-coding it in the plugin.

- [ ] **Step 2: Run the transformer tests and verify they fail**

Run: `bun test src/lib/content/markdown.test.ts`

Expected: FAIL because the new module does not exist.

- [ ] **Step 3: Implement the URL transformer and processor**

Implement `createContentMarkdownProcessor({ mediaBaseUrl })`. It must use the current GFM and expressive-code settings, render Markdown to HTML, and rewrite only relative image `src` values. Build the object URL from `new URL(relativePath, `${mediaBaseUrl}/${slug}/`)` so spaces and nested paths are encoded correctly.

- [ ] **Step 4: Update image config**

Remove GitHub Raw domains from `astro.config.mjs`. Because the rendered HTML uses passthrough URLs, do not add R2 to Astro image optimization unless a component requires it.

- [ ] **Step 5: Run tests and commit**

Run: `bun test src/lib/content/markdown.test.ts`

Expected: all URL transformation cases pass.

```bash
git rm src/pages/admin/_lib/github/rehype-image-url.ts src/pages/admin/_lib/github/rehype-image-url.test.ts
git commit -m "feat: render content images from R2"
```

### Task 4: D1 Live Collection

**Files:**
- Create: `src/loaders/d1-live.ts`, `src/loaders/d1-live.test.ts`
- Modify: `src/live.config.ts`
- Delete: `src/loaders/github-glob.ts`, `src/content.config.ts`, `src/pages/admin/_lib/github/live-content-loader.ts`

- [ ] **Step 1: Write loader tests with an injected repository and markdown renderer**

Test that `loadCollection` returns entries with `id` equal to slug and data containing `path`, `content`, `html`, `title`, `date`, `dateString`, `draft`, `tags`, and `revision`. Test that `loadEntry` throws a not-found error for an unknown slug.

- [ ] **Step 2: Run loader tests and verify they fail**

Run: `bun test src/loaders/d1-live.test.ts`

Expected: FAIL because the loader does not exist.

- [ ] **Step 3: Implement the D1 loader**

Implement `d1LiveLoader()` using the shared repository and markdown processor. Export a loader with `name: "d1-live-loader"`, `loadCollection`, and `loadEntry`. Use the Worker request environment for `DB` and `MEDIA_BASE_URL`; do not clone files or call GitHub. Keep `draft` in the entry so admin preview can render it.

- [ ] **Step 4: Rename the live collection**

Change `src/live.config.ts` to export:

```ts
export const collections = {
	blog: defineLiveCollection({
		loader: d1LiveLoader(),
		schema: blogSchema,
	}),
};
```

Keep the existing title/date/tags/draft-derived color fields and add `content`, `html`, and `revision` to the live data schema.

- [ ] **Step 5: Remove static and GitHub loaders**

Delete the old static collection config and both GitHub loaders. Ensure `bunx astro sync` no longer generates a GitHub content loader reference.

- [ ] **Step 6: Run loader tests and commit**

Run: `bun test src/loaders/d1-live.test.ts`

Expected: all loader tests pass.

```bash
git rm src/content.config.ts src/loaders/github-glob.ts src/pages/admin/_lib/github/live-content-loader.ts
git commit -m "feat: load blog entries from D1"
```

### Task 5: Public routes and OG image

**Files:**
- Modify: `src/pages/index.astro`, `src/pages/[slug]/index.astro`, `src/pages/[slug]/_layout/PostLayout.astro`, `src/pages/[slug]/og-image.png.ts`
- Test: `src/pages/[slug]/route-data.test.ts`

- [ ] **Step 1: Add route data tests**

Test the public list filter and date sort, the slug lookup 404 behavior, and the previous/next calculation with draft entries excluded.

- [ ] **Step 2: Run route tests and verify they fail**

Run: `bun test 'src/pages/[slug]/route-data.test.ts'`

Expected: FAIL until route helper functions are extracted from the pages.

- [ ] **Step 3: Convert the home page to Live Collection**

Set `export const prerender = false`, call `getLiveCollection("blog")`, filter drafts, sort by date descending, and pass each entry to `PostCard`.

- [ ] **Step 4: Convert the slug page to SSR Live Entry**

Remove `getStaticPaths`, set `prerender = false`, read `Astro.params.slug`, call `getLiveEntry("blog", { id: slug })`, return a 404 response when missing, and compute previous/next entries from the public Live Collection.

- [ ] **Step 5: Render Live HTML in PostLayout**

Use `post.data.html` for the article body instead of `render(post)`. Preserve title, date, color, tags, draft, and navigation behavior.

- [ ] **Step 6: Convert the OG route**

Remove `getStaticPaths`, set the route to on-demand rendering, call `getLiveEntry("blog", { id: slug })`, and retain the existing Satori/Resvg output.

- [ ] **Step 7: Run route tests and commit**

Run: `bun test 'src/pages/[slug]/route-data.test.ts'`

Expected: all route behavior tests pass.

```bash
git commit -m "feat: render public pages from live blog collection"
```

### Task 6: Admin Actions and editor

**Files:**
- Create: `src/pages/admin/_lib/auth/require-admin.ts`, `src/actions/content-actions.test.ts`
- Modify: `src/actions/index.ts`, `src/pages/admin/_lib/blog-service.ts`, `src/pages/admin/_lib/load-editable-post.ts`, `src/pages/admin/_lib/types.ts`, `src/pages/admin/_lib/edit-post.client.ts`, `src/pages/admin/_lib/image-upload.client.ts`
- Delete: `src/pages/admin/_lib/blog-service.test.ts` after replacing it with repository/Action tests

- [ ] **Step 1: Write authentication and Action tests**

Cover unauthenticated `updatePost` and `uploadImage`, invalid MIME type, oversized file, invalid slug/path, successful update, and stale revision conflict. Mock `auth.api.getSession`, D1 repository, and R2 bucket at the boundary.

- [ ] **Step 2: Run the Action tests and verify they fail**

Run: `bun test src/actions/content-actions.test.ts`

Expected: FAIL because the new auth helper and D1/R2 handlers are not implemented.

- [ ] **Step 3: Implement the shared admin session helper**

Call `auth.api.getSession({ headers })` and throw `ActionError({ code: "UNAUTHORIZED" })` when no user exists. Do not retrieve or require a GitHub access token.

- [ ] **Step 4: Replace `updatePost`**

Define a JSON Action with Zod input `{ slug, frontmatter: { title, date, tags, draft }, body, revision }`. Normalize an ISO date to `YYYY-MM-DD`, call repository update, return `{ revision }` on success, throw `CONFLICT` on stale revision, and throw `NOT_FOUND` when the slug does not exist.

- [ ] **Step 5: Replace `uploadImage`**

Define a Form Action with `z.instanceof(File)`. Validate the allowed MIME list and 10MB limit, normalize the filename to a safe basename, avoid overwriting an existing R2 key, call `env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })`, and return `{ filename, path, url }`.

- [ ] **Step 6: Remove deployment Action**

Delete `triggerDeployHandler`, its GitHub imports, and its client call. Article updates must not dispatch GitHub events.

- [ ] **Step 7: Update editor state**

Change editable post metadata from `sha` to numeric `revision`. After successful update, replace the form dataset revision. On `CONFLICT`, show the existing reload message. Image upload must insert the returned `path` into Markdown, not a GitHub path.

- [ ] **Step 8: Run Action tests and commit**

Run: `bun test src/actions/content-actions.test.ts`

Expected: all auth, validation, upload, update, and conflict tests pass.

```bash
git commit -m "feat: manage content with D1 and R2 actions"
```

### Task 7: Admin pages and live preview

**Files:**
- Modify: `src/pages/admin/index.astro`, `src/pages/admin/edit/[slug].astro`, `src/pages/admin/preview/[slug].astro`, `src/pages/admin/_components/ContentTable.astro`, `src/pages/admin/_lib/load-content-listing.ts`
- Delete: GitHub-only content listing types and imports

- [ ] **Step 1: Write page data tests**

Test that the admin list includes draft posts, sorts by date descending, and links each row to `/admin/edit/{slug}` and `/admin/preview/{slug}`. Test that missing edit entries show the existing error state and missing preview entries return 404.

- [ ] **Step 2: Run the page tests and verify they fail**

Run: `bun test src/pages/admin/admin-data.test.ts`

Expected: FAIL until the page data helpers are moved off GitHub content items.

- [ ] **Step 3: Replace admin listing with D1 lightweight query**

Return a local `ContentListingEntry` containing `slug`, `title`, `dateString`, `draft`, and `revision`. Do not fetch or render article body for the dashboard.

- [ ] **Step 4: Replace editable post loading**

Read a D1 `ContentPost`, map it to `{ frontmatter, body, revision }`, and return `NOT_FOUND` for an unknown slug. Remove all GitHub headers/token logic.

- [ ] **Step 5: Replace preview loading**

Set `prerender = false`, call `getLiveEntry("blog", { id: slug })`, and allow draft entries. Remove GitHub token acquisition and `token` filter values.

- [ ] **Step 6: Run tests and commit**

Run: `bun test src/pages/admin/admin-data.test.ts`

Expected: all admin data tests pass.

```bash
git commit -m "feat: move admin pages to D1 content"
```

### Task 8: Live search and Pagefind removal

**Files:**
- Create: `src/pages/search/_lib/search-data.test.ts`
- Modify: `src/actions/index.ts`, `src/pages/search/index.astro`, `src/pages/search/_client.ts`, `src/pages/search/_components/SearchForm.astro`, `src/pages/search/_components/SearchResult.astro`, `src/pages/search/_lib/getAllTags.ts`, `astro.config.mjs`, `package.json`, `tsconfig.json`
- Delete: `src/types/pagefind.d.ts`

- [ ] **Step 1: Write search tests**

Test that query and tag filters are sent to `searchPosts`, draft results are not rendered, and an empty query/tag selection clears results.

- [ ] **Step 2: Run search tests and verify they fail**

Run: `bun test src/pages/search/_lib/search-data.test.ts`

Expected: FAIL because the search client still imports Pagefind.

- [ ] **Step 3: Implement the search Action call**

Replace the dynamic `/pagefind/pagefind.js` import with `actions.searchPosts({ query, tags })`. Render returned `{ slug, title, excerpt, dateString, color }` values using escaped DOM text assignments; set links to `/${slug}`.

- [ ] **Step 4: Load tags from the live D1 source**

Use the shared lightweight repository query in `SearchForm.astro` to provide current tag counts. Exclude draft posts.

- [ ] **Step 5: Remove Pagefind integration and dependencies**

Remove the `astro-pagefind` integration, its Vite external entry, package dependency, Pagefind type declaration, and `data-pagefind-*` attributes that no longer serve a purpose.

- [ ] **Step 6: Run search tests and commit**

Run: `bun test src/pages/search/_lib/search-data.test.ts`

Expected: all search tests pass and no source file imports `/pagefind/pagefind.js`.

```bash
git rm src/types/pagefind.d.ts
git commit -m "feat: replace Pagefind with live D1 search"
```

### Task 9: Migration CLI

**Files:**
- Create: `scripts/migrate-content.ts`, `scripts/migrate-content.test.ts`
- Modify: `package.json`, `README.md`

- [ ] **Step 1: Write parser tests**

Test a temporary source directory containing two slug directories, one draft, tags, an image with spaces in its filename, a nested image, and an unsupported non-image file. Assert the dry-run result includes every slug, image key, and unsupported file.

- [ ] **Step 2: Run migration tests and verify they fail**

Run: `bun test scripts/migrate-content.test.ts`

Expected: FAIL because the migration CLI does not exist.

- [ ] **Step 3: Implement source parsing**

Accept `--source SOURCE_DIR`, `--dry-run`, and `--remote`. For each directory matching `^\d{4}-\d{2}-\d{2}-\d+$`, parse `README.md` with gray-matter, normalize date/tags/draft, and enumerate every file other than `README.md`. Require `--remote` for production writes; without it, use Wrangler's local resources.

- [ ] **Step 4: Implement D1/R2 writes**

In non-dry-run mode, generate a temporary SQL file named by the script, execute it with `bun wrangler d1 execute blog-content --local|--remote --file SQL_FILE`, and upload each file with `bun wrangler r2 object put blog-media/{slug}/{relativePath} --file SOURCE_FILE --local|--remote`. Pass Wrangler arguments as an array to `Bun.spawn` so spaces in filenames remain safe. Preserve MIME types for known image extensions. Refuse to overwrite a post with a different body; report the slug as a conflict and exit nonzero.

- [ ] **Step 5: Implement verification output**

Print source article count, inserted article count, image count, skipped file count, duplicate slug list, and failed object list. Exit nonzero when any required article or image write fails.

- [ ] **Step 6: Run dry-run tests and commit**

Run:

```bash
bun test scripts/migrate-content.test.ts
bun run migrate-content -- --source ./content --dry-run
```

Expected: tests pass and dry-run prints all local content slugs without writing to D1/R2.

Add this package script before running the command:

```json
"migrate-content": "bun scripts/migrate-content.ts"
```

```bash
git commit -m "feat: add D1 and R2 content migration"
```

### Task 10: Remove GitHub storage and finalize deployment

**Files:**
- Modify: `src/auth.ts`, `src/pages/admin/_lib/github/index.ts`, `src/AGENTS.md`, `.github/workflows/deploy.yml`, `.env` documentation in `README.md`
- Delete: GitHub Contents client files and obsolete tests after all imports are removed

- [ ] **Step 1: Search for storage-related GitHub references**

Run:

```bash
rg -n 'OJII3/content|repoName|createContentClient|createOctokit|raw.githubusercontent|githubLiveLoader|github\(' src astro.config.mjs README.md .github
```

Expected: only GitHub OAuth provider/authentication references remain. Remove every article storage, image URL, repository dispatch, and content clone reference.

- [ ] **Step 2: Remove obsolete GitHub environment variables**

Keep `GH_APP_CLIENT_ID` and `GH_APP_CLIENT_SECRET` because GitHub OAuth remains. Remove any environment variable or README instruction that exists only for repository contents access.

- [ ] **Step 3: Update CI/deployment documentation**

Keep code push/PR deployment. Remove repository dispatch documentation and any build assumption that content is present in the checkout. Add D1 migration and `MEDIA_BASE_URL` setup instructions without putting secrets in the repository.

- [ ] **Step 4: Run the full verification suite**

Run:

```bash
bun test
bun run check
bun run build
bun wrangler d1 migrations apply blog-content --local
bun run migrate-content -- --source ./content --dry-run
```

Expected: 0 test failures, type/lint/format checks pass, build succeeds without cloning GitHub content, local migration applies, and dry-run reports all source articles.

- [ ] **Step 5: Run the local Worker smoke test**

Run: `bun run preview`

Verify manually:

- `/` lists non-draft D1 posts
- `/{slug}` renders Markdown and an R2 custom-domain image
- `/admin` lists draft and published posts
- `/admin/edit/{slug}` saves and updates revision
- stale revision shows conflict toast
- `/admin/preview/{slug}` renders draft content
- `/search` finds a newly updated title/body/tag without redeploy
- `/login` still starts GitHub OAuth

- [ ] **Step 6: Commit the removal and deployment cleanup**

```bash
git rm src/pages/admin/_lib/github
git commit -m "refactor: remove GitHub content storage"
```

- [ ] **Step 7: Push and update the existing PR**

```bash
gh pr comment 52 --body "実装計画と実装コミットを追加しました。`bun test`、`bun run check`、`bun run build`、local Worker smoke testの結果をPRへ追記します。"
```

The PR must not be merged until D1/R2 resources exist, migration dry-run output is reviewed, and the custom domain is active under the same Cloudflare zone/account.
