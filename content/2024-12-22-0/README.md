---
title: Hono RPC を使いたい
date: 2024-12-22
draft: false
tags: [web]
---

## もちべ

Hono RPCを使いたいぞよ。サークル用にフロントエンドもセットでDiscord botを作りたいぞよ。どうせならフルスタックぽくしたいぞよ。全部Cloudflareに乗せてタダで動かしたいぞよ〜。

## 技術選定

確定事項

- Hono
- Cloudflare Workers & Pages
- (Next.js)

フロントエンドはNext.jsで慣れてるからNext.jsで使いたいぞよ。

モノレポにするならbun workspaceとturbo repoを試したいぞよ！

それかNext.jsに全部のせて、`@cloudflare/next-on-pages`か`opennext/cloudflare`で動かすぞよ！でもちゃんと動くか不安ぞよ……

---

追記: モノレポはいい感じだったぞよ！Hono RPC すごかったぞよ！Hono公式がSWRのサンプルこーど載せてて神だったぞよ！Auth.jsをあわせて動かそうとしたら上手くいかなかったぞよ……Hono, Auth.js, Cloudflare Workers & Pages, Next.jsの組み合わせが世の中に少なすぎるぞよ〜〜

追記: @opennext/cloudflareに全部のせてみたぞよ！うまく動かなかったぞよ！後でまたリベンジしてだめだったらnext-on-pagesで試すぞよー！
