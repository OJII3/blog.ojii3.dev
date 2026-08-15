import { describe, expect, it } from "bun:test";
import { withNoStore } from "./cache-control";

describe("withNoStore", () => {
	it("prevents a dynamic response from being cached", async () => {
		const response = withNoStore(
			new Response("private content", {
				status: 302,
				headers: { Location: "/login" },
			}),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/login");
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(await response.text()).toBe("private content");
	});
});
