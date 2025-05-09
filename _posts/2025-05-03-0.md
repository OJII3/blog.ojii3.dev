---
title: Neovim on Nix の Rust 補完直った
tags: [nix, vim]
date: 2025-05-03
draft: false
---

実はNixOSに移行してからRust書くの初めてだったかもしれないのです。

## 方法

home-manager option の `programs.neovim.extraPackages` に `rustc` と `cargo` を追加しました。(`rust-analyzer` は元から入っています)

## 想定される原因

Rust用プラグイン`rustaceanvim`が、プロジェクトの`Cargo.toml`を読むのに`rust-analyzer`だけだと足りなかったようです。

## おまけ

NixのRust環境に`rust-overlay`を使うのは、`nixpkgs`の`rustc`や`cargo`を使うと任意のバージョンを入れることができないからであって、今回の件では関係ありません。

ちなみに`rustaceanvim`を使う場合、`rust-analyzer`で`vim.lsp.config`や`vim.lsp.enable`をするとうまく動かなくなる可能性があります。

## 終わりに

補完が出るようになったおかげで一気にコーディングが進むなのです。
