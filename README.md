# [blog.ojii3.dev](https://blog.ojii3.dev)

Astro と Cloudflare Workers を利用した個人ブログ. [ojii3/content](https://github.com/ojii3/content) にマークダウンを保存.

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

## D1/R2 Content Storage

記事は Cloudflare D1, 画像は R2 に保存する.

- ローカル migration: `bun wrangler d1 migrations apply blog-content --local`
- ローカル Worker 起動: `bun run preview`
- コンテンツ移行 dry-run: `bun run migrate-content -- --source ./content --dry-run`
- コンテンツ移行 (local): `bun run migrate-content -- --source ./content`
- コンテンツ移行 (remote): `bun run migrate-content -- --source ./content --remote`
  - remote 実行には明示的に `--remote` フラグが必要. デフォルトは local.
- 生成済み HTML のバックフィル: `bun run backfill-rendered-html -- --remote`
- OG画像のバックフィル: `bun run backfill-og-images -- --remote`
