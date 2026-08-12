import { describe, expect, it, mock } from "bun:test";
import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
	it("throws UNAUTHORIZED when no session", async () => {
		const mockGetSession = mock(() => Promise.resolve(null));

		expect(requireAdmin(new Headers(), mockGetSession)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("throws UNAUTHORIZED when session has no user", async () => {
		const mockGetSession = mock(() => Promise.resolve({ user: null }));

		expect(requireAdmin(new Headers(), mockGetSession)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("returns user when session is valid", async () => {
		const user = { id: "1", name: "Test" };
		const mockGetSession = mock(() => Promise.resolve({ user }));

		const result = await requireAdmin(new Headers(), mockGetSession);
		expect(result).toEqual(user);
	});
});
