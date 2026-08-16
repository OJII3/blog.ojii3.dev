# Cloudflare infrastructure

このディレクトリは、アプリケーションのリリースとは分離した、長寿命のCloudflareリソースを管理する。

- `production/`: 本番Worker、D1、R2、ドメイン
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

`cloudflare_r2_custom_domain`は現行Providerでimportに対応していないため、既存の
`media.blog.ojii3.dev`は初期状態では管理対象外にしている。安全な切り替えを確認した後、
`production/variables.tf`の`manage_media_custom_domain`を`true`に変更して管理対象にする。

## Preview

```sh
cp infra/preview/backend.hcl.example infra/preview/backend.hcl
cp infra/preview/terraform.tfvars.example infra/preview/terraform.tfvars
terraform -chdir=infra/preview init -backend-config=backend.hcl
terraform -chdir=infra/preview apply
```

Preview用リソースを作成した後、Terraform outputのD1 IDを`wrangler.jsonc`へ反映する。
初回のpreview applyではWorker custom domainを作成せず、WranglerでWorkerを一度
deploymentしてから、`preview/terraform.tfvars`に
`manage_application_custom_domain = true`を設定して再度applyする。
