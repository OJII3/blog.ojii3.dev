resource "cloudflare_worker" "app" {
  account_id = var.account_id
  name       = var.worker_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_workers_kv_namespace" "session" {
  account_id = var.account_id
  title      = var.session_kv_namespace_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_d1_database" "content" {
  account_id = var.account_id
  name       = var.d1_database_name

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [read_replication]
  }
}

resource "cloudflare_r2_bucket" "media" {
  account_id = var.account_id
  name       = var.r2_bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_workers_custom_domain" "app" {
  count = var.manage_application_custom_domain ? 1 : 0

  account_id = var.account_id
  hostname   = var.application_hostname
  service    = cloudflare_worker.app.name
  zone_id    = var.zone_id

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_r2_custom_domain" "media" {
  count = var.manage_media_custom_domain ? 1 : 0

  account_id  = var.account_id
  bucket_name = cloudflare_r2_bucket.media.name
  domain      = var.media_hostname
  enabled     = true
  zone_id     = var.zone_id

  lifecycle {
    prevent_destroy = true
  }
}
