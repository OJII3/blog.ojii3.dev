---
title: Astro Content Collection で外部の GitHub リポジトリを使う
date: 2025-12-11
draft: true
---

Astro の Content Collection はとても便利ですが、マークダウン記事を同一のリポジトリに置きたくないこと、ありますよね。

ちょっとした工夫で外部リポジトリを参照するようにできるのでまとめました。

## デフォルトのローダーについて

Content Collection はデフォルトで `glob` ローダーが使えます