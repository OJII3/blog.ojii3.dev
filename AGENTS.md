# [blog.ojii3.dev](https://blog.ojii3.dev)

このリポジトリは [Astro](https://astro.build/) を使用して構築されたパーソナルブログサイトである. Bun をパッケージマネージャ/ビルドランタイムとして使用し、Cloudflare Workers にデプロイされる.

## 環境構築

AstroやローカルのCLI用の環境変数を設定する.

```sh
# .env
CLOUDFLARE_API_TOKEN=
BETTER_AUTH_URL=http://localhost:4321
BETTER_AUTH_SECRET=dummy # dummy only for astro build
GH_APP_CLIENT_ID=
GH_APP_CLIENT_SECRET=dummy # dummy only for astro build
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt 
```

以下のコマンドで自動的に読みこまれるようになる.

```sh
direnv allow
```

npmの依存関係をインストールする.

```sh
bun i
```

ランタイムで使用される環境変数を設定する.

```sh
# .dev.vars
BETTER_AUTH_SECRET=
GH_APP_CLIENT_SECRET=
```

## プロジェクト構造とモジュール構成

Astro のソースは `src/` にある.

- `pages/` はルートを定義する. ページになってしまうため、このディレクトリ内にコンポーネントを直接置くことはできない.
  - `/admin/*` は管理者ページであり、BetterAuth を使用して認証される.
  - 管理者ページでは、Experimental Live Collection および GitHub API を用いて動的にコンテンツを管理できる.
- `features/` はFeatureベースのページ内モジュールを保持する. 以下ディレクトリはFeatureごとに作成される.
  - `_layouts/` はページレイアウトを定義する.
  - `_components/` は共有 UI を保持する.
  - `_styles/` はカスタムスタイルを保持する. あまり使用しないこと. 可能な限り Tailwind を使用し、デザイントークンに追加修正して使用すること.
  - `_lib/` はヘルパーを保持する. ヘルパー関数を書く前に、適切なデータ構造を使用していることを確認すること.
- `constants/` はアプリケーション全体で使用される定数を保持する.

共有のビジュアルは `assets/` に属する. Markdown の記事は `content/` 配下の日付ディレクトリ (例: `2025-01-01-0/`) 内の `README.md` として配置され、`src/content.config.ts` からスキーマを継承する. 静的ファイルは `public/` を通じて配布する. 本番環境の出力は `dist/` に配置され、`wrangler.jsonc` の Worker 設定を通じてデプロイされる.

## ビルド、テスト、開発コマンド

- `bun install` — Bun で依存関係をインストールする.
- `bun dev` — ホットリロードで Astro 開発サーバーを起動する. Cloudflare Adapter を使用しているため、使用不可。
- `bun run build` — `dist/` に最適化されたバンドルを生成する.
- `bun preview` — Cloudflare を模倣するためにバンドルをローカルで提供する.
- `bun check` — プロジェクト全体で Biome/Prettier のリント/フォーマットチェックを実行する.
- `bun typecheck` — プロジェクト全体で TypeScript の型チェックを実行する.
- `bun format` — Biome/Prettier の修正をインプレースで適用する.

## コーディングスタイルと命名規則

適宜 `bun format` と `bun typecheck` を実行する.

Tailwind CSS を使用してスタイリングする際は、デザイントークンを使用・更新して一貫性・再利用性を保つこと.

また、コードが複雑になる場合は、関数の切り出しをするまえに、適切なデータ構造を使用していることを確認すること.

## コミットとプルリクエストのガイドライン

コミットは手動で行うため、勝手にコミットを行なってはならない。
チェックをしたのち Conventional Commits に従ったコミットメッセージのみ提示すること。

## その他

- ユーザーの確認・操作が必要な場合は、以下の方法で通知すること. 重複してよい.
    - voicvox-mcp が利用可能であれば、音声で報告。
    - MacOS であれば、`open raycast://confetti` を実行する.
    - MacOS であれば `terminal-notifier`、Linux であれば `notify-send` を使用してデスクトップ通知を送信する.
- 正確な情報を得るためにドキュメントのMCPを利用すること。
