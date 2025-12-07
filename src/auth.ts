import { GH_OAUTH_CLIENT_ID, GH_OAUTH_CLIENT_SECRET } from "astro:env/server";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
	socialProviders: {
		github: {
			clientId: GH_OAUTH_CLIENT_ID,
			clientSecret: GH_OAUTH_CLIENT_SECRET,
		},
	},
});
