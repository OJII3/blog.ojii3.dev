# [blog.ojii3.dev](https://blog.ojii3.dev)

Astro と Cloudflare Workers で動く個人ブログです。記事は Cloudflare D1、画像は R2 に保存しています。

## 技術スタック

- Astro（SSR）
- TypeScript
- Tailwind CSS / daisyUI
- Cloudflare Workers / D1 / R2
- Drizzle ORM
- Bun

## 開発

```sh
bun install
bun run dev
```

Worker 環境で確認する場合:

```sh
bun run preview
```

チェックとテスト:

```sh
bun run check
bun test
```
