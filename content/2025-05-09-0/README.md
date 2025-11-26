---
title: dotfiles で環境変数に API KEY を設定する (with Nix)
tags: [nix, linux]
date: 2025-05-09
---

環境変数にGEMINI_API_KEYを設定したくなったぞよ。

## 前提・目標

- Home Manager で管理
- 環境(ホスト)を変えても最低限のセットアップですませる

```nix
programs.zsh.initExtra = ''
    export GEMINI_API_KEY=<ここをいいかんじにする>
'';
```

## 方法

以前は KDE Wallet に保存し、`kwallet-query` で取得していたのですが、ホストごとのkwalletに手動で保存する必要があったり、
MacでKDE Walletが使えなかったりしました。

また、こういった動的に読み込む手法では Nix で環境を再現した後でも壊れてしまう可能性があります。

ビルド時に環境変数を設定できると嬉しいので、 `sops-nix`を使用します。

## sops-nix

詳しくは[sops-nix](https://github.com/Mic92/sops-nix)を参照してください。

簡単に言うと、公開鍵で情報を暗号化したのち、dotfilesには公開鍵と暗号化済みの情報を保管しておき、Nixでビルドする際に、秘密鍵を使用して復号化します。

`age`か`gpg`で生成したキーのペアを使用しますが、`ssh-to-age`等により`openssh`の鍵も使用できます。

類似したものに、`agenix` がありますが、今回はGPGの鍵を使用したかったため、`sops-nix`を選択しました。

## 自分なりの鍵の管理方法について

私はGPG鍵を普段から管理して使用しています。具体的には、署名機能をもつ副鍵でGitの署名をしており、最近はSSHの鍵としても使用しています。

```nix
  programs.gpg.enable = true;
  services.gpg-agent = {
    sshKeys = [ "F99ACACA591A7E19F2199D390F92B2F1474C0D0E" ];
    enable = true;
    enableSshSupport = true;
  };
```

この主鍵をエクスポートして外部に保存してあるので、新たにホストをセットアップする際は、それを副鍵ごとインポートして使用しています。

同様の運用方法で、 今回は、暗号化専用の鍵を新たに作成し、全ホストで共通の鍵ペアを使用することにしました。(sops-nixの想定した使い方ではないような気もしますが)

## 手順

1. GPG鍵ペアを作成 (暗号化専用の鍵を新たに作成)

```sh
gpg --full-generate-key
```

種類は ECC で、曲線は `Curve 25519` を選択しました。パスフレーズは設定しません(すると`sops`が動かない) 2. Home Manager で設定を書きます

```nix
{ inputs, config, username, pkgs, ... }:
{
  imports = [
    inputs.sops-nix.homeManagerModules.sops
  ];

  sops = {
    defaultSopsFile = ../../assets/secrets/secrets.json;
    defaultSopsFormat = "json";
    gnupg.home = if pkgs.system == "aarch64-darwin" then "/Users/${username}/.gnupg" else "/home/${username}/.gnupg";
    gnupg.sshKeyPaths = [ ];
    secrets.gemini_api_key = { };
  };

  programs.zsh.initExtra = ''
    export GEMINI_API_KEY="$(<${config.sops.secrets.gemini_api_key.path})"
  '';
}

```

Mac対応のために若干汚なくなっています(多分もっときれいに書ける)。3. `home-manager`でビルドし、`echo $GEMINI_API_KEY`で確認4. `gpg --armor --export <主鍵の鍵ID>` で公開鍵をエクスポートし、他のホストでもインポート

全く新しいホストで初めてセットアップする際は、一旦`sops.nix`をインポートせずにビルドし、`gpg`がインストールされてから`sops.nix`をインポートする必要があります。

## まとめ

ホストごとに雑に鍵ペアを作成したくなかったから、いいかんじの着地点を見付けられてよかったぞよ！

## 追記

ホームディレクトリの指定は

```nix
sops.gnupg.home = "${config.home.homeDirectory}/.gnupg";
```

で良いです(ありがとうついったー)

また、`sops-nix.service`はデフォルトでは `graphical-session-pre.target`で起動するのですが、とくに追加の設定をしていないHyprlandやCLI環境だと起動しないので手を加えてあげます。

```nix
systemd.user.services.sops-nix = {
  Install = {
    WantedBy = [ "default.target" ];
  };
};
```
