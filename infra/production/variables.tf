variable "cloudflare_account_id" {
	type        = string
	description = "Cloudflare account ID."
}

variable "zone_name" {
	type        = string
	description = "Cloudflare zone name."
	default     = "ojii3.dev"
}

variable "manage_media_custom_domain" {
	type        = bool
	description = "Enable after the existing R2 custom domain has been adopted."
	default     = false
}
