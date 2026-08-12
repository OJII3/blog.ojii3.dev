# D1/R2 Content Storage Design

## Status

Approved design. Implementation is not included in this document change.

## Goal

ブログ記事をGitHub repositoryから完全に切り離し、記事をCloudflare D1、画像をCloudflare R2で管理する。公開ページ、管理画面、プレビュー、検索はデプロイなしでD1の更新を反映する。

GitHub OAuthは管理画面への認証手段として残すが、記事・画像の保存、読み取り、デプロイtriggerにはGitHub APIを使わない。

## Non-goals

- GitHub repositoryへの記事・画像の同期
- 記事編集画面への新規記事作成・削除機能の追加
- R2 objectの自動孤立検出・自動削除
- 外部クライアント向けの汎用コンテンツAPI

## Architecture

### Content loading

AstroのLive Content Collectionを唯一の記事collectionとして使用する。collection名は`blog`とする。

- `src/live.config.ts`でD1 loaderとして`blog`を定義する
- `getLiveCollection("blog")`で公開記事一覧を取得する
- `getLiveEntry("blog", slug)`で記事単体を取得する
- loader内でMarkdown本文を既存のMarkdown processorでHTML化する
- 相対画像URLはR2カスタムドメインへ変換する
- 外部URL、root-relative URL、data URLは変換しない

静的collection、ローカルmock collection、GitHub clone loader、GitHub live loaderは削除する。記事の公開データをHTMLとして表示する処理はLive Collectionに統一する。一方、HTML化が不要な管理一覧や検索処理は、性能とD1クエリ量を考慮して同じrepositoryの軽量queryを直接利用する。

公開ページは常時SSRとする。D1更新後の次のrequestから記事内容を反映し、記事内容をGitHubやビルド成果物へfallbackしない。

### Data access

Drizzle ORMのD1 driverを採用する。

- Drizzle schemaをD1 migrationから生成・管理する
- 記事loader、Astro pages、Astro Actionsは共有repositoryを利用する
- SQLやD1 bindingへのアクセスをページ・Actionごとに重複させない
- D1/R2 bindingはrequest単位でrepositoryへ渡し、テストで差し替えられるようにする

### Browser mutations and RPC

外部クライアントを必要としないため、Elysia.js/Eden RPCは導入しない。Astro Actionsがこのアプリケーションに必要なRPC境界を提供する。

Astro ActionsはJSON入力、FormData/File入力、Zod validation、型安全なclient呼び出し、`ActionError`、Astro middlewareの`context.locals`をすでにサポートしている。ElysiaのCloudflare adapterは実験的であり、今回の同一Astroアプリ内の管理画面には追加メリットがない。

将来、モバイルアプリや別フロントエンドなどAstro外部のAPI clientが必要になった場合だけ、repositoryを再利用したElysia/Eden APIを再検討する。

## Data model

### D1 tables

```text
posts
- slug        TEXT PRIMARY KEY
- title       TEXT NOT NULL
- date        TEXT NOT NULL           -- YYYY-MM-DD
- draft       INTEGER NOT NULL        -- 0 or 1
- body        TEXT NOT NULL           -- frontmatterを除いたMarkdown本文
- revision    INTEGER NOT NULL        -- optimistic locking version
- created_at  INTEGER NOT NULL
- updated_at  INTEGER NOT NULL

tags
- name        TEXT PRIMARY KEY

post_tags
- post_slug   TEXT NOT NULL
- tag_name    TEXT NOT NULL
- PRIMARY KEY (post_slug, tag_name)
```

`posts.slug`は既存の`YYYY-MM-DD-n`形式を維持する。日付はD1では`YYYY-MM-DD`文字列として保存し、Live Collectionのschemaへ渡す際にUTCの`Date`へ変換する。`draft`はSQLite integerで保持し、アプリケーションではbooleanへ変換する。

Markdown本文は編集画面で現在と同じように扱えるよう、frontmatterを除いた本文を保持する。frontmatterの値は構造化カラムへ移し、保存時に必要な形式へ再構成する。

タグは`tags`と`post_tags`に正規化する。記事更新時は、revision条件付きの`posts`更新、タグ削除、タグinsertを同一のD1 batchに含める。タグ関連のSQLにも更新後revisionの存在条件を付け、revision条件が成立しない場合は記事・タグのどちらも変更しない。batch完了後の更新件数で競合を判定する。

### R2 objects

画像のobject keyは既存の相対パスを維持する。

```text
{slug}/{relative-image-path}
```

例:

```text
2025-12-31-0/Screenshot From 2025-12-31 00-16-52.png
```

R2 objectにはアップロード時のMIME typeを`Content-Type` metadataとして設定する。R2 custom domainは`https://media.blog.ojii3.dev`を第一候補とし、実際のURLは`MEDIA_BASE_URL`設定値から生成する。`media.blog.ojii3.dev`が利用できない場合も、アプリケーションコードを変更せず設定値だけで別の同一Cloudflare zone配下へ切り替えられるようにする。

CloudflareのR2 custom domainは、R2 bucketと同じCloudflare accountに追加されたzone配下であることが前提となる。2段階のsubdomain自体は制約としないが、既存DNS recordとの競合がないことをデプロイ前に確認する。

## Runtime flows

### Public pages

1. RequestをCloudflare Workerが受け取る
2. Live Collectionの`blog` loaderが`DB`から記事を取得する
3. loaderがMarkdownをHTMLへ変換する
4. 相対画像の`src`を`MEDIA_BASE_URL/{slug}/{path}`へ変換する
5. draftを除外して一覧・詳細・前後リンクをレンダリングする

