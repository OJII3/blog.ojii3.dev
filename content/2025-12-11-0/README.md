---
title: Astro Content Collection で外部の GitHub リポジトリを使うだけのローダー
date: 2025-12-11
draft: true
---

[農工大アドベントカレンダー2025](https://qiita.com/advent-calendar/2025/tuat) 11日目の記事です。

Astro の Content Collections のローダーをちょっぴり書いたよ、というお話。

## Content Collections とは

<https://docs.astro.build/en/guides/content-collections/#what-are-content-collections>

雑に言うと、マークダウンでブログを作るのが便利になる機能です。
例えば下の様に設定を書いておくと、`./src/data/blog/` 以下のマークダウンファイルをHTMLに変換しつつ構造化してTSを吐きだしてくれます。

```ts title="src/content/config.ts"
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
 loader: glob({
  pattern: "**/README.md",
  base: "./content",
  generateId: ({ entry }) =>
   entry
    .replace(/\\/g, "/")
    .replace(/\/README\.md$/i, "")
    .replace(/\.md$/, ""),
 }),
 schema: z
  .object({
   title: z.string(),
   tags: z.string().array().optional(),
   date: z.date(),
   draft: z.boolean().optional(),
  })
});

export const collections = { blog };
```

これはAstroビルトインの `glob` ローダーを使っています。

## マークダウンを外部リポジトリから読み込みたい

上の例だと、ブログ自体のリポジトリに全ての記事を書く必要がありますが、
開発と運用をきっちり分けたい場合、記事を別リポジトリに置きたいことがあります。

これを解決するための方法はいくつかあると思います。

- Git Submodule を使う
- npm-scripts などでビルド前に記事リポジトリをクローンしてくる
- Content Collections のローダーを自作する

上ふたつは簡単ですが、一番下の方法が一番 Astro っぽいですし、柔軟に対応できそうです。
今回は一番下の方法を紹介します。

## ローダーを自作?する

Astro のドキュメントにはカスタムローダーの作り方が載っています。

<https://docs.astro.build/en/guides/content-collections/#building-a-custom-loader>

...が、今回実はこれを読むまでもなく簡単に作れます。

要は本来 `glob` ローダーが走る直前に、外部リポジトリをクローンしてくれば良く、これは `glob` ローダーをラップする形で実装できます。

```ts title="src/loaders/github-glob.ts"
import { glob } from "astro/loaders";

export function github(pattern: string | string[], base: string) {
  ensureContentRepo();
  return glob({ pattern, base });
}

function ensureContentRepo() {
    // 外部リポジトリをクローンしてくる処理を書く
}
```

このカスタムローダーの返り値は `glob` ローダーの返り値と同じなので、ドキュメントを読むまでもないというわけです。
あとは、Content Collections の設定で `glob` の代わりに `github` ローダーを使うだけです。

```ts title="src/content/config.ts"
import { defineCollection, z } from "astro:content";
import { github } from "../loaders/github-glob";

const blog = defineCollection({
    loader: github("**/README.md", "./content"),
    schema: z
        .object({
            title: z.string(),
            tags: z.string().array().optional(),
            date: z.date(),
            draft: z.boolean().optional(),
        })
});

export const collections = { blog };
```

これで、外部リポジトリからマークダウンを読み込むローダーが完成です。

ちなみに、クローン処理は [simple-git](https://www.npmjs.com/package/simple-git) などのライブラリを使って書くこともできますし、
`node:child_process` から `execSync` をインポートして `execSync("git clone ...")` と書くこともできます。`

## おわりに

クローン処理を完全にAstroに任せられるので、ビルド前にスクリプトを走らせる必要がなくなり、非常に幸せです。

```
loader: NODE.ENV === "development"
    ? github("**/README.md", "./content")
    : glob({ pattern: "**/README.md", base: "./content" }),
```

みたいに、開発環境と本番環境でローダーを切り替えることも簡単にできます。

## おわりに

Astro 楽しいぞよ！いずれ Live Content Collection も使ってみたいぞよ！
