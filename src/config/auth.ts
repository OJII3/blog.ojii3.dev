import {
	BETTER_AUTH_SECRET,
	GH_APP_CLIENT_ID,
	GH_APP_CLIENT_SECRET,
} from "astro:env/server";
import { betterAuth } from "better-auth";

export const createAuth = () =>
	betterAuth({
		secret: BETTER_AUTH_SECRET,
		socialProviders: {
			github: {
				clientId: GH_APP_CLIENT_ID,
				clientSecret: GH_APP_CLIENT_SECRET,
				scope: ["repo", "user:email"],
			},
		},
	});
