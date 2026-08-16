# Cloudflare infrastructure

このディレクトリは、アプリケーションのリリースとは分離した、長寿命のCloudflareリソースを管理する。

- `production/`: 本番Worker、D1、R2、公開ドメイン、管理画面用Access
- `preview/`: Preview用Worker、D1、R2、ドメイン
- `modules/blog-environment/`: 両環境で共有するリソース定義

WorkerのコードとVersionのupload/deploy、D1 migration、R2オブジェクトの操作はWrangler/GitHub Actionsが担当する。

## 初回セットアップ

Terraform state用のR2バケットは、そのバケット自身のstateに保存できないため、最初に一度だけ作成する。

```sh
bun wrangler r2 bucket create blog-ojii3-terraform-state
```

R2のS3 API access key/secretを作成し、`production/backend.hcl.example` と
`preview/backend.hcl.example` を `backend.hcl` としてコピーする。access key/secretは
ファイルに書かず、`AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY`で渡す。

Cloudflare API tokenは、`CLOUDFLARE_API_TOKEN`として渡す。Terraform providerには
secretを直接設定しない。

GitHub Actionsでapplyする場合は、既存の`CLOUDFLARE_ACCOUNT_ID`と
`CLOUDFLARE_API_TOKEN`に加えて、stateバケット専用のR2 S3 credentialsを
`TERRAFORM_STATE_ACCESS_KEY_ID`と`TERRAFORM_STATE_SECRET_ACCESS_KEY`として登録する。
production environmentには手動approvalを設定する。

## 本番

```sh
cp infra/production/backend.hcl.example infra/production/backend.hcl
cp infra/production/terraform.tfvars.example infra/production/terraform.tfvars
terraform -chdir=infra/production init -backend-config=backend.hcl
terraform -chdir=infra/production plan
```

既存のD1/R2/Worker/Worker Custom Domainは、最初にTerraformへimportしてからapplyする。
D1とR2は既存データを持つため、import前に作成し直してはいけない。

`cloudflare_r2_custom_domain`はproductionでもTerraform管理対象とする。
applyするとR2 custom domainと、それに対応するCloudflare管理のDNS CNAMEが作成される。

本番の管理画面は`admin.blog.ojii3.dev`で公開し、Cloudflare Accessで保護する。
通常の端末はCloudflare Accessで認証し、Zero Trustに接続された端末はWARPセッションでの認証も許可する。

## Preview

```sh
cp infra/preview/backend.hcl.example infra/preview/backend.hcl
cp infra/preview/terraform.tfvars.example infra/preview/terraform.tfvars
terraform -chdir=infra/preview init -backend-config=backend.hcl
terraform -chdir=infra/preview apply
```

Preview用リソースを作成した後、Terraform outputのD1 IDを`wrangler.jsonc`へ反映する。
新規にPreview環境を作る場合だけ、最初のapply前に
`preview/terraform.tfvars`の`manage_application_custom_domain = false`を使う。
WranglerでWorkerを一度deploymentしてから`true`に戻して再度applyする。

PreviewのPR URLは`workers.dev`のまま使う。Preview URL全体のCloudflare Access保護は
TerraformでPRごとに作らず、Workers & PagesのPreview URL設定から一度だけ有効化する。
