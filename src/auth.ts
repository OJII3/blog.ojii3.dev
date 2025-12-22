import {
	BETTER_AUTH_SECRET,
	GH_APP_CLIENT_ID,
	GH_APP_CLIENT_SECRET,
} from "astro:env/server";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

const ALLOWED_GITHUB_USERNAMES = ["OJII3"];

// Auth Client (but works on server)
export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	user: {
		additionalFields: {
			githubUsername: {
				type: "string",
				required: false,
			},
		},
	},
	socialProviders: {
		github: {
			clientId: GH_APP_CLIENT_ID,
			clientSecret: GH_APP_CLIENT_SECRET,
			mapProfileToUser: (profile) => {
				return {
					githubUsername: profile.login,
				};
			},
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
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const githubUsername = user.githubUsername as string | undefined;

					if (
						githubUsername &&
						!ALLOWED_GITHUB_USERNAMES.includes(githubUsername)
					) {
						throw new APIError("UNAUTHORIZED", {
							message: "This GitHub account is not authorized to sign up",
						});
					}

					return { data: user };
				},
			},
		},
	},
});
