---
title: Unity のカットインのカメラワークを Blender で作る
date: 2025-12-23
tags:
  - blender
  - unity
draft: true
---
[農工大アドベントカレンダー2025](https://qiita.com/advent-calendar/2025/tuat)23日目の記事です。

ネタ切れではないのですが、今日までに終わるだろうと思っていた作業が全然進んでいないので唐突に Blender の話になりました。

## 背景

学祭に向けてUnityでゲームを作っており、キャラクターの入場カットインを担当していました。

昨年までは全てのカメラワークは Unity の Cinemachine (と Timeline) で作っていて、キャラクターアニメーションのみ Blender 製でした。しかし、カットインはできるだけ全部 Blender で作った方が良いのではないかと薄々感じ始め、カメラワークを Blender で作る方法と、Unity へ出力する方法を考えました。
