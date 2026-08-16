output "worker_name" {
	value       = cloudflare_worker.app.name
	description = "Worker name used by Wrangler."
}

output "d1_database_id" {
	value       = cloudflare_d1_database.content.id
	description = "D1 database ID used in wrangler.jsonc."
}

output "r2_bucket_name" {
	value       = cloudflare_r2_bucket.media.name
	description = "R2 bucket name used in wrangler.jsonc."
}
