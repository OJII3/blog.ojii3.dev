---
title: AstroでClientRouterを使う上で詰まったこと
date: 2025-11-23
tags: [astro, web]
draft: false
---

## なぜClientRouterを使うのか

`View Transitions API`を使うために、`ClientRouter`を使う必要がありました。

## 詰まったこと

ページが読み込まれたタイミングで実行したいコードがありました。

`<script></script>`に直で関数を呼び出すコード及び`onload`イベントで呼び出すコードは、`ClientRouter`を使うとページ遷移のたびに実行されないようであるため、期待通りに動作しませんでした。

## 解決策

`astro:after-swap`イベントを使うことで、ページが読み込まれたタイミングでコードを実行できました。

```javascript
document.addEventListener('astro:after-swap', () => {
  // ページが読み込まれたタイミングで実行したいコード
});
```

## まとめ

Astroなんもわからんぞよ
