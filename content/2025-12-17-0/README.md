---
title: AstroでCMSを作りたい vol.1
date: 2025-12-17
tags:
  - nix
draft: true
---
[農工大アドベントカレンダー](https://qiita.com/advent-calendar/2025/tuat)17日目です。勝手にシリーズ2を生やしました。

## gwq is 何

> Git worktree manager with fuzzy finder - Work on multiple branches simultaneously, perfect for parallel AI coding workflows

Git worktree を ghq のような使い勝手にするやつです。

ghq、弊サークル(MCC)では知らないor使ってない人がほとんどかと思いますが、とても便利なのでターミナルをよく使う人にオススメです。



## git worktree について

`git`のサブコマンドに`worktree`というのがあります。

AI Agent の流行りで注目されてるので、"git worktree" と調べると結構最近の日本語の記事がたくさん出てきます。

Claude Code の Common Workflows にも載っています。

<https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees>


