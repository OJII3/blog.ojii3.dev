import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { glob } from "astro/loaders";

const REPO_URL = "https://github.com/OJII3/content.git";
const TARGET_DIR = "./content";

/**
 * 外部GitHubリポジトリからコンテンツを取得するカスタムローダー
 *
 * @param pattern - glob パターン (例: \*\*\/README.md)
 * @param base - ベースディレクトリ (例: ./content)
 * @returns glob ローダー
 */
export function github(pattern: string | string[], base: string) {
	ensureContentRepo();
	return glob({
		pattern,
		base,
		generateId: ({ entry }) =>
			entry
				.replace(/\\/g, "/")
				.replace(/\/README\.md$/i, "")
				.replace(/\.md$/, ""),
	});
}

/**
 * リポジトリのクローンまたは更新を保証する
 */
function ensureContentRepo(): void {
	const targetPath = resolve(process.cwd(), TARGET_DIR);

	try {
		if (existsSync(targetPath)) {
			console.log(`[github-glob] Pulling latest content from ${REPO_URL}...`);
			execSync("git pull", { cwd: targetPath, stdio: "inherit" });
			console.log("[github-glob] Content updated successfully.");
		} else {
			console.log(`[github-glob] Cloning content from ${REPO_URL}...`);
			execSync(`git clone --depth 1 ${REPO_URL} ${targetPath}`, {
				stdio: "inherit",
			});
			console.log("[github-glob] Content cloned successfully.");
		}
	} catch (error) {
		console.error("[github-glob] Failed to ensure content repository:", error);
		throw new Error(
			`Failed to clone or update content repository: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
