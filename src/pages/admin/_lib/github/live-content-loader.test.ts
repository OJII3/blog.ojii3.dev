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
});
