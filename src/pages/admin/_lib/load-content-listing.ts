import {
	createContentClient,
	type GitHubContentItem,
} from "@/pages/admin/_lib/github";

export type ContentListingResult =
	| { status: "ok"; entries: GitHubContentItem[]; fetchedAt: string }
	| { status: "error"; message: string };

// YYYY-MM-DD-n format
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}-\d+$/;

export const loadContentListing = async (
	headers: Headers,
): Promise<ContentListingResult> => {
	try {
		const client = await createContentClient(headers);
		const listing = await client.listRepoPath("");

		// Filter for directories matching the date pattern
		const filteredEntries = listing
			.filter((item) => item.type === "dir" && DATE_PATTERN.test(item.name))
			.sort((a, b) => b.name.localeCompare(a.name)); // Sort by date descending

		return {
			status: "ok",
			entries: filteredEntries,
			fetchedAt: new Date().toISOString(),
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "未知のエラーが発生しました。";
		return { status: "error", message };
	}
};
