---
title: HoYoverse ゲームを Linux に入れるなのです
date: 2024-12-01
tags:
  - linux
  - honkai
---
## 原神・崩壊3rd・崩壊スターレイル・Zenless Zone Zero on Linux

wineprefix や winecfg が大変なので、直で wine には触らないなのです。`Bottles` という wineprefix やら winecfg をいい感じに設定できるようなソフトを使うなのです。前に使っていた `Lutris` より良い感じな気がするなのです。

NixOS は nixpkgs にあるし、Arch Linux は AUR にあるなのです。

はじめに、私の環境を詳細に書いておくと、

- CPU: Ryzen 5 7000 シリーズ
- GPU: Raden Graphics (オンボード)
- DE: Hyprland ([aquamqrine](https://github.com/hyprwm/aquamarine)という独自レンダリングバックエンドベースのWayland DE)

なのでして、これがラップトップで、デスクトップは

- CPU: Intel 13th Core i5
- GPU: Nvidia RTX 3060
- DE: おなじ

なのです。

## セットアップ

各 Bottle がいわゆる Wineprefix にあたるなのでして、まずは ゲーム向けテンプレートを選んで HoYo という名前の Bottle を新しく作るなのです。

もちろん Bottle 内で任意の `.exe` を起動できるのですが、有名なゲームランチャーはコミュニティメンテナンスがされていて、HoYoLauncher もポチポチすればインストールできるなのです。

Settings を開くと、デフォルトで `soda` がランタイムに選ばれてるなのです。`soda` は `wine-ge` ベースらしいなのですが、`wine-sys` に切り替えても起動の可不可には影響なかったなのです。

一番大事な設定は Advanced Settings からグラフィックバックエンドをVulkanにすることなのです。これで DirectX を Vulkan に変換して動くようになるのだと思うなのです。ついでに、Run in Bottles Runtime も有効化するなのです。

## ゲームのインストールと起動

どのゲームもインストールはできるなのです。

ただ、正常に起動してプレイできたのは原神とゼンゼロだけだったなのです。崩壊シリーズはうまく起動できなかったなのです。

## Nvidia

X11 環境であれば同じ結果になると思うなのです。もちろん正しいドライバーはいるなのです。Nvidia 公式のオープンソースドライバーでもいい感じだと推測してるなのです。結局、 Vulkan が上手く動かないようで私のWayland環境ではインストールから怪しかったなのです。

でも実は、過去に同じ環境で Nvidia のプロプライエタリな Vulkan_beta ドライバーを使って原神が動いたことがあるなのです。GUIセッション自体が頻繁にクラッシュするようになってやめてしまったなのですが………

## 結論

なんだかんだ原神は動きそうな雰囲気が強いのです。Intel CPU (Tiger Lake) のラップトップを使っていた頃でも動いていたなのです。そもそもゲーム自体はタブレットでしか遊ばない派なので、気を取り直してこれからも遊んでいくなのです。
