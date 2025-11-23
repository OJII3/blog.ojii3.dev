---
title: NixOSインストール時のエラーについて
date: 2025-04-27
tags: [nixos]
draft: false
---

エラーに遭遇したぞよ。


### エラー内容

NixOSインストール直後(非ライブ環境)にて、dotfilesを落としてきてビルドしようとしたところ、
`error: path '*******-linux-zen-6.14.**-modules-shrunk/lib' is not in the Nix store` というようなエラーがでました。


### 解決策

- https://discourse.nixos.org/t/issue-building-linux-kernel-modules-after-flake-update/62322

ここに載っていました。たぶんnixバイナリかデーモンが古かったためかと思われます。

サイトでは`shell.nix`を用意するのがSolutionとなっていましたが、私の場合以下のコマンドでも解決しました。

```sh
nix shell github:NixOS/nixpkgs/nixpkgs-unstable#{nix,nixos-rebuild}
```


## まとめ

isoは新しいものを使うべきぞよ！
