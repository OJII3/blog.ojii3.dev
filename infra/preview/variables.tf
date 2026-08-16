variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID."
}

variable "zone_name" {
  type        = string
  description = "Cloudflare zone name."
  default     = "ojii3.dev"
}
