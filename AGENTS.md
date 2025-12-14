# [blog.ojii3.dev](https://blog.ojii3.dev)

このリポジトリは [Astro](https://astro.build/) + Cloudflare Workers（`@astrojs/cloudflare` アダプター）で構築されたパーソナルブログサイト。パッケージマネージャ/ビルドランタイムは Bun。

## 環境構築

- Astro やローカル CLI 用の環境変数を `.env` に設定する.

```sh
# .env
CLOUDFLARE_API_TOKEN=
BETTER_AUTH_URL=http://localhost:4321
BETTER_AUTH_SECRET=dummy # dummy only for astro build
GH_APP_CLIENT_ID=
GH_APP_CLIENT_SECRET=dummy # dummy only for astro build
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt 
```

- `direnv allow` で自動読み込み。
- 依存関係をインストールする.

```sh
bun i
```

- Wrangler でのローカル実行用に `.dev.vars` を設定する.

```sh
# .dev.vars
BETTER_AUTH_SECRET=
GH_APP_CLIENT_SECRET=
```

## プロジェクト構造/主要ファイル

- `astro.config.mjs` — Tailwind CSS v4 (`@tailwindcss/vite`), astro-pagefind, expressive-code, partytown、astro-icon、sitemap を有効化。Cloudflare adapter で `/admin/*` をルーティングし、`liveContentCollections` を experimental で ON。`GOOGLE_ANALYTICS_ID` は client/public、GitHub/BETTER_AUTH 系は server/secret。
- `src/pages/`（Astro 制約でページ専用; ルートのみ）
  - `index.astro` — 記事一覧グリッド。`getCollection("blog")` を日付降順で表示。
  - `[slug]/index.astro` — 各記事ページ。prev/next を算出してレイアウトに渡す。`/[slug]/og-image.png.ts` で Satori+Resvg による OG 画像生成（`src/assets/MPLUSRounded1c-Bold.ttf` を同梱）。
  - `search.astro` — Pagefind クライアント検索画面。タグ絞り込み UI と結果表示。
  - `login.astro` — BetterAuth クライアント（GitHub ソーシャル）でログイン/ログアウト。
  - `admin/index.astro` — ログインユーザーの GitHub トークンを使い、リポジトリの `content` を Octokit で一覧表示（prerender: false）。`admin/edit/[slug].astro` で編集、`admin/preview/[slug].astro` でライブプレビュー。
  - `api/auth/[...all].ts` — BetterAuth の API ハンドラ（prerender: false）。
- `src/actions/`（Astro 制約でサーバーアクション専用; ルートのみ）
  - `index.ts` — `updatePost` サーバーアクション（GitHub upsert）。
- `src/app/` — グローバルレイヤー
  - `layouts/GlobalLayout.astro` — GA（Partytown 経由）、ClientRouter/Transitions、Favicon/Manifest 設定。
  - `components/` — ダークモード管理/ボタン、GA スニペット。
  - `styles/global.css` — Tailwind テーマ定義（フォント Hachi Maru Pop、breakpoint/spacing トークン、グレー/アクセントカラー、ダークモードトークン）、preflight 相当、コード装飾の override。
  - `middleware.ts` — `/admin` と `/api/auth` のみ BetterAuth でセッション取得し、未ログインは `/login` へ、ログイン済みの `/login` アクセスは `/admin` にリダイレクト。`Astro.locals` に `user`/`session` を格納。（Astro の探索のためエントリは `src/middleware.ts` に残すか re-export）
- `src/shared/` — 横断的な定数・型・ユーティリティ
  - `constants/` — サイト名/URL、7 色の `VitaColor` と HEX/TEXT/BORDER/BG/H2 ボーダーのマッピング。View Transitions 用の名前定数。
  - `types/` — Pagefind 型定義、`window._searchUrlChangeHandler` の global augment。
  - `utils/` — 日付→色計算などの純関数を集約。
- `src/blog/` — 公開ブログ UI
  - `layouts/PostLayout.astro`
  - `ui/` — Card/PostShell/PostHeader/PostPrevNext/TopCard/BottomCard、OGImage.tsx など。
  - `styles/override.css` — コードブロック記号を消す。
- `src/search/` — 検索機能
  - `ui/{SearchForm,SearchResult}.astro`
  - `client.ts` — `/pagefind/pagefind.js` を動的 import し、URL パラメータ同期 + 結果 DOM 生成。
  - `lib/{getAllTags,getPostBorderColorFromDate}.ts` — タグ集計/境界色計算。
- `src/admin/` — 管理/認証/GitHub 連携
  - `auth/auth-client.ts` — BetterAuth クライアント。
  - `github/{client,content,types,live-content-loader}.ts` — Octokit ラッパーと Live Loader。
  - `content-service/blog-service.ts` (+ test) — GitHub への CRUD。
  - `editor/{load-editable-post.ts,edit-post.client.ts,types.ts,_components/*.astro}` — エディタ UI とロジック。
- `src/config/`
  - `auth.ts` — BetterAuth サーバーセットアップ（GitHub ソーシャルプロバイダ）。
- `src/content.config.ts` — 静的コレクション `blog` を `content/**/README.md` から生成（frontmatter: `title`/`date`/`tags`/`draft`）。`dateString` 生成と `getDate() % 7` で `color` 付与、`draft` は `true/undefined` に正規化。（Astro の制約で `src/` 直下に配置）
- `src/live.config.ts` — GitHub Live Loader で `content/*/README.md` を動的取得。BetterAuth の GitHub アクセストークンを渡す。（Astro の制約で `src/` 直下に配置）
- `content/` — `YYYY-MM-DD-n/README.md` 形式の投稿。`data-pagefind-ignore` 用に draft を true/undefined で扱う。`.markdownlint.jsonc` で MD013/MD033 を無効化。
- `public/` — Favicon、manifest などの静的配布物。
- `dist/` — ビルド成果物。Worker エントリは `dist/_worker.js/index.js`（`wrangler.jsonc` で参照）。

## 主な機能のメモ

- 投稿データ: 日付の `getDate() % 7` で色決定 (`VitaColor`)。`PostLayout` は `astro:content.render` で md を描画し、タグは `data-pagefind-filter="tag"` で検索用に付与。OG 画像はルートで生成。
- 検索: `astro-pagefind` がビルド時に `/pagefind` バンドルを生成。`features/search/client.ts` が URL パラメータと結果 DOM を同期し、タグフィルタも対応。draft は `data-pagefind-ignore` で除外。
- 認証/管理: BetterAuth + GitHub ソーシャル。`getGitHubAccessToken` でアクセストークンを取得し、Octokit で `content` ディレクトリを CRUD。Live Collection 用 GitHub ローダーが frontmatter を読み込み、`AdminLivePostLayout` で HTML を表示。
- UI/スタイリング: Tailwind v4 テーマのカスタムトークンを利用し、追加 CSS は最小限（コードブロック記号消し）。View Transitions の名前は `constants/transition.ts` に集約、`ClientRouter` が `<head>` で有効化。ダークモードは localStorage + `documentElement` クラスで管理。
- Analytics/Partytown: GA タグは Partytown (`type="text/partytown"`) 経由でロード。

## 今後の拡張（管理画面: エディタとプレビューの分離）

- 目的: 認証済み（自分のみ想定）の管理 UI から Markdown 投稿の編集・追加・削除を行い、GitHub の `content` と整合を取る。
- アプローチの変更:
  - 以前はリアルタイムプレビュー（クライアントサイド変換）を検討していたが、実装複雑度を下げるため廃止。
  - **「編集（テキストのみ）」→「保存（GitHubへコミット）」→「プレビュー（Live Collection）」** というシンプルなサイクルを採用する。
- 構成要素:
  1. **エディタ画面 (`/admin/edit/[slug]`)**:
     - シンプルなテキストエリア、または軽量な Markdown エディタ（frontmatter と本文を分離して編集可能にする）。
     - **機能**: ロード（GitHubから取得）、編集、保存（GitHubへプッシュ）。
     - **状態管理**: 編集中の内容は IndexedDB に一時保存し、ブラウザクラッシュや誤操作によるデータ損失を防ぐ（あくまでバックアップ用）。
  2. **プレビュー画面 (`/admin/preview/[slug]`)**:
     - 保存完了後、このページへ遷移する。
     - 既存の `AdminLivePostLayout` を利用し、GitHub 上の最新データ（今保存したもの）をサーバーサイド（Astro + GitHub Live Loader）でレンダリングして表示。
     - これにより、本番環境とほぼ同一の見た目を保証しつつ、クライアントサイドでの Markdown 変換ロジックを不要にする。
- GitHub 反映フロー:
  - BetterAuth で取得した GitHub アクセストークン + Octokit で `content/YYYY-MM-DD-n/README.md` を upsert/delete。
  - 新規作成時はディレクトリ命名（日時+連番）ルールをユーティリティ化して再利用。
  - コミットメッセージ規約をローカルで統一（例: `chore(content): update post <slug>`）。
- 管理 UI の配置と責務:
  - `src/features/admin/editor/` にエディタ関連のロジックを集約。
  - `src/pages/admin/edit/[slug].astro` はエディタ、`src/pages/admin/preview/[slug].astro` はプレビューを担当。
  - 共通の GitHub 操作ロジック（Octokit ラッパー）は `src/features/admin/_lib/github/` を再利用・拡張する。

## ビルド、テスト、開発コマンド

- `bun install` — 依存関係をインストールする.
- `bun run build` — `dist/` に最適化バンドルを生成。
- `bun preview` — `wrangler dev --port 4321` で Cloudflare 環境を模倣（開発時はこれを使用）。`bun dev` は Cloudflare adapter のため利用不可。
- `bun check` — Biome/Prettier の lint/format チェック。
- `bun typecheck` — `astro check` + `tsc --noEmit`。
- `bun format` — Biome + Prettier を書き込みモードで実行。
- `bun markdownlint` — `content/**/*.md` の MarkdownLint を修正モードで実行。

## コーディングスタイルと命名規則

適宜 `bun format` と `bun typecheck` を実行する.

Tailwind CSS を使用してスタイリングする際は、デザイントークンを使用・更新して一貫性・再利用性を保つこと.

また、コードが複雑になる場合は、関数の切り出しをするまえに、適切なデータ構造を使用していることを確認すること.

UI ライブラリ（例: React, Vue, Svelte）は、やむを得ない理由がある場合を除き使用しないこと。使用が必要な場合は、その理由を明確にしてユーザーの確認を取ること。

## デプロイ/その他

- Cloudflare Workers へのデプロイを前提に `wrangler.jsonc` でエントリ/アセットバインドを定義済み。
- 画像ドメイン許可は `raw.githubusercontent.com`/`github.com`/`*.s3.amazonaws.com` を許可（OG 用など）。

## コミットとプルリクエストのガイドライン

コミットは手動で行うため、勝手にコミットを行なってはならない。
チェックをしたのち Conventional Commits に従ったコミットメッセージのみ提示すること。

## その他

- ユーザーの確認・操作が必要な場合は、以下の方法で通知すること. 重複してよい.
    - voicvox-mcp が利用可能であれば、音声で報告。
    - MacOS であれば、`open raycast://confetti` を実行する.
    - MacOS であれば `terminal-notifier`、Linux であれば `notify-send` を使用してデスクトップ通知を送信する.
- 正確な情報を得るためにドキュメントのMCPを利用すること。
