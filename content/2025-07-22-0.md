---
title: home-managerの設定をある程度Nixと分離しておきたい
date: 2025-07-22
---

home-managerで多くのオレオレ環境の設定を残しているため、<https://home-manager-options.extranix.com/?query=anyrun&release=master>などで検索しながら設定するのですが、
Nixのみで設定を書くことが想定されているパッケージが多々あります。

## Nix だけで書くということのデメリット

たとえば、`swaynotificationcenter` の設定は本来、`~/.config/swaync/config.json` に書かれることになっていますが、`home-manager`で提供されているオプションに従うと、以下のようにNixでJSONもどきを書かなくてはなりません。

```nix
services.swaync.settings = {
  positionX = "right";
  positionY = "top";
  layer = "overlay";
  control-center-layer = "top";
  layer-shell = true;
  cssPriority = "application";
  control-center-margin-top = 0;
  control-center-margin-bottom = 0;
  control-center-margin-right = 0;
  control-center-margin-left = 0;
  notification-2fa-action = true;
  notification-inline-replies = false;
  notification-icon-size = 64;
  notification-body-image-height = 100;
  notification-body-image-width = 200;
};
```

もちろん、Nixで全て書くことのメリットもありますが、以下のようなデメリットがあります。

- ドキュメントやサンプルからのコピペができない
- 設定ファイルが原因でエラーが発生した際の原因が分かりずらくなる
- Issueを上げたり、他人に見せるときに説明したり戻したりする手間がかかる
- JSONのスキーマがある場合、補完の恩恵を受けられない
- Arch Linux 時代に育てた設定を書きなおさなければならない

## いいかんじにJSONファイルに分離する

こうして書かれたNixは、`builtins.toJSON` などの組込み関数でJSONに変換されてます。一方`builtins.fromJSON`などの組み込み関数もあり、今回はこの関数を使うことで実現できます。

```nix
{
  services.swaync = {
    enable = true;
    settings = builtins.fromJSON ''${builtins.readFile ./config.json}'';
    style = builtins.readFile ./style.css;
  };
}
```
同じ階層にJSONファイルで設定を書きます。

```json
{
  "$schema": "https://raw.githubusercontent.com/ErikReider/SwayNotificationCenter/refs/heads/main/src/configSchema.json",
  "positionY": "top",
  "layer": "overlay",
  "control-center-layer": "top",
  "layer-shell": true,\
  ...
}
```

JSON → Nix → JSON と若干まどろっこしいですが、公式どおりの設定ファイルの形式を維持することができるようになりました。

## シンプルにいかないパターン

`anyrun` は組み込み関数でイッパツで変換、といったことを内部でしておらず、複雑めな処理が走っています。

こういったときは、`anyrun`の`home-manager`の定義を見て参考にしながら、抜け道を探します。以下抜粋。

```nix
xdg.configFile = mkMerge [
        (mapAttrs' (name: value: nameValuePair ("anyrun/" + name) value) cfg.extraConfigFiles)

        {
          "anyrun/config.ron".text = ''
            Config(
              x: ${stringifyNumeric cfg.config.x},
              y: ${stringifyNumeric cfg.config.y},
              ...
              max_entries: ${
                if cfg.config.maxEntries == null then "None" else "Some(${toString cfg.config.maxEntries})"
              },
              plugins: ${toJSON parsedPlugins},
            )
          '';
        }

        {
          "anyrun/style.css" = mkIf (cfg.extraCss != null) {
            text = cfg.extraCss;
          };
        }
      ];
```

どうやらこの部分で `~/.config/anyrun/config.ron`に設定ファイルを配置しているようです。ではこれを `lib.mkForce` で上書きしてしまえばよさそうです。

```nix
{ lib, ... }: {
  programs.anyrun = {
    enable = true;
    extraCss = builtins.readFile ./style.css;
    config.plugins = [ ];
    extraConfigFiles = {
      "randr.ron".text = builtins.readFile ./randr.ron;
      "websearch.ron".text = builtins.readFile ./websearch.ron;
    };
  };
  xdg.configFile = lib.mkMerge [
    {
      "anyrun/config.ron".text = lib.mkForce (builtins.readFile ./config.ron);
    }
  ];
}
```

こんな感じですね。

## まとめ

我は天才かもしれないぞよ！
