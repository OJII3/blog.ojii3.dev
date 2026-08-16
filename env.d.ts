/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
	// Note: 'import {} from ""' syntax does not work in .d.ts files.
	interface Locals extends Runtime {
		user: import("./src/auth").AccessIdentity | null;
	}
}

interface Env {
	ASSETS: Fetcher;
	DB: D1Database;
	MEDIA: R2Bucket;
	MEDIA_BASE_URL: string;
	ACCESS_AUTH_REQUIRED?: string;
	ACCESS_TEAM_DOMAIN?: string;
	ACCESS_AUDIENCE?: string;
}
