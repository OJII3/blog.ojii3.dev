import { describe, expect, it, mock } from "bun:test";
import type { AccessAuthConfig, AccessIdentity } from "@/auth";
import { requireAdmin } from "./require-admin";

const requiredConfig: AccessAuthConfig = {
	required: true,
	teamDomain: "https://example.cloudflareaccess.com",
	audience: "test-audience",
};

describe("requireAdmin", () => {
	it("throws UNAUTHORIZED when no Access identity", async () => {
		const mockGetIdentity = mock(() => Promise.resolve(null));

		expect(
			requireAdmin(new Headers(), requiredConfig, mockGetIdentity),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("returns a preview identity when Access is not required", async () => {
		const result = await requireAdmin(new Headers(), { required: false });

		expect(result).toEqual({
			id: "preview",
			email: null,
			name: "Preview",
		});
	});

	it("returns user when Access identity is valid", async () => {
		const user: AccessIdentity = {
			id: "1",
			email: "test@example.com",
			name: "Test",
		};
		const mockGetIdentity = mock(() => Promise.resolve(user));

		const result = await requireAdmin(
			new Headers(),
			requiredConfig,
			mockGetIdentity,
		);
		expect(result).toEqual(user);
	});
});
