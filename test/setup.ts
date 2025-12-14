import { mock } from "bun:test";

const identity = <T>(value: T): T => value;
const optional = () => ({ optional: () => ({}) });

mock.module("astro:actions", () => ({
	defineAction: identity,
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
		object: identity,
		string: optional,
		boolean: optional,
		array: optional,
		record: () => ({}),
		unknown: () => ({}),
	},
}));

mock.module("astro:env/server", () => ({
	BETTER_AUTH_SECRET: "mock-secret",
	GH_APP_CLIENT_ID: "mock-client-id",
	GH_APP_CLIENT_SECRET: "mock-client-secret",
}));
