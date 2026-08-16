variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID."
}

variable "zone_name" {
  type        = string
  description = "Cloudflare zone name."
  default     = "ojii3.dev"
}

variable "manage_application_custom_domain" {
  type        = bool
  description = "Whether Terraform should create and manage the preview Worker custom domain."
  default     = true
}
