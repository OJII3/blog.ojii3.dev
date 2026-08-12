import type { Result } from "@/lib/result";
import { err, ok } from "@/lib/result";
import {
	createContentClientFromHeaders,
	type GitHubContentItem,
} from "@/pages/admin/_lib/github";

export type ContentListing = {
	entries: GitHubContentItem[];
	fetchedAt: string;
};

export type ContentListingResult = Result<ContentListing>;

// YYYY-MM-DD-n format
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}-\d+$/;

export const loadContentListing = async (
	headers: Headers,
): Promise<ContentListingResult> => {
	try {
		const client = await createContentClientFromHeaders(headers);
		const listing = await client.listRepoPath("");

		// Filter for directories matching the date pattern
		const filteredEntries = listing
			.filter((item) => item.type === "dir" && DATE_PATTERN.test(item.name))
			.sort((a, b) => b.name.localeCompare(a.name)); // Sort by date descending

		return ok({
			entries: filteredEntries,
			fetchedAt: new Date().toISOString(),
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "未知のエラーが発生しました。";
		return err(message);
	}
};
