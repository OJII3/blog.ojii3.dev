import { mock } from "bun:test";

mock.module("astro:actions", () => ({
	defineAction: (config: any) => config,
	ActionError: class extends Error {
		code: string;
		constructor({ code, message }: { code: string; message: string }) {
			super(message);
			this.code = code;
		}
	},
}));

mock.module("astro:schema", () => ({
	z: {
		object: (schema: any) => schema,
		string: () => ({ optional: () => {} }),
		boolean: () => ({ optional: () => {} }),
		array: () => ({ optional: () => {} }),
		record: () => {},
		unknown: () => {},
	},
}));

mock.module("astro:env/server", () => ({
	BETTER_AUTH_SECRET: "mock-secret",
	GH_APP_CLIENT_ID: "mock-client-id",
	GH_APP_CLIENT_SECRET: "mock-client-secret",
}));
