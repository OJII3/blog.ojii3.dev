---
title: Astro + Pagefind でタグ絞り込みを実装する
date: 2025-11-26
tags: [astro, web]
---

[前回のPagefind導入](/2025-11-25-0)に引き続き、今回はタグ絞り込みの実装しました。

## タグの追加

Pagefindのfilter機能を用いて記事にタグを追加します。例えば、以下のようにします。

```astro title="PostLayout.astro"
   <ul class="my-8 flex flex-wrap gap-2">
    {
     tags?.map((tag) => (
      <span class:list={["px-2", TEXT_COLORS[color]]}>
       #<span data-pagefind-filter="tag">{tag}</span>
      </span>
     ))
    }
   </ul>
```

`data-pagefind-filter="tag"` の部分が重要で、Pagefindにこの要素がタグフィルターであることを伝えます。

## タグを優先的に検索する

PagefindのデフォルトUIでは、検索キーワードとタグの両方が指定された場合にのみ絞り込みが行われます。
しかし、ドキュメントを見るとタグのみでも検索結果を取得できることがわかります。

```js
const search = await pagefind.search(
    null, // 検索テキスト明示的にnullを渡す
    {
        filters: { tag: "tag1" }
    }
);
```

タグ絞り込みのUIは `<input type="checkbox" hidden>` を用い、`<label>` に見た目を書きました。

![タグ絞り込みUI](./image.png)

## 処理の分割

長いのでソースコードは貼りませんが。以下の流れで入力のハンドリングと検索処理を分割しました。

1. 検索結果をURLのクエリパラメーター `tag`, `q` に反映
2. テキスト入力の`input`イベントとタグ選択の`change`イベントでURLを更新&カスタムイベントを発火 (`window.dispatchEvent`)
3. カスタムイベントを受け取り、Pagefindの検索を実行

また、このリファクタリング作業の際、TSやビルドオプションを少々調整しつつPagefindの型を宣言し、 `<script is:inline>` 内でなくても使えるようにしました。
このあたりはまた別の記事で紹介したいと思います。

## まとめ

けっこうイイかんじぞよ！
