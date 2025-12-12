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
- `src/pages/`
  - `index.astro` — 記事一覧グリッド。`getCollection("blog")` を日付降順で表示。
  - `[slug]/index.astro` — 各記事ページ。prev/next を算出してレイアウトに渡す。`/[slug]/og-image.png.ts` で Satori+Resvg による OG 画像生成（`src/assets/MPLUSRounded1c-Bold.ttf` を同梱）。
  - `search.astro` — Pagefind クライアント検索画面。タグ絞り込み UI と結果表示。
  - `login.astro` — BetterAuth クライアント（GitHub ソーシャル）でログイン/ログアウト。
  - `admin/index.astro` — ログインユーザーの GitHub トークンを使い、リポジトリの `content` を Octokit で一覧表示（prerender: false）。`admin/edit.astro` で Live Collection を GitHub 経由で読み込み。
  - `api/auth/[...all].ts` — BetterAuth の API ハンドラ（prerender: false）。
- `src/content.config.ts` — 静的コレクション `blog` を `content/**/README.md` から生成。frontmatter: `title`(string)、`date`(date)、`tags`(string[] optional)、`draft`(boolean optional)。`dateString` 生成と日付の `getDate() % 7` で決まる `color`（`VitaColor`）を付与し、`draft` は `true/undefined` に正規化。
- `src/live.config.ts` — GitHub Live Loader（`features/admin/_lib/github/live-content-loader`）で `content/*/README.md` を動的取得。認証トークンは BetterAuth で取得した GitHub アクセストークンを渡す。
- `src/features/`
  - `_layouts/GlobalLayout` — GA（Partytown 経由）、ClientRouter/Transitions、Favicon/Manifest 設定。
  - `_styles/global.css` — Tailwind テーマ定義（フォント Hachi Maru Pop、breakpoint/spacing トークン、グレー/アクセントカラー、ダークモードトークン）、preflight 相当、コード装飾の override。
  - `_components/` — ダークモード管理/ボタン、GA スニペット。
  - `posts/` — ホーム/記事ページ用 UI（カード、PostHeader/PrevNext/OGImage など）。`_styles/override.css` でコードブロック記号を消す。
  - `search/` — タグ集計/境界色計算ライブラリ、検索 UI。`client.ts` で `/pagefind/pagefind.js` を動的 import し、URL パラメータ（`q`/`tag`）同期 + 結果 DOM 生成。
  - `admin/` — BetterAuth クライアント、Octokit ラッパー、GitHub コンテンツ CRUD（`content` 配下のファイル/ディレクトリ操作）と Live Loader 実装。
- `src/constants/` — サイト名/URL、7 色の `VitaColor` と HEX/TEXT/BORDER/BG/H2 ボーダーのマッピング。View Transitions 用の名前定数。
- `src/middleware.ts` — `/admin` と `/api/auth` のみ BetterAuth でセッション取得し、未ログインは `/login` へ、ログイン済みの `/login` アクセスは `/admin` にリダイレクト。`Astro.locals` に `user`/`session` を格納。
- `src/auth.ts` — BetterAuth サーバーセットアップ（GitHub ソーシャルプロバイダ）。
- `src/types/` — Pagefind 型定義、`window._searchUrlChangeHandler` の global augment。
- `content/` — `YYYY-MM-DD-n/README.md` 形式の投稿。`data-pagefind-ignore` 用に draft を true/undefined で扱う。`.markdownlint.jsonc` で MD013/MD033 を無効化。
- `public/` — Favicon、manifest などの静的配布物。
- `dist/` — ビルド成果物。Worker エントリは `dist/_worker.js/index.js`（`wrangler.jsonc` で参照）。

## 主な機能のメモ

- 投稿データ: 日付の `getDate() % 7` で色決定 (`VitaColor`)。`PostLayout` は `astro:content.render` で md を描画し、タグは `data-pagefind-filter="tag"` で検索用に付与。OG 画像はルートで生成。
- 検索: `astro-pagefind` がビルド時に `/pagefind` バンドルを生成。`features/search/client.ts` が URL パラメータと結果 DOM を同期し、タグフィルタも対応。draft は `data-pagefind-ignore` で除外。
- 認証/管理: BetterAuth + GitHub ソーシャル。`getGitHubAccessToken` でアクセストークンを取得し、Octokit で `content` ディレクトリを CRUD。Live Collection 用 GitHub ローダーが frontmatter を読み込み、`AdminLivePostLayout` で HTML を表示。
- UI/スタイリング: Tailwind v4 テーマのカスタムトークンを利用し、追加 CSS は最小限（コードブロック記号消し）。View Transitions の名前は `constants/transition.ts` に集約、`ClientRouter` が `<head>` で有効化。ダークモードは localStorage + `documentElement` クラスで管理。
- Analytics/Partytown: GA タグは Partytown (`type="text/partytown"`) 経由でロード。

## 今後の拡張（Netlify CMS 風の管理 UI 構想）

- 目的: 認証済み（自分のみ想定）の管理 UI から Markdown 投稿の編集・追加・削除を行い、GitHub の `content` と整合を取る。
- Markdown エディタ候補:
  - 軽量: シンプルな `<textarea>` + プレビュー。キーボード中心で十分。
  - ミドル: Milkdown/TipTap など。リッチ性は不要なので依存を増やし過ぎない。
  - どれでも frontmatter を分離して保持できる構造にしておく。
  - ファイルアップロード（画像など）は別ハンドラ/ドラッグ&ドロップで検討。
  - 可能なら `astro:content.render` 相当のパイプラインを再利用してプレビューを生成（Live Collection をプレビュー用に活用）。
- Live Collection の活用:
  - GitHub Live Loader で読み込んだ生データをエディタ側に渡し、プレビュー用に `astro:content` と同じ Markdown パーサー/コンポーネントを使う。
  - 編集セッションでは Live Collection とは別に「編集中データ」を持ち、保存時に GitHub へ upsert/delete。
  - Draft の扱いを厳密に（`draft: true` ⇔ `data-pagefind-ignore`）。
- 一時保存と永続化:
  - GitHub に毎回コミットは頻度が過多になるため、まずはブラウザ IndexedDB にオフライン下書きを保存。
  - 代替案として Cloudflare D1/R2 などサーバー側に下書きストレージを置き、アクセストークンと紐付ける（要スキーマ設計とローテーション）。
  - いずれの場合も GitHub との「最終コミット SHA」を保持し、衝突検知/警告を入れる。
- GitHub 反映フロー:
  - BetterAuth で取得した GitHub アクセストークン + Octokit で `content/YYYY-MM-DD-n/README.md` を upsert/delete。
  - 新規作成時はディレクトリ命名（日時+連番）ルールをユーティリティ化して再利用。
  - コミットメッセージ規約をローカルで統一（例: `chore(content): update post <slug>`）。
- 管理 UI の配置と責務:
  - `src/features/admin/editor/` といったディレクトリを切り、エディタ/プレビュー/ファイルツリー/アップロード UI を整理。
  - ルーティングは `/admin/*` 配下に追加。middleware での認証保護を継続。
  - 状態管理は極力ローカル（per-page state）で完結させ、API 呼び出し部分を薄い層に分離。

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
