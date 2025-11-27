---
title: Astro + Pagefind を TypeScript で書きたい
date: 2025-11-27
tags: [astro, web]
---

[前回はPagefindでタグ絞り込みを実装](/2025-11-25-0)しました。

このとき、案外コード量が多くなったので、`<script is:inline>` で JavaScript を長々と書かなくて済むようにしたというのが今回のお話になります。

## そもそもなんで JavaScript を書いていたのか

Pagefind の性質として、ビルド後にインデックスを生成し、`/pagefind/pagefind.js` にモジュールを配置します。

Pagefind の API を使う場合には、この `/pagefind/pagefind.js` を動的インポートして使う必要があります。

```js
const pagefind = await import("/pagefind/pagefind.js");
const search = await pagefind.search("static");
```

これを Astro の `<script>` タグにそのまま書こうとすると、

1. Vite がモジュールの解決をできずにエラーになる
2. 型情報がないので補完が効かない & TypeScript がエラーを吐く

という問題が発生します。`<script is:iniline>` を使うと Astro がスクリプトをそのままHTMLに埋めこむので、動くようにはなりますが、`is:inline` の中では JS しか使えません。

このモジュール解決と型情報のふたつの問題を順番に解消していきます。

## Vite にモジュール解決させる

Astro のコンフィグに Vite のビルド設定を指定できるので、`/pagefind/pagefind.js` を外部モジュールとして扱うように指定します。

```js title="astro.config.mjs"
export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				external: ["/pagefind/pagefind.js"],
			},
		},
	},
    ...
```

これで `is:inline` 書いても動作はするようになるはずです。

## TypeScript の型情報を追加する

まずは自分で型情報を書く必要があります。というわけで `Gemini 3 Pro` にドキュメントを渡して型定義を書いてもらいました。

```ts title="src/types/pagefind.d.ts"
export interface PagefindResult {
  id: string;
  data: () => Promise<{
    url: string;
    excerpt: string;
    meta: {
      title: string;
      date: string;
      image?: string;
      [key: string]: unknown;
    };
    content: string;
    sub_results: {
      title: string;
      url: string;
      excerpt: string;
    }[];
  }>;
}

interface Pagefind {
  search: (
    query: string | null,
    options?: {
      filters?: {
        tag?: string | string[];
        [key: string]: string | string[] | undefined;
      };
      sort?: Record<string, "asc" | "desc">;
    },
  ) => Promise<{
    results: PagefindResult[];
  }>;
  options: (options: {
    bundlePath?: string;
    [key: string]: unknown;
  }) => Promise<void>;
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  filters: () => Promise<Record<string, Record<string, number>>>;
  preload: (
    query: string,
    options?: { filters?: Record<string, unknown> },
  ) => Promise<void>;
}

declare module "/pagefind/pagefind.js" {
  export const search: Pagefind["search"];
  export const options: Pagefind["options"];
  export const init: Pagefind["init"];
  export const destroy: Pagefind["destroy"];
  export const filters: Pagefind["filters"];
  export const preload: Pagefind["preload"];
}
```

この型定義ファイルを `/pagefind/pagefind.js` の型情報として TypeScript に認識させることで、補完が効くようになります。

```json title="tsconfig.json"
{
    ...,
	"compilerOptions": {
		"paths": {
			"/pagefind/pagefind.js": ["./src/pagefind.d.ts"]
		},
		"jsx": "react-jsx",
		"jsxImportSource": "react"
	},
    ...
}
```

これでエディタ的にもエラーが消えました。(TypeScript詳しくないので間違ってるかも)

## まとめ

TSで書けるようになったので、`.ts` ファイルに分離することもできてしあわせなのです。
