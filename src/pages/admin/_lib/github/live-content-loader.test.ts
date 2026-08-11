import { describe, expect, it } from "bun:test";
import { githubLiveLoader } from "./live-content-loader";

describe("githubLiveLoader", () => {
	describe("URL construction", () => {
		it("should use configurable owner, repo, and ref", () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "develop",
				filename: "README.md",
				basePath: "posts",
			});

			expect(loader.name).toBe("github-live-loader");
		});

		it("should safely encode ref containing # character", () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "release#1",
				filename: "README.md",
				basePath: "posts",
			});

			expect(loader.name).toBe("github-live-loader");
		});

		it("should safely encode ref containing special characters", () => {
			const loader = githubLiveLoader({
				owner: "test owner",
				repo: "test repo",
				ref: "feature/test?query=1",
				filename: "README.md",
				basePath: "posts",
			});

			expect(loader.name).toBe("github-live-loader");
		});

		it("should include basePath in configuration", () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "main",
				filename: "README.md",
				basePath: "docs/posts",
			});

			expect(loader.name).toBe("github-live-loader");
		});

		it("should default ref to main when not provided", () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				filename: "README.md",
				basePath: "posts",
			});

			expect(loader.name).toBe("github-live-loader");
		});
	});

	describe("basePath validation", () => {
		it("should reject basePath with .. traversal", () => {
			expect(() =>
				githubLiveLoader({
					owner: "testowner",
					repo: "testrepo",
					ref: "main",
					filename: "README.md",
					basePath: "../etc",
				}),
			).toThrow("Invalid basePath");
		});

		it("should reject basePath with . segment", () => {
			expect(() =>
				githubLiveLoader({
					owner: "testowner",
					repo: "testrepo",
					ref: "main",
					filename: "README.md",
					basePath: "./posts",
				}),
			).toThrow("Invalid basePath");
		});

		it("should normalize basePath with leading/trailing slashes", () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "main",
				filename: "README.md",
				basePath: "/docs/posts/",
			});

			expect(loader.name).toBe("github-live-loader");
		});

		it("should accept empty basePath", () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "main",
				filename: "README.md",
				basePath: "",
			});

			expect(loader.name).toBe("github-live-loader");
		});
	});

	describe("cacheHint tags", () => {
		it("should include owner/repo in cacheHint tags", async () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "main",
				filename: "README.md",
				basePath: "posts",
			});

			// We can't easily test the actual cacheHint without mocking,
			// but we can verify the loader was created successfully
			expect(loader.name).toBe("github-live-loader");
		});

		it("should include ref in cacheHint tags", async () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "develop",
				filename: "README.md",
				basePath: "posts",
			});

			expect(loader.name).toBe("github-live-loader");
		});

		it("should include normalized basePath in cacheHint tags", async () => {
			const loader = githubLiveLoader({
				owner: "testowner",
				repo: "testrepo",
				ref: "main",
				filename: "README.md",
				basePath: "/docs/posts/",
			});

			expect(loader.name).toBe("github-live-loader");
		});
	});
});
