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
  d1_database_name           = "blog-content"
  r2_bucket_name             = "blog-media"
  application_hostname       = "blog.ojii3.dev"
  admin_hostname             = "admin.blog.ojii3.dev"
  media_hostname             = "media.blog.ojii3.dev"
  manage_media_custom_domain = var.manage_media_custom_domain
}

resource "cloudflare_zero_trust_access_application" "admin" {
  account_id                  = var.cloudflare_account_id
  name                        = "Blog admin"
  domain                      = "admin.blog.ojii3.dev"
  type                        = "self_hosted"
  allow_authenticate_via_warp = true
  session_duration            = "24h"

  policies = [{
    name       = "Allow authenticated users"
    decision   = "allow"
    precedence = 1

    include = [{
      everyone = {}
    }]

  }]
}

import {
  to = module.blog.cloudflare_worker.app
  id = "${var.cloudflare_account_id}/blog-ojii3-dev"
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

output "access_application_audience" {
  value = cloudflare_zero_trust_access_application.admin.aud
}

output "d1_database_id" {
  value = module.blog.d1_database_id
}

output "r2_bucket_name" {
  value = module.blog.r2_bucket_name
}
