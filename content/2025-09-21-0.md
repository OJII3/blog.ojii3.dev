---
title: サーバーでKDE Connectを使う
date: 2025-09-21
draft: false
tags: [linux, nixos]
---

## 標準的な KDE Connect のセットアップ

(`home-manager` を使用した) 標準的なセットアップは以下のとおりです。

```nix
services.kdeconnect.enable = true;
```
## サーバー運用だと

このままでは起動しません。

`systemctl --user cat kdeconnect` や `systemctl --user status kdeconnect` 等をすると原因が分かります。

- `graphical-session.target` がないのでそもそも自動的に起動されない
- 起動しても dbus がないので `kdeconnectd` がエラーで終了する

## 対応策

`kdeconnectd -platform offscreen` でGUIのない環境でも動くらしいです。

あとは起動してほしいタイミングを踏まえて、systemd unitの設定を部分的に上書きするだけです。

```nix
  services.kdeconnect.enable = true;
  systemd.user.services.kdeconnect.Install.WantedBy = [ "default.target" ];
  systemd.user.services.kdeconnect.Service.ExecStart =
    lib.mkForce "${pkgs.kdePackages.kdeconnect-kde}/bin/kdeconnectd -platform offscreen";
```

簡単ですね。

注意点が2つあって、

- このサービスはユーザーにログインしないと起動しません(おそらく)。僕は自動ログインをしています。
- `kdeconnect-cli` がdbusに依存しているので使う場合はこれもまた何らかの回避策が必要となります

## まとめ

お家のミニPCをサーバー専用にしたから設定を更新したぞよ！
仕組みが分かってれば簡単ぞよ！
