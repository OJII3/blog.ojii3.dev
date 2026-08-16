data "cloudflare_zone" "main" {
	name = var.zone_name
}

module "blog" {
	source = "../modules/blog-environment"

	account_id                 = var.cloudflare_account_id
	zone_id                    = data.cloudflare_zone.main.id
	worker_name                = "blog-ojii3-dev-preview"
	d1_database_name           = "blog-content-preview"
	r2_bucket_name             = "blog-media-preview"
	application_hostname       = "preview.blog.ojii3.dev"
	media_hostname             = "media-preview.blog.ojii3.dev"
	manage_media_custom_domain = true
}

output "worker_name" {
	value = module.blog.worker_name
}

output "d1_database_id" {
	value = module.blog.d1_database_id
}

output "r2_bucket_name" {
	value = module.blog.r2_bucket_name
}
