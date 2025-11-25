---
title: 画面の明さを自動調整したかった
date: 2025-04-14
tags: [nixos]
draft: false
---

`wluma` というパッケージがあるらしいぞよ。`home-manager` のオプションも提供されているのでこれで設定を書いていきます。

```nix
{ ... }: {
  services.wluma = {
    enable = true;
    settings = {
      "output.backlight" = {
        name = "eDP-1";
        path = "/sys/class/backlight/amdgpu_bl1/brightness";
        capturer = "wayland";
      };
    };
    systemd.enable = true;
    systemd.target = "graphical-session.target";
  };
}
```

これでビルド仕直したらデーモンはちゃんと起動したが、`systemctl --user status wluma.service` の出力はこれ。

```
○ wluma.service - Automatic brightness adjustment based on screen contents and ALS
     Loaded: loaded (/home/ojii3/.config/systemd/user/wluma.service; enabled; preset: ignored)
     Active: inactive (dead)

Apr 14 10:54:50 Komachan wluma[31285]: [2025-04-14T01:54:50Z INFO  wluma] Continue adjusting brightness and wluma will learn your preference over time.
Apr 14 10:54:50 Komachan wluma[31285]: thread 'als' panicked at src/main.rs:131:26:
Apr 14 10:54:50 Komachan wluma[31285]: Unable to initialize ALS IIO sensor: "No iio device found"
Apr 14 10:54:50 Komachan wluma[31285]: note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
Apr 14 10:54:50 Komachan systemd[2127]: wluma.service: Main process exited, code=exited, status=1/FAILURE
Apr 14 10:54:50 Komachan systemd[2127]: wluma.service: Failed with result 'exit-code'.
Apr 14 10:54:51 Komachan systemd[2127]: wluma.service: Scheduled restart job, restart counter is at 5.
Apr 14 10:54:51 Komachan systemd[2127]: wluma.service: Start request repeated too quickly.
Apr 14 10:54:51 Komachan systemd[2127]: wluma.service: Failed with result 'exit-code'.
Apr 14 10:54:51 Komachan systemd[2127]: Failed to start Adjusting screen brightness based on screen contents and amount of ambient light.
```

`iio` デバイスがない。実際、`/sys/bus/iio` は存在しなかった。カーネル的には対応しているので、ハード的にないのでしょうか。

一応WEBCamで疑似的にALS(Ambient Light Sensor)の代替をできるらしいです。

### まとめ

できなかったぞよ！
