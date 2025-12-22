import { describe, expect, it, mock } from "bun:test";
import { updatePostCore } from "./blog-service";

type UpsertArgs = {
	path: string;
	content: string;
	message: string;
	sha?: string;
};

// Mock dependencies
const mockUpsertFile = mock(() =>
	Promise.resolve({
		content: {
			name: "README.md",
			path: "slug/README.md",
			sha: "new-sha",
		},
		commit: { sha: "commit-sha" },
	}),
);

mock.module("@/pages/admin/_lib/github/content", () => ({
	createContentClientFromToken: () => ({
		upsertFile: mockUpsertFile,
	}),
}));

describe("updatePostCore", () => {
	it("should update post with correct frontmatter formatting", async () => {
		const input = {
			slug: "test-slug",
			frontmatter: {
				title: "Test Title",
				date: "2024-11-30",
				tags: ["a", "b"],
			},
			body: "Test Body",
			sha: "old-sha",
			accessToken: "mock-token",
		};

		await updatePostCore(input);

		// Verify that the file content passed to upsertFile has the correct date format (no quotes)
		const calls = mockUpsertFile.mock.calls as unknown as [UpsertArgs][];
		expect(calls.length).toBe(1);
		const args = calls[0]?.[0];
		if (!args) {
			throw new Error("upsertFile was not called");
		}

		expect(args.path).toBe("test-slug/README.md");
		expect(args.message).toBe("chore(content): update post test-slug");
		expect(args.sha).toBe("old-sha");

		const content = args.content;
		expect(content).toContain("title: Test Title");
		// Crucial check: date should be unquoted and strictly YYYY-MM-DD
		expect(content).toMatch(/^date: 2024-11-30$/m);
		expect(content).not.toMatch(/date: ['"]2024-11-30['"]/);
		expect(content).toContain("tags:\n  - a\n  - b");
		expect(content).toContain("Test Body");
	});

	it("should truncate time from date string", async () => {
		const input = {
			slug: "test-slug-time",
			frontmatter: {
				title: "Time Test",
				date: "2024-11-30T09:00",
				tags: [],
			},
			body: "",
			sha: "old-sha",
			accessToken: "mock-token",
		};

		await updatePostCore(input);

		const calls = mockUpsertFile.mock.calls as unknown as [UpsertArgs][];
		// Get the latest call
		const args = calls.at(-1)?.[0];
		if (!args) {
			throw new Error("upsertFile was not called");
		}

		// Should be strictly YYYY-MM-DD
		expect(args.content).toMatch(/^date: 2024-11-30$/m);
	});
});
