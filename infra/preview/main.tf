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

  account_id                       = var.cloudflare_account_id
  zone_id                          = data.cloudflare_zone.main.id
  worker_name                      = "blog-ojii3-dev-preview"
  session_kv_namespace_name        = "blog-ojii3-dev-preview-session"
  d1_database_name                 = "blog-content-preview"
  r2_bucket_name                   = "blog-media-preview"
  application_hostname             = "preview.blog.ojii3.dev"
  media_hostname                   = "media-preview.blog.ojii3.dev"
  manage_application_custom_domain = var.manage_application_custom_domain
  manage_media_custom_domain       = true
}

import {
  to = module.blog.cloudflare_workers_kv_namespace.session
  id = "${var.cloudflare_account_id}/748fa82224874aa2a0e3eb21065a4d5c"
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
