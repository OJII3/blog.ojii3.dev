import { describe, expect, it, mock } from "bun:test";

// Mock Astro virtual modules BEFORE importing the file under test
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
		record: () => {},
		unknown: () => {},
	},
}));

// Mock dependencies
const mockUpsertFile = mock(() =>
	Promise.resolve({
		content: {
			name: "README.md",
			path: "content/slug/README.md",
			sha: "new-sha",
		},
		commit: { sha: "commit-sha" },
	}),
);

mock.module("../features/admin/_lib/github/client", () => ({
	getGitHubAccessToken: () => Promise.resolve("mock-token"),
}));

mock.module("../features/admin/_lib/github/content", () => ({
	createContentClientFromToken: () => ({
		upsertFile: mockUpsertFile,
	}),
}));

// Now import the file under test
import { updatePostHandler } from "./index";

describe("updatePost action", () => {
	it("should update post with correct frontmatter formatting", async () => {
		const handler = updatePostHandler;

		const context = {
			request: {
				headers: new Headers(),
			},
		};

		const input = {
			slug: "test-slug",
			frontmatter: {
				title: "Test Title",
				date: "2024-11-30",
				tags: ["a", "b"],
			},
			body: "Test Body",
			sha: "old-sha",
		};

		const result = await handler(input, context as any);

		expect(result).toEqual({
			success: true,
			data: {
				content: {
					name: "README.md",
					path: "content/slug/README.md",
					sha: "new-sha",
				},
				commit: { sha: "commit-sha" },
			},
		});

		// Verify that the file content passed to upsertFile has the correct date format (no quotes)
		const calls = mockUpsertFile.mock.calls as any;
		expect(calls.length).toBe(1);
		const args = calls[0][0] as any;

		expect(args.path).toBe("content/test-slug/README.md");
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
		const handler = updatePostHandler;
		const context = { request: { headers: new Headers() } };
		const input = {
			slug: "test-slug-time",
			frontmatter: {
				title: "Time Test",
				date: "2024-11-30T09:00",
				tags: [],
			},
			body: "",
			sha: "old-sha",
		};

		await handler(input, context as any);

		const calls = mockUpsertFile.mock.calls as any;
		// Get the latest call (since previous test also called it)
		const args = calls[calls.length - 1][0] as any;

		// Should be strictly YYYY-MM-DD
		expect(args.content).toMatch(/^date: 2024-11-30$/m);
	});
});
