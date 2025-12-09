import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/generated/auth-schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
});
