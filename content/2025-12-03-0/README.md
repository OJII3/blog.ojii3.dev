---
title: Unityで3Dキャラクターを制御した
date: 2025-12-03
draft: true
tags: [unity, game-dev]
---

[農工大アドベントカレンダー2025](https://qiita.com/advent-calendar/2025/tuat) の記事でもあるので、まともな文体で書いております。

## はじめに

大学の学祭でゲームを制作しました → 詳しくはこちら[TODO: ここに何かリンクを貼る]

三人称視点の3Dキャラのアニメーションと移動の制御をしたので、そのあたり(特にコードの実装)について書きます。

## 仕様の整理

- 移動: スティック操作でフィールド内で自由に移動できる。スティックの倒し具合で移動速度は調整可能。ダッシュだと更に早く移動できる。
- 射撃: JoyConを構えてZRでチャージ、振りながら離して発射。チャージ中も移動は可能だが、ダッシュは出来ず移動速度も遅くなる。
- パリィ: 相手の射撃が当たりそうなときにタイミングよくRを押しながら振ることで射撃を受け流すことができる。めっちゃタイミングがいい場合は相手の射撃を反射して相手に飛ばすことも可能。
- パリィ: 相手の射撃が当たりそうなときにタイミングよくRを押しながら振ることで射撃を受け流すことができる。めっちゃタイミングがいい場合は相手の射撃を反射して相手に飛ばすことも可能。
- ガード: Rを押し続けている間、相手の攻撃を防げる。ただしスタミナを継続的に消費するのでずっとは不可。そのままJoyConを振るとパリィになり、攻撃の反射が可能。

## 実装の方針

アニメーションの制御には Unity の Annimator Controller を使用します。使いかたは[このへん](https://eda-inc.jp/post-1830/)とかを見てください。今回は深くは触れません。

まず、キャラクターの挙動をステートとして書き出します。この際、キャラのアニメーションを意識すると考えやすいです。

```cs
namespace Wand.Play.Player
{
    /// <summary>
    ///     インゲームでのプレイヤーのステート
    ///     ----------------------------------------------------
    ///     起こり得るステートの遷移
    ///     - WalkAndRun -> Charge | Guard | Damaged
    ///     - Charged -> WalkAndRun | Guard | Damaged | Charge
    ///     - Charge -> Charged | WalkAndRun | Damaged
    ///     - Guard -> WalkAndRun | Parriable
    ///     - Parriable -> WalkAndRun | Parried
    ///     - Parried -> WalkAndRun
    ///     - Damaged -> WalkAndRun | Defeated
    ///     - Defeated -> WalkAndRun
    ///     ステートに関係なく発生しうるイベントの有効無効の判定
    ///     - 攻撃は Charge, Charged ステートをよしなに見る
    ///     - 被弾はWalkAndRun,Charge,Charged中のみ有効(パリィ早すぎの被弾も遅すぎの被弾もWalkAndRunステートに戻ってから起こる)
    /// </summary>
    public enum PlayerState
    {
        WalkAndRun = 0,
        Charge = 1,
        Guard = 2,
        Parriable = 3,
        Parried = 4,
        Damaged = 5,
        Defeated = 6,
        Charged = 7
    }
}
```

