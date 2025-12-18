---
title: ROS 2 で Unity でも Nix で幸せになりたい
date: 2025-12-20
tags:
  - nix
  - ros2
draft: true
---
[農工大アドベントカレンダー2025](https://qiita.com/advent-calendar/2025/tuat) の記事です。

## ROSとは

Robot Operating System (通称ROS) でございます。

ロボット作りに便利なオープンソースなミドルウェアでございます。「ROS」だと前身の「ROS(無印)」と紛らわしいのでちゃんと「_2」をつけてます。

## ROS なんて嫌いや

こちら5万年ぶりに触っています。苦しい。

苦しいポイントたくさん

- 公式サポート環境がUbuntu
  - しかもUbuntuのバージョンとROS 2のバージョンが密接に結びついているので、`ros2-humble` を使いたければ Ubuntu 22.04、`ros2-jazzy` なら Ubuntu 24.04 など。
  - あらゆるパッケージが古い。古い Ubuntu を使うとなると当然さらに古い。開発だけでも最新の環境が欲しい。
  - それ以外の環境は3rdパーティー製のものを使うか、自分でいい感じに移植したり橋渡ししたりしないといけない
  - Docker で Ubuntu 環境も作れるが、USBなりGPUなりネットワークなりGUIなり総合的に必要になって、結局開発もUbuntuを使わないとつらい
- 公式サポート言語は Python と C++
  - ament_cmake という拡張 cmake によるパッケージ管理とビルド
  - Ubuntu の Python っとガッツリ紐づいているため、uv との相性はイマイチ
- ビジュアライザなどのGUIアプリケーションも組めるよううなツールが揃っており、下手するとそこら辺の依存のバージョンが Blender の依存と衝突したりする

などなど。ROS にわかの身ですみません……

## Ros 2 For Unity

まだまだ行きます。

## nix-ros-overlay

そんなこんなで Ubuntu に `home-manager` を導入して誤魔化したりしていたところ、[nix-ros-overlay](https://github.com/lopsided98/nix-ros-overlay) と出会いました。

> Easily install the Robot Operating System (ROS) on any Linux distribution
Want to use ROS, but don't want to run Ubuntu? This project uses the power of Nix make to it possible to develop and run ROS packages in the same way on any Linux machine.

最高じゃあないですか。早速使わせていただきましょう。
