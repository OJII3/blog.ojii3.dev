---
title: AdGuardHome を導入した
date: 2025-08-29
draft: false
tags: [nix, linux]
---

## DNSフィルタリングについて

デフォルトのDNSサーバーの代わりにDNSフィルタリング機能をもつDNSサーバーを指定しておくことで広告やトラッキングをブロックできます。

今までは NextDNS というサービスを Tailsclae とつなげて利用していました。

## 脱 NextDNS を目指して

NextDNS は基本無料ですが、一ヶ月のクエリ数に上限があります。課金してもそこまで高くないのですが、サブスクを増やしたくないので自前で代替することにしました。

月末の広告貫通期間がしんどい……！

## AdGuard Home のセルフホスト

幸いなことに、おうちミニPCを稼働させているので、そこで AdGuard Home をセルフホストします。

Tailscale の DNS に AdGuard Home をホストしているマシンのアドレスを指定するだけなので楽ですね。NixOSの設定から `system.resolved = false` にして 53 番ポートをフリーにしてから `services.adguardhome.enable = true` でサービスを立てるだけです。

## おわりに

本当は Proxmox と k3s で遊びつつその上に AdGuard Home を乗っけたかったのですが、月末になり広告が耐えられなくなったので楽な方法で急遽用意したなのです。
