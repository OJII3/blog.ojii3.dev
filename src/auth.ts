import {
	BETTER_AUTH_SECRET,
	GH_OAUTH_CLIENT_ID,
	GH_OAUTH_CLIENT_SECRET,
} from "astro:env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

export const createAuth = (db: D1Database) =>
	betterAuth({
		database: drizzleAdapter(drizzle(db), {
			provider: "sqlite",
		}),
		secret: BETTER_AUTH_SECRET,
		socialProviders: {
			github: {
				clientId: GH_OAUTH_CLIENT_ID,
				clientSecret: GH_OAUTH_CLIENT_SECRET,
			},
		},
	});
