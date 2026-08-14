import { describe, expect, it, mock } from "bun:test";
import type { ContentD1Database } from "@/db/client";
import type { createPost, updatePost } from "@/lib/content/repository";
import { handleCreatePost, handleUpdatePost } from "./content";

function createMockDb(): ContentD1Database {
	return {} as ContentD1Database;
}

describe("handleUpdatePost", () => {
	it("returns revision on successful update", async () => {
		const mockUpdatePost = mock<typeof updatePost>(() =>
			Promise.resolve({ kind: "updated", revision: 5 }),
		);

		const result = await handleUpdatePost(
			{
				slug: "2024-01-01-1",
				frontmatter: {
					title: "Test",
					date: "2024-01-01",
					tags: [],
					draft: false,
				},
				body: "body",
				revision: 4,
			},
			createMockDb(),
			mockUpdatePost,
		);

		expect(result).toEqual({ revision: 5 });
		expect(mockUpdatePost).toHaveBeenCalledWith(expect.anything(), {
			slug: "2024-01-01-1",
			title: "Test",
			date: "2024-01-01",
			tags: [],
			draft: false,
			body: "body",
			revision: 4,
		});
	});

	it("normalizes ISO date to YYYY-MM-DD", async () => {
		const mockUpdatePost = mock<typeof updatePost>(() =>
			Promise.resolve({ kind: "updated", revision: 2 }),
		);

		await handleUpdatePost(
			{
				slug: "2024-01-01-1",
				frontmatter: { title: "Test", date: "2024-01-01T09:00:00", tags: [] },
				body: "body",
				revision: 1,
			},
			createMockDb(),
			mockUpdatePost,
		);

		const callArgs = mockUpdatePost.mock.calls[0]?.[1];
		expect(callArgs?.date).toBe("2024-01-01");
	});

	it("throws CONFLICT on stale revision", async () => {
		const mockUpdatePost = mock<typeof updatePost>(() =>
			Promise.resolve({ kind: "conflict" }),
		);

		expect(
			handleUpdatePost(
				{
					slug: "2024-01-01-1",
					frontmatter: { title: "Test", date: "2024-01-01", tags: [] },
					body: "body",
					revision: 1,
				},
				createMockDb(),
				mockUpdatePost,
			),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("throws NOT_FOUND for missing slug", async () => {
		const mockUpdatePost = mock<typeof updatePost>(() =>
			Promise.resolve({ kind: "not-found" }),
		);

		expect(
			handleUpdatePost(
				{
					slug: "2024-01-01-999",
					frontmatter: { title: "Test", date: "2024-01-01", tags: [] },
					body: "body",
					revision: 1,
				},
				createMockDb(),
				mockUpdatePost,
			),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("rejects an invalid slug before updating", async () => {
		const mockUpdatePost = mock<typeof updatePost>();

		expect(
			handleUpdatePost(
				{
					slug: "../../etc",
					frontmatter: { title: "Test", date: "2024-01-01" },
					body: "body",
					revision: 1,
				},
				createMockDb(),
				mockUpdatePost,
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(mockUpdatePost).not.toHaveBeenCalled();
	});

	it("rejects an invalid date before updating", async () => {
		const mockUpdatePost = mock<typeof updatePost>();

		expect(
			handleUpdatePost(
				{
					slug: "2024-01-01-1",
					frontmatter: { title: "Test", date: "2024-02-30" },
					body: "body",
					revision: 1,
				},
				createMockDb(),
				mockUpdatePost,
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(mockUpdatePost).not.toHaveBeenCalled();
	});

	it("defaults tags to empty array and draft to false", async () => {
		const mockUpdatePost = mock<typeof updatePost>(() =>
			Promise.resolve({ kind: "updated", revision: 2 }),
		);

		await handleUpdatePost(
			{
				slug: "2024-01-01-1",
				frontmatter: { title: "Test", date: "2024-01-01" },
				body: "body",
				revision: 1,
			},
			createMockDb(),
			mockUpdatePost,
		);

		const callArgs = mockUpdatePost.mock.calls[0]?.[1];
		expect(callArgs?.tags).toEqual([]);
		expect(callArgs?.draft).toBe(false);
	});
});

describe("handleCreatePost", () => {
	it("returns the created slug and revision", async () => {
		const mockCreatePost = mock<typeof createPost>(() =>
			Promise.resolve({ kind: "created", slug: "2024-01-01-0", revision: 1 }),
		);

		const result = await handleCreatePost(
			{
				frontmatter: {
					title: " New post ",
					date: "2024-01-01",
					tags: ["astro"],
				},
				body: "body",
			},
			createMockDb(),
			mockCreatePost,
		);

		expect(result).toEqual({ slug: "2024-01-01-0", revision: 1 });
		expect(mockCreatePost).toHaveBeenCalledWith(expect.anything(), {
			title: "New post",
			date: "2024-01-01",
			tags: ["astro"],
			draft: true,
			body: "body",
		});
	});

	it("rejects an invalid date before creating", async () => {
		const mockCreatePost = mock<typeof createPost>();

		expect(
			handleCreatePost(
				{
					frontmatter: { title: "New post", date: "2024-02-30" },
					body: "body",
				},
				createMockDb(),
				mockCreatePost,
			),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(mockCreatePost).not.toHaveBeenCalled();
	});
});
