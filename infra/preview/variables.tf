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
  description = "Enable after the first preview Worker deployment."
  default     = false
}
