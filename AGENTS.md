# [blog.ojii3.dev](https://blog.ojii3.dev)

こ.リポジトリは [Astro](https://astro.build/) を使用して構築されたパーソナルブログサイトである. Bun をパッケージマネージャ/ビルドランタイムとして使用し、Cloudflare Workers にデプロイされる.

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
- `features/` はFeatureベースのページ内モジュールを保持する. 以下ディレクトリはFeatureごとに作成される.
  - `_layouts/` はページレイアウトを定義する.
  - `_components/` は共有 UI を保持する.
  - `_styles/` はカスタムスタイルを保持する. あまり使用しないこと. 可能な限り Tailwind を使用し、デザイントークンに追加修正して使用すること.
  - `_lib/` はヘルパーを保持する. ヘルパー関数を書く前に、適切なデータ構造を使用していることを確認すること.
- `constants/` はアプリケーション全体で使用される定数を保持する.

共有のビジュアルは `assets/` に属する. Markdown の記事は `content/` 配下の日付ディレクトリ (例: `2025-01-01-0/`) 内の `README.md` として配置され、`src/content.config.ts` からスキーマを継承する. 静的ファイルは `public/` を通じて配布する. 本番環境の出力は `dist/` に配置され、`wrangler.jsonc` の Worker 設定を通じてデプロイされる.

## ビルド、テスト、開発コマンド

- `bun install` — Bun で依存関係をインストールする.
- `bun run dev` — ホットリロードで Astro 開発サーバーを起動する. Cloudflare Adapter を使用しているため、使用不可。
- `bun run build` — `dist/` に最適化されたバンドルを生成する.
- `bun run preview` — Cloudflare を模倣するためにバンドルをローカルで提供する.
- `bun run check` — プロジェクト全体で Biome/Prettier のリント/フォーマットチェックを実行する.
- `bun run format` — Biome/Prettier の修正をインプレースで適用する.

## コーディングスタイルと命名規則

インデントにはタブ文字を使用し TypeScript 構文を使用する. コンポーネント、レイアウト、フックは PascalCase (`TopCard.astro`, `OGImage.tsx`) を使用し、ユーティリティや設定は、既存のファイルと一致する場合は lowerCamel または kebab-case のままにできる. Tailwind クラスは、リポジトリに既に存在するカスタムブレークポイントプレフィックス (`2x:`, `3x:`) を再利用する必要がある. コミットする前に `bun run format` を実行する.

Astro コンポーネントでは、Props に明示的な型を付ける. クライアントでの動的な処理は、`<script>` タグ内に記述する必要があり、基本的には TypeScript を使用するが、静的に評価できないスクリプトは `is:inline` 属性を使用して Astro の最適化から除外し、JavaScript で記述する必要がある.

## テストガイドライン

自動テストは存在しない。`bun run check` を使用して、リンティングと型チェックを行い。動作確認が必要であれば、目的と確認箇所を明確にして提示すること.

## コミットとプルリクエストのガイドライン

コミットメッセージは Conventional Commits に従う。機能ごとの小さな粒度で、`bun run format` を実行してからコミットを行う。コミットは手動で行うため、コミットメッセージの提案のみ生成して提示すること.

## その他

- ユーザーの確認・操作が必要な場合は、以下の方法で通知すること. 重複してよい.
    - voicvox-mcp が利用可能であれば、音声で報告。
    - MacOS であれば、`open raycast://confetti` を実行する.
    - MacOS であれば `terminal-notifier`、Linux であれば `notify-send` を使用してデスクトップ通知を送信する.
- 正確な情報を得るためにドキュメントのMCPを利用すること。
