import {
	BETTER_AUTH_SECRET,
	GH_APP_CLIENT_ID,
	GH_APP_CLIENT_SECRET,
} from "astro:env/server";
import { betterAuth } from "better-auth";

// Auth Client (but works on server)
export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	socialProviders: {
		github: {
			clientId: GH_APP_CLIENT_ID,
			clientSecret: GH_APP_CLIENT_SECRET,
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
			strategy: "jwt",
			refreshCache: true,
		},
	},
	account: {
		storeStateStrategy: "cookie",
		storeAccountCookie: true,
	},
});
