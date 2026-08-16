data "cloudflare_zone" "main" {
  filter = {
    name = var.zone_name
    account = {
      id = var.cloudflare_account_id
    }
  }
}

module "blog" {
  source = "../modules/blog-environment"

  account_id                 = var.cloudflare_account_id
  zone_id                    = data.cloudflare_zone.main.id
  worker_name                = "blog-ojii3-dev"
  session_kv_namespace_name  = "blog-ojii3-dev-session"
  d1_database_name           = "blog-content"
  r2_bucket_name             = "blog-media"
  application_hostname       = "blog.ojii3.dev"
  media_hostname             = "media.blog.ojii3.dev"
  manage_media_custom_domain = var.manage_media_custom_domain
}

import {
  to = module.blog.cloudflare_workers_kv_namespace.session
  id = "${var.cloudflare_account_id}/e3217c93e2e94c8da0ba6cbf00c554ac"
}

import {
  to = module.blog.cloudflare_worker.app
  id = "${var.cloudflare_account_id}/f16a280d8a744aa1af2307335ecb6c18"
}

import {
  to = module.blog.cloudflare_d1_database.content
  id = "${var.cloudflare_account_id}/eff6e29e-7810-4092-8d1b-f2a48289a751"
}

import {
  to = module.blog.cloudflare_r2_bucket.media
  id = "${var.cloudflare_account_id}/blog-media/default"
}

import {
  to = module.blog.cloudflare_workers_custom_domain.app[0]
  id = "${var.cloudflare_account_id}/9098743afd82ba206167dabb26eccdd9372e0302"
}

output "worker_name" {
  value = module.blog.worker_name
}

output "session_kv_namespace_id" {
  value = module.blog.session_kv_namespace_id
}

output "d1_database_id" {
  value = module.blog.d1_database_id
}

output "r2_bucket_name" {
  value = module.blog.r2_bucket_name
}
