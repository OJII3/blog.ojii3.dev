---
title: Hyprland に Plasma Browser Integration を入れた
draft: false
date: 2025-02-14
tags: [linux]
---

## Plasma Brwoser Integration とは

KDE Plasma というデスクトップ環境のコンポーネントの一つでChrome拡張とセットで使用します。
KRunner(ランチャー)からChromeのタブを直接開けたり、ブラウザ内の右クリックで簡単にKDE Connectで他デバイスに転送できます。

今回は、このKDE Connectとの連携が欲しかったため、本来KDE Plasmaとは関係のないHyprlandで動かそうと思いました

## Home Manager で設定を書く

Chrome拡張のNativeMessagingHostsという機能を使って通信しているので、パッケージからいい感じにシンボリックリンクを張るだけです。

私の`browser.nix`は以下のようになりました。

```nix
{ pkgs, ... }: {
  programs = {
    firefox.enable = true;
    google-chrome = {
      enable = true;
      commandLineArgs = [
        "--enable-features=UseOzonePlatform"
        "--ozone-platform=wayland"
        "--enable-wayland-ime"
      ];
    };
  };

  home.file.".config/google-chrome/NativeMessagingHosts/org.kde.plasma.browser_integration.json" = {
    source = "${pkgs.plasma-browser-integration}/etc/chromium/native-messaging-hosts/org.kde.plasma.browser_integration.json";
  };
  home.file.".local/share/applications/org.kde.plasma.browser_integration.desktop" = {
    source = "${pkgs.plasma-browser-integration}/share/applications/org.kde.plasma.browser_integration.desktop";
  };
}
```

## まとめ

これで Hyprland で動かしている KDE Plasma のコンポーネントは **kde connect**, **kde wallet**, **xembedsniproxy**, **plasma-browser-integration** になったなのです。
KDE Plasma 自体は苦手だけど便利なものは多いなのです。
