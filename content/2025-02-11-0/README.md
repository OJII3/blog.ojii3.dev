---
title: ディスプレイマネージャーを見直した
date: 2025-02-11
draft: false
tags: [linux, unixporn]
---

...結局KDE Plasmaは肌に合わなさすぎてHyprlandぞよ。

## SDDM困ったちゃん

高速にログインするとセッションが正常に起動しないみたいです。

<https://github.com/NixOS/nixpkgs/issues/292980>

指紋認証ログイン導入してから一回ログインしてもログイン画面に戻るのが頻発したので、調べてみたところ、そんな話がありました。

とりあえずGDMに変えたら快適かな？

## まとめ

今回はここまでぞよ！
