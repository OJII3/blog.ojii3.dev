variable "account_id" {
	type        = string
	description = "Cloudflare account ID."
}

variable "zone_id" {
	type        = string
	description = "Cloudflare zone ID for the application and media domains."
}

variable "worker_name" {
	type        = string
	description = "Worker name. Wrangler appends the environment name for named environments."
}

variable "d1_database_name" {
	type        = string
	description = "D1 database name."
}

variable "r2_bucket_name" {
	type        = string
	description = "R2 bucket name."
}

variable "application_hostname" {
	type        = string
	description = "Hostname routed to the Worker."
}

variable "media_hostname" {
	type        = string
	description = "Custom domain serving the R2 bucket."
}

variable "manage_media_custom_domain" {
	type        = bool
	default     = true
	description = "Whether Terraform should create and manage the R2 custom domain."
}
