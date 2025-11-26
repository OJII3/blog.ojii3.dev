---
title: Arch Linux + Home Manager で pinentry が正しく動作しない
date: 2025-05-11
tags: [linux, nix]
---

pinentryがダブってるぞよ！

## 経緯

Arch Linux (WSL) に Nix を入れて HomeManager で環境を管理しています。
`git` の設定でコミットする時に`gpg`で署名されます。
このCLIだけの環境で想定される挙動としては、鍵の使用時にターミナル上にプロンプトが出て、パスフレーズを入力する、という流れです。

ところが、`git commit` しようとすると `gnupg` が `pinentry` がないとエラーを出します。

## 詰まったところ

- ちゃんとpinentryパッケージを指定し、インストールされている

```nix
  services.gpg-agent.pinentryPackage = pkgs.pinentry-tty;
```

- `pinentry` コマンドが動く

## 原因？

```sh
which pinentry
>> /usr/sbin/pinentry
```

どうやら HomeManager でインストールした pinentry じゃなさそうじゃないですか〜

これは `pacman` の依存の `gnupg` の依存で入ってきたやつですね。

## 対策

上書きしてやりましょう(雑)

```nix
{ pkgs, ... }: {
  imports = [ ./. ];
  services.gpg-agent.pinentryPackage = pkgs.pinentry-tty;

  programs.zsh.initExtra = ''
    alias pinentry=${pkgs.pinentry-tty}/bin/pinentry
  '';
}
```

HomeManagerをビルドし直したら`gpg-agent`のデーモンを再起動してあげます。

```sh
gpgconf --kill gpg-agent
```

## まとめ

直ったぞよ！
