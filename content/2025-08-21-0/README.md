---
title: Hyprland で Mac 風キーバインド (リベンジ編)
date: 2025-08-21
tags: [nixos, hyprland]
---

## Linux でも Mac 風の Ctrl を使いたい！

前回の記事では `xremap` を使うことで実現していたのですが、何もしてないのに壊れる事件が多発し、不安定だったため、
`xremap` とは決別いたしました。

今回は、このショートカット上書きを Hyprland の設定のみで実現することで、Emacs-like Ctrl の安定動作を目指します。

## Hyprland のディスパッチャー

Hyprland のキーバインド設定は、`key` と `dispatcher` の組み合わせでできています。

この `dispatcher` には様々な種類があり、例えばウィンドウ操作ができる `movewindow` や任意のコマンドを実行できる `exec`などがあり、なかでも今回使うのは
`sendshortcut` です。

これは指定したウィンドウにショートカットキーを送ることができ、以下のように書けます。

```hypr
bind = ALT, A, sendshortcut, CTRL, A, class:google-chrome
```

このようにかくと、`ALT + A` のキーで Google Chrome のウィンドウに `CTRL + A` を送ることができます。

ただし、これだけでは Google Chrome が裏にあっても送られてしまいます。また、Google Chrome 以外のウィンドウが `ALT + A` を受け取れなくなってしまいます。

## ちょっとしたスクリプトで工夫する

Hyprland には `hyprctl` というコマンドが付属しており、Hyprland のAPIをコマンドで呼びだすことができます。

これと `ripgrep` を組み合わせることで、アクティブなウィンドウが Google Chrome であれば `CTRL + A` を送る、そうでなければ `ALT + A` を送るというシェルスクリプトをトリガーします。

```sh
hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, A, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, A, activewindow"
```

ターミナルで上のようなコマンドを試すと、想定どおりに動くことを確認できました。

この方針でひたすらキーバインドを設定していきます。

```hypr
bind = $cmd, A, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, A, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, A, activewindow"
bind = $cmd, D, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, D, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, D, activewindow"
bind = $cmd, F, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, F, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, F, activewindow"
bind = $cmd, H, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, H, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, H, activewindow"
bind = $cmd, L, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, L, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, L, activewindow"
bind = $cmd, R, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, R, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, R, activewindow"
bind = $cmd, T, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, T, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, T, activewindow"
bind = $cmd, W, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL, W, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, W, activewindow"
bind = $cmd SHIFT, T, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut "CTRL SHIFT, T, class:google-chrome" || hyprctl dispatch sendshortcut "ALT, SHIFT, T, activewindow"
bind = CTRL, A, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut ", home, class:google-chrome" || hyprctl dispatch sendshortcut "CTRL, A, activewindow"
bind = CTRL, B, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut ", left, class:google-chrome" || hyprctl dispatch sendshortcut "CTRL, B, activewindow"
bind = CTRL, E, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut ", end, class:google-chrome" || hyprctl dispatch sendshortcut "CTRL, E, activewindow"
bind = CTRL, F, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut ", right, class:google-chrome" || hyprctl dispatch sendshortcut "CTRL, F, activewindow"
bind = CTRL, H, exec, hyprctl activewindow | rg "class: google-chrome" && hyprctl dispatch sendshortcut ", backspace, class:google-chrome" || hyprctl dispatch sendshortcut "CTRL, H, activewindow"
```

これで Google Chrome のキーバインドは Mac 風の Ctrl キーで動くようになりました。ちなみに `$cmd` は `ALT` キーに設定しています。

## 他のアプリケーション

私はエディタが Neovim なこともあり、日常のほとんどが ターミナル(kitty) と Google Chrome で完結しています。ですので、Google Chrome の設定だけで満足なのですが、
他のアプリケーションでも使いたい場合、まずウィンドウの選択の正規表現を工夫するという方法があります。

それでも複雑になってしまうので、いいかんじのシェルスクリプトを別ファイルに書いておいて呼びだす方法もあります。頑張れば Hyprland のプラグインのような形で便利ライブラリも作れそうですね。

## まとめ

外部キーボードがないとモッドタップは使えなくなったのは悲しいけど、外部キーボード使えば Linux と Mac がほぼ同じキーバインドになって嬉しいぞよ！

## 追記

`keyd` を使えば安定してモッドタップが実現できそうです！
