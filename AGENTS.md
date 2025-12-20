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

## 手順

- ロジックの実装は、先にテストを書く。テストには `bun test` を使用する。
- 変更を加えたら、`bun format`、`bun typecheck`、`bun test` を実行して問題がないことを確認する。
- コードを見直し、リファクタリングを行う。
    - 冗長なコードは削除する。
    - 複雑な処理は関数に切り出す。
    - 各関数やモジュールが単一の責任を持つようにする。
    - 関連性の高いコードは同じフォルダやモジュールにまとめる。
- 変更をコミットし、プルリクエストを作成する。main ブランチへの直接コミットは禁止。
- 変更箇所に応じて、`src/AGENTS.md` を更新する。`

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

パフォーマンスのため、UI ライブラリ（例: React, Vue, Svelte）は使用しないこと。

## コミットとプルリクエストのガイドライン

main ブランチへの直接コミットは禁止。必ずブランチを切りプルリクエストを作成すること。
チェックをしたのち Conventional Commits に従ったコミットメッセージのみ提示すること。

## その他

- ユーザーの確認・操作が必要な場合は、以下の方法で通知すること. 重複してよい.
    - voicvox-mcp が利用可能であれば、音声で報告。
    - MacOS であれば、`open raycast://confetti` を実行する.
    - MacOS であれば `terminal-notifier`、Linux であれば `notify-send` を使用してデスクトップ通知を送信する.
- 正確な情報を得るためにドキュメントのMCPを利用すること。
