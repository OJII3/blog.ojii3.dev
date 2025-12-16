---
title: gwq を nix で入れる
date: 2025-12-17
tags:
  - nix
draft: false
---
[農工大アドベントカレンダー](https://qiita.com/advent-calendar/2025/tuat)17日目です。書くことが溢れてきたので勝手にシリーズ2を生やしました。

## gwq is 何

> Git worktree manager with fuzzy finder - Work on multiple branches simultaneously, perfect for parallel AI coding workflows

git worktree を [ghq](https://github.com/x-motemen/ghq) のような使い勝手にするやつです。

弊サークル(MCC)では ghq を知らない&使ってない人がほとんどかと思いますが、とても便利なのでターミナルをよく使う人にオススメです。

紹介記事↓この辺とか

[6歳娘｢パパ、プロジェクトフォルダを見つけるのに何時間かけるの？｣【ghq+fzf+zsh】](https://qiita.com/tomoyamachi/items/e51d2906a5bb24cf1684)

## git worktree とは

`git`のサブコマンドに`worktree`というのがあります。

AI Agent の流行りで注目されてるので、"git worktree" と調べると結構最近の日本語の記事がたくさん出てきます。

Claude Code の Common Workflows にも載っています。

<https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees>

git worktree を使うと一つのリポジトリで複数のブランチに同時にチェックアウトできるようにできるので、並列作業ができるようになります。

## gwq を nix で入れる

gwq は `nixpkgs` に入っていませんので、他の一般的なアプリケーションよりもひと手間がかかります。

まずは[gwq の GitHubリポジトリ](https://github.com/d-kuro/gwq)を見に行って、インストール方法を検討しましょう。

パッと思いつく限り2通りありそうですね。

- Release の URL からビルド成果物の`tar.gz`をダウンロードして展開する
- ソースコードをダウンロードしてビルドする

前者だと一見楽に見えますが、プラットフォームごとにバイナリが違うのを分ける必要がありますし、なにより Nix の良さがあまり活かせません。

後者を採用します。

### Nixで書くための方針

幸い gwq はとても Nix で扱いやすい構成なので、`nixpkgs` のビルドヘルパーを使えば簡単に書けます。

- GitHub からソースコードをダウンロードする →  `fetchFromGitHub` 関数
- Go 言語のプロジェクトをビルドする(`go.mod`ファイルを含む) → `buildGoModule` 関数

fetcher についての紹介は以下の記事をどうぞ。

- [§2. Fetcher | Nix入門: ハンズオン編](https://zenn.dev/asa1984/books/nix-hands-on/viewer/ch03-02-fetchers)

Go 言語のプロジェクトをNixでビルドする方法については以下の記事をどうぞ。

- [Go - NixOS Wiki](https://nixos.wiki/wiki/Go)

基本的にこれだけで`gwq`バイナリは使えるのですが、Nix を使うとさらに便利にできます。[gwq のShell Integration](https://github.com/d-kuro/gwq?tab=readme-ov-file#shell-integration) の項目を見ると、`~/.zshrc` などに設定を追加することで、シェル補完を有効にできるようです。また、`gwq` は中で `git` コマンドを使用している他、`tmux` というサブコマンドで `tmux` との連携機能もあるので、`gwq` から見て `git` や `tmux` のパスが通っていて欲しいです。

`buildGoModule` の `postInstall` フックを使って、これらの設定を追加することができます。([buildGoModule のソース](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/go/module.nix)を見ると、`mkDerivation` の `installPhase` の末尾で `runHook postInstall` が呼ばれているのが確認できます)

### 実際のコード

これらのことを踏まえて ChatGPT に書いてもらったのが以下のコードです(え)。

Nix言語の簡単な説明は[こちらの記事](https://zenn.dev/asa1984/books/nix-introduction/viewer/09-nix-lang)をどうぞ.

```nix
{
  buildGoModule,
  fetchFromGitHub,
  git,
  installShellFiles,
  lib,
  makeWrapper,
  tmux,
}:

buildGoModule rec {
  pname = "gwq";
  version = "0.0.5";

  src = fetchFromGitHub {
    owner = "d-kuro";
    repo = "gwq";
    rev = "v${version}";
    hash = "";
  };

  vendorHash = "sha256-jP4arRoTDcjRXZvLx7R/1pp5gRMpfZa7AAJDV+WLGhY=";

  subPackages = [ "cmd/gwq" ];

  ldflags = [
    "-s"
    "-w"
    "-X github.com/d-kuro/gwq/internal/cmd.version=v${version}"
  ];

  nativeBuildInputs = [
    installShellFiles
    makeWrapper
  ];

  postInstall = ''
    wrapProgram $out/bin/gwq \
      --prefix PATH : ${lib.makeBinPath [git tmux]}

    export HOME=$TMPDIR
    $out/bin/gwq completion bash > gwq.bash
    $out/bin/gwq completion fish > gwq.fish
    $out/bin/gwq completion zsh > gwq.zsh

    installShellCompletion --cmd gwq \
      --bash gwq.bash \
      --fish gwq.fish \
      --zsh gwq.zsh
  '';

  meta = {
    description = "Git worktree manager with fuzzy finder interface";
    homepage = "https://github.com/d-kuro/gwq";
    changelog = "https://github.com/d-kuro/gwq/releases/tag/v${version}";
    license = lib.licenses.asl20;
    mainProgram = "gwq";
    platforms = lib.platforms.unix;
  };
}
```

記憶が曖昧ですが、たしか一発で動かなかくて手直しした気がします。

このコードを `gwq.nix` など適当な名前で`dotfiles`に追加して、`home-manager` の設定ファイルの適当な箇所に追加します。

```nix title="includes/home/dev/ai/default.nix"
{ pkgs, lib, ... }:
{
  home.packages =
    with pkgs;
    [
      gomi
      bun
      uv
      (callPackage ../../../packages/gwq.nix { })
    ]
    ++ lib.lists.optionals (pkgs.stdenv.hostPlatform.isDarwin) [
      terminal-notifier
    ]
    ++ lib.lists.optionals (pkgs.stdenv.hostPlatform.isLinux) [
      libnotify
    ];
}
```

これで `home-manager switch` を実行すれば `gwq` がインストールされ、シェル補完も有効になります。

## 実際に使ってみる

1. Ctrl + ] で `ghq` を使いリポジトリへ移動
2. `gwq add -b <branch-name>` で `~/worktrees/<repo-name>/<branch-name>` に git worktree を作成
3. `gwq exec <branch-name> -- codex` で作成した worktree 上で `codex` コマンドを実行

手元に複数タスクを並列に進められる規模のプロジェクトが無いので、Codex と Gemini CLI に同じタスクを並列でやらせてみました。結果は覚えてません(え)。

worktree を作成した場所を覚えておく必要が無いのと、全デフォルトで全く別の場所に worktree を作成してくれるのでリポジトリに謎フォルダが増えないのが良いですね。

若干シェルと合わせてカスタマイズしたい気持もしますが、`ghq` と異なり、ビルトインでリッチなTUIがあるので、`ghq` ほど好き勝手しやすくはないかもしれません。
まあ、キーバインド付けるくらいですかね。

## まとめ

`gwq` も AI も使いこなせるようになりたいなのです。
