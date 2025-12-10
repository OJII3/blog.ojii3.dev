import {
	BETTER_AUTH_SECRET,
	GH_OAUTH_CLIENT_ID,
	GH_OAUTH_CLIENT_SECRET,
} from "astro:env/server";
import { betterAuth } from "better-auth";

export const createAuth = () =>
	betterAuth({
		secret: BETTER_AUTH_SECRET,
		socialProviders: {
			github: {
				clientId: GH_OAUTH_CLIENT_ID,
				clientSecret: GH_OAUTH_CLIENT_SECRET,
			},
		},
	});
