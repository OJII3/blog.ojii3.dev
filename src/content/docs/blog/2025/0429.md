---
title: Asahi Linux のアンインストール
date: 2025-04-29
tags: [linux, mac]
draft: false
---

MacBook M2 Pro に入れた Asahi を消すぞよ！インストールより怖いぞよ！

## 調査

- https://www.reddit.com/r/AsahiLinux/comments/1ajjjoo/uninstall_asahi_fully/

diskutil結果とその結果をもとに消すべきパーティションについてのやり取りが書かれています。

文鎮化するので絶対に消してはいけないパーティションと、Mac側の領域を戻すために消さない方が良いパーティションがわかります。

> In disk0, you should delete partitions 3, 4, 5 and 6 to fully remove the Linux installation, and extend 2 to take up the newly-freed space.
>
> 3 contains the Apple specific stuff and u-boot. 4 is the Linux ESP, containing Grub. 5 and 6 are Linux partitions, with 6 being the root partition and 5 being one of a few possibilities (/boot or perhaps a swap partition; does it really matter though?).
>
> Partitions you should never remove under any circumstance (and it won’t let you): 1 and 7. Removing those can brick your Mac to the point of requiring a separate one with Apple Configurator to recreate. Don’t touch them.
>
> Partitions you most likely shouldn’t remove: 2. It’s your normal macOS installation.

- curl -L https://alx.sh/wipe-linux | sh

直接実行するのは怖いので中身を確認します。前半は上のredditに書かれているコマンドと実質同じですね。後半は少々違くて、パーティションのuuidをいじっている？ようです。

正しいのかもしれませんが、今回はこのスクリプトを使うのはやめて手動でやろうと思います。

## 実践

まずは現状の確認です。

```sh
diskutil list
```

出力:

```
/dev/disk0 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *1.0 TB     disk0
   1:             Apple_APFS_ISC Container disk1         524.3 MB   disk0s1
   2:                 Apple_APFS Container disk4         700.0 GB   disk0s2
   3:                 Apple_APFS Container disk3         2.5 GB     disk0s3
   4:                        EFI EFI - ASAHI             524.3 MB   disk0s4
   5:           Linux Filesystem                         1.1 GB     disk0s5
   6:           Linux Filesystem                         290.6 GB   disk0s6
   7:        Apple_APFS_Recovery Container disk2         5.4 GB     disk0s7

/dev/disk3 (synthesized):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      APFS Container Scheme -                      +2.5 GB     disk3
                                 Physical Store disk0s3
   1:                APFS Volume Asahi Linux - Data      2.2 MB     disk3s1
   2:                APFS Volume Asahi Linux             1.1 MB     disk3s2
   3:                APFS Volume Preboot                 195.6 MB   disk3s3
   4:                APFS Volume Recovery                808.2 MB   disk3s4

/dev/disk4 (synthesized):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      APFS Container Scheme -                      +700.0 GB   disk4
                                 Physical Store disk0s2
   1:                APFS Volume Macintosh HD            11.2 GB    disk4s1
   2:              APFS Snapshot com.apple.os.update-... 11.2 GB    disk4s1s1
   3:                APFS Volume Preboot                 7.1 GB     disk4s2
   4:                APFS Volume Recovery                1.0 GB     disk4s3
   5:                APFS Volume Macintosh HD - Data     194.5 GB   disk4s5
   6:                APFS Volume VM                      20.5 KB    disk4s6
   7:                APFS Volume Nix Store               79.7 GB    disk4s7

/dev/disk5 (disk image):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     Apple_partition_scheme                        +3.2 GB     disk5
   1:        Apple_partition_map                         32.3 KB    disk5s1
   2:                  Apple_HFS Affinity Photo 2        3.2 GB     disk5s2
```

Affinity Photo 2　がいるのはちょっとよくわからないので、後で調べましょう。今回は関係ないはずです。

上のRedditと相違ないようです。以下の順にコマンドを打ちました。

```sh
diskutil apfs deleteContainer disk0s3 

diskutil eraseVolume free none /dev/disk0s4

diskutil eraseVolume free none /dev/disk0s5

diskutil eraseVolume free none /dev/disk0s6

diskutil apfs resizeContainer /dev/disk0s2 0
```

無事 Asahi Linux のパーティションは消え、Mac のユーザー領域も戻ってきました。

## まとめ

めでたしめでたしなのです！
