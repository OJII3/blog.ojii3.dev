output "worker_name" {
  value       = cloudflare_worker.app.name
  description = "Worker name used by Wrangler."
}

output "session_kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.session.id
  description = "Workers KV namespace ID used by the Astro session binding."
}

output "d1_database_id" {
  value       = cloudflare_d1_database.content.id
  description = "D1 database ID used in wrangler.jsonc."
}

output "r2_bucket_name" {
  value       = cloudflare_r2_bucket.media.name
  description = "R2 bucket name used in wrangler.jsonc."
}
