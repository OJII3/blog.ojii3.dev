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

mock.module("astro/zod", () => ({
	z: {
		object: identity,
		string: optional,
		boolean: optional,
		number: optional,
		array: optional,
		record: () => ({}),
		unknown: () => ({}),
	},
}));
