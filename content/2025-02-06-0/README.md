---
title: RicoShotまとめ
date: 2025-02-06
draft: false
---

## ゲーム概要

サークルで制作した文化祭向けゲームです。

待ち時間でキャラメイクから楽しめる！跳ね返るグミを上手く投げて相手に当てろ！みんなで同時対戦可能なシューティング！

まず、Webブラウザよりニックネームを登録します。好きな髪型や服、アクセサリー等を組み合わせてキャラメイクをしよう。発行されたQRコードを読み込ませるとゲームを始められるよ。どちらのチームに参加するか選んだら、コントローラーでキャラクターを操作して敵チームにグミを当てよう！

## リンク

GitHub(Unity): https://github.com/tuatmcc/SchoolFestival2024_Unity
GitHub(Web): https://github.com/tuatmcc/SchoolFestival2024_Frontend
プレイ動画(一部分): https://youtu.be/7DXXWY4bBso?feature=shared

## アチーブ

- 技育博vol.6 企業賞受賞

## 技術構成の概要

- Unity3D
  - C#
  - Zenject
  - NetCode for GameObject
  - R3
  - UniTask
- Web
  - TypeScript
  - Cloudflare Pages
  - Remix
  - React Three Fiber
  - Tailwind CSS
- DB, Auth
  - Supabase

## 私がやったこと(アピール)

- PM
  - 中心となって進めた。毎週オフライン会議を行い、個々の進捗の確認と次のタスクの割り振りを行った。後輩には実装の方針や参考になる記事等を与えつつタスクを振った。
  - Web側はプロジェクト開始後まもなく、時間的に私の手に余ることが予想されたため、よりフロントエンドが得意なメンバーに任せた。
- キャラクター作成
  - Blenderを用い、ゲームに使用するキャラクター5体のモデリングを行った。Boothよりお借りした人型の素体を改変し、加えて顔、髪、服、テクスチャ、リギング、モーフ等を作成した。
  - Blenderを用い、スポーンやリザルト時のモーションを複数パターン作成した。
  - UniVRMやliltoonでスプリングボーンやシェーダーを設定した。
  - Unity内でキャラメイク内容を反映しつつ共通のインターフェイスで扱えるようなクラス、プレハブ等を作成した。
  - Unity内でモーションを扱いやすくするためAnimatorControllerを作成した。
  - Web用に加工したglb出力データを渡し、React Three Fiberでのロードをお願いした。
- UIの実装
  - Unity標準のキャンバスを用いてUIを実装した。
  - DoTweenを用いてUIアニメーションをつけた。
- その他
  - 一部シーンのステート管理とZenjectを用いたDIを実装した。
  - より綺麗な実装のためプロジェクトに試験的にR3を導入した。
  - Cinemachineでいい感じのカメラワークを設定した。
  - Timelineでリザルトのアニメーションを作成した。
- おまけ
  - 後輩に刺激を受けさせるため技育博に連れて行った。

## まとめ

色々頑張りまくった。色々頑張りまくった他メンバーのおかげでもある。