記事詳細、トップ一覧、OG imageは静的pathを生成しない。OG imageもLive Entryから都度生成する。

### Admin edit and preview

1. 既存のmiddlewareが管理画面へのsessionを確認する
2. 編集画面はD1から本文、metadata、revisionを取得する
3. previewはLive Collectionの`blog`からdraft込みでentryを取得する
4. 保存は`updatePost` Actionを呼び出す
5. 保存成功時は新しいrevisionを画面へ反映する

### Search

Pagefindとビルド時検索indexを削除する。タグ一覧はD1 query、全文検索は`searchPosts` Actionで実行する。検索対象は非draft記事に限定し、query・tag filter・結果数上限をAction入力として検証する。

### Image upload

1. `uploadImage` Actionが共通のsession認証と入力を検証する
2. slugの形式とpath traversalを検証する
3. MIME typeをJPEG、PNG、GIF、WebP、SVGに限定する
4. 10MBを超えるFileを拒否する
5. R2 `MEDIA` bindingへ`{slug}/{filename}`で保存する
6. `MEDIA_BASE_URL`付きURLとMarkdownへ挿入する相対pathを返す

画像アップロードと記事保存は別操作である。画像アップロード成功後に記事保存が失敗した場合の孤立objectは初期実装では許容する。既存ファイルの意図しない上書きは避け、同名時は既存object確認または一意名生成で扱う。

## Actions and errors

### Actions

- `updatePost`: slug、title、date、tags、draft、body、revisionを検証し、D1を更新する
- `uploadImage`: slugとFileを検証し、R2へ保存する
- `searchPosts`: queryとtag filterを検証し、draftを除外して検索する
- `triggerDeploy`: D1/R2が即時反映されるため削除する

GitHub access tokenの取得、GitHub Contents API、GitHub repository dispatchはActionsから削除する。更新系ActionはAstro middlewareのlocalsだけに依存せず、共通の認証helperからBetter Authのsessionを検証する。これにより、Astro Actionの内部endpointがmiddlewareの管理画面判定から外れていても認証を強制できる。

### Error mapping

- 認証失敗: 401 / `UNAUTHORIZED`
- 入力不正: 400 / `BAD_REQUEST`
- 記事不存在: 404 / `NOT_FOUND`
- revision競合: 409 / `CONFLICT`
- D1/R2やMarkdown処理の予期しない失敗: 500 / `INTERNAL_SERVER_ERROR`

GitHubへのfallbackは実装しない。管理画面では既存のtoast表示を維持し、revision競合時はページ再読み込みを促す。

## Migration

移行は一度だけ実行するCLIとして実装する。実行時にGitHub APIを呼び出さず、CLIへ指定したローカルcontent directoryだけを入力とする。

1. 各slug directoryの`README.md`を読み込む
2. gray-matterでfrontmatterと本文を分離する
3. `posts`へ記事をinsertする
4. tagsとpost_tagsへタグをinsertする
5. `README.md`以外のファイルを同じslug配下のR2 objectへuploadする
6. 記事数、slug、画像数、未処理ファイルを検証結果として出力する
7. dry-runではD1/R2へ書き込まず、検出結果だけを出力する

再実行時は既存slug/objectを安全に扱えるようにする。移行完了と検証が終わった後、GitHub content repositoryのclone、loader、保存client、画像URL変換を削除する。

## Configuration and deployment

Wrangler bindingを次の名前で追加する。

- D1 binding: `DB`
- R2 binding: `MEDIA`

アプリケーション設定として`MEDIA_BASE_URL`を追加する。D1 migrationはWranglerから適用し、R2 custom domainはCloudflare dashboardまたはCloudflare APIで接続する。Cloudflare account、zone、bucketが同一account条件を満たすことをデプロイ前に確認する。

CIのbuildは記事をcloneせずに完了できるようにする。記事変更によるGitHub repository dispatchは不要になるため、管理画面と関連Actionから削除する。コード変更のCI/deploy自体は維持する。

ローカルではWranglerのlocal D1/R2 bindingとmigrationを使ってWorkerを起動する。Astroの通常dev serverに依存したmock記事loaderは廃止し、binding-backedなローカル実行経路を標準とする。

## Testing and acceptance criteria

### Unit tests

- Drizzle repositoryの一覧、slug取得、更新、draft filter、tag filter
- revision一致時の更新と不一致時の409相当エラー
- Markdownの相対画像、外部URL、root-relative URL、data URLの変換
- R2 key生成とfilename/path traversal検証
- Actionsの入力検証、認証、Fileサイズ・MIME type検証
- migration parserのfrontmatter/body分離

### Integration tests

- local D1 migration後のinsert/select/update
- local R2へのuploadとmetadata
- Live loaderがD1記事を`blog` entryとして返すこと
- draft記事が公開一覧・検索から除外されること
- previewではdraft記事を表示できること

### Required verification

- `bun test`
- `bun run check`
- `bun run build`
- Wrangler local Workerでトップ、記事詳細、preview、編集、画像upload、検索を確認
- migration dry-runで既存contentの全slugと画像数を確認

受け入れ条件は、GitHub content repositoryがなくてもbuildとWorker起動が成功し、D1更新後にデプロイなしで公開記事と検索結果へ反映され、画像がR2 custom domainから表示されることである。
