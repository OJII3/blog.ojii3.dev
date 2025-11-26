---
title: ブログが崩壊したので作りなおした
date: 2025-07-25
tags: [astro, web]
---

## ブログが崩壊した

もともとのブログは、できるかぎり手抜きをしようと、GitHub Pages + Jekyll に Cloudflare でドメインを設定して運用していましたが、ちょっとしたカスタマイズも難しく、ぐちゃぐちゃに....

まぁ、ときどき崩壊ブログですから。

## Astro で作りなおす

Astro でブログのリニューアルをしている知人もいたので私も作りなおすことにしました。

機能を増やすのは面倒なので、シンプルさ重視でいきます。

### デザイン

...は分からないので Figma のワイヤフレームは適当です。

<img width="1352" height="643" alt="screenshot-20250725-144139" src="https://github.com/user-attachments/assets/03b57637-3ae5-4a71-84cf-c807998452ac" />

- レイアウト: シンプルということで、ヘッダー部分も記事と同じカード型でただgridで並べることにしました。
- 色: サイト全体のテーマカラーはなく、記事ごとに色が変わります。崩壊3rdより7人の小ヴィタたちのカラーを拝借しました。

<img width="444.5" height="250" alt="image" src="https://github.com/user-attachments/assets/e2b01ecf-f255-4970-a137-40c77d5e5c4a" />

### 実装

- マークダウン: Astroが変換してくれるので、[tailwindcss-typography](https://github.com/tailwindlabs/tailwindcss-typography) で手抜きスタイリング。
- OG: [Satori](https://github.com/vercel/satori) で生成。シンプルですが、記事のテーマ色ごとに若干変わります。
- リンターフォーマッター: biome は Astro の HTML 部分のフォーマットをしないので、prettier + biome
- CI/CD: 気がむいたらやる
- リンクカード: 気がむいたらやる
- 全文検索: 気がむいたらやる
- タグ: 気がむいたらやる

### 参考

- <https://github.com/shun-shobon/blog.s2n.tech>

## まとめ

ブログリニューアル記念に描いたヴィタさんを供養しておきます。

<img width="128" height="128" alt="image" src="https://github.com/user-attachments/assets/ad2ac855-ec1b-4f70-a08b-80dd9a9eabf2" />
