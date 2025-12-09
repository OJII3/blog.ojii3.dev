import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";

// Mock D1Database for schema generation
const mockDb = {
	prepare: () => ({
		bind: () => ({
			all: () => [],
			first: () => null,
			run: () => {},
		}),
	}),
	dump: () => {},
	batch: () => {},
	exec: () => {},
} as unknown as D1Database;

export const auth = betterAuth({
	database: drizzleAdapter(drizzle(mockDb), {
		provider: "sqlite",
	}),
	socialProviders: {
		github: {
			clientId: "dummy",
			clientSecret: "dummy",
		},
	},
});
