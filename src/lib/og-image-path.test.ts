import { describe, expect, it } from "bun:test";
import { getOgImageKey, getOgImageUrl } from "./og-image-path";

describe("getOgImageKey", () => {
	it("includes the post revision in the R2 key", () => {
		expect(getOgImageKey("2024-01-01-1", 3)).toBe(
			"2024-01-01-1/og-image-3.png",
		);
	});
});

describe("getOgImageUrl", () => {
	it("returns a public, revisioned media URL", () => {
		expect(
			getOgImageUrl("https://media.example.com///", "2024-01-01-1", 3),
		).toBe("https://media.example.com/2024-01-01-1/og-image-3.png");
	});
});
