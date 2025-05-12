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

今回は、暗号化専用の副鍵を新たに作成し、全ホストで共通の鍵ペアを使用することにしました。(sops-nixの想定した使い方ではないような気もしますが)

## 手順

鍵ペアの作成部分以外はドキュメント通りです。`sops-nix`をflakeに追加してください。

1. `gpg -K` にて主鍵のIDを確認
2. `gpg --expert --edit-key <鍵ID>` にて鍵の編集画面に入る
3. `addkey` で新たに鍵を追加
4. 鍵の種類について、`ECC (Encrypt Only)`を選択
5. `Curve 25519`を選択
6. 鍵の有効期限を選択(暗号化するだけの鍵なので、長めにしました)
7. パスフレーズを空欄で設定(パスフレーズが設定されていると、`sops-nix`で復号化できません)
8. `save` で鍵の編集を保存
9. `gpg -K --with-subkey-fingerprint` にて新たに作成した鍵の鍵指紋を確認
10. `.sops.yaml` にて、`pgp`の部分に新たに作成した鍵の鍵指紋を追加
11. `sops-nix`のドキュメントに従い、暗号化したいファイルの内容を記述し、暗号化
12. `sops.nix`等を作成し、`home-manager`で読み込む

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

Mac対応のために若干汚なくなっています(多分もっときれいに書ける)。

13. `home-manager`でビルドし、`echo $GEMINI_API_KEY`で確認
14. `gpg --armor --export <主鍵の鍵ID>` で公開鍵をエクスポートし、他のホストでもインポート

全く新しいホストで初めてセットアップする際は、一旦`sops.nix`をインポートせずにビルドし、`gpg`がインストールされてから`sops.nix`をインポートする必要があります。

## まとめ

ホストごとに雑に鍵ペアを作成したくなかったから、いいかんじの着地点を見付けられてよかったぞよ！

## 追記

```nix
sops.gnupg.home = "${config.home.homeDirectory}/.gnupg";
```

で良いです(ありがとうついったー)

また、`sops-nix.service`はデフォルトでは `graphical-session-pre.target`で起動するのですが、HyprlandやCLI環境だと起動しないので手を加えてあげます。

```nix
systemd.user.services.sops-nix = {
  Install = {
    WantedBy = [ "default.target" ];
  };
};
```
