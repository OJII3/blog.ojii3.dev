---
title: AstroでCMSを作りたい vol.1
date: 2025-12-17
tags:
  - nix
draft: true
---
[農工大アドベントカレンダー](https://qiita.com/advent-calendar/2025/tuat)17日目です。勝手にシリーズ2を生やしました。

## Nix とはなんぞや

Unix系のOSなら大抵どこでもで使えるパッケージマネージャーです。大変お気に入り。

気になる方はこちらをどうぞ[https://zenn.dev/asa1984/books/nix-introduction/viewer/02-what-is-nix](Nixとは何か)

## gwq とは……の前に、git worktree について

`git`のサブコマンドに`worktree`というのがあります。
