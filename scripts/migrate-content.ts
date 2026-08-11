#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { parseArticles } from "./migrate-content-lib";

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		source: { type: "string" },
		"dry-run": { type: "boolean" },
		remote: { type: "boolean" },
	},
	strict: true,
});

if (!values["dry-run"]) {
	console.error(
		"Error: --dry-run is required. Write phase is not implemented yet.",
	);
	process.exit(1);
}

if (!values.source) {
	console.error("Error: --source is required");
	process.exit(1);
}

const sourceDir = values.source as string;
const isRemote = values.remote ?? false;

const result = await parseArticles(sourceDir);

console.log("\n=== Migration Dry Run Result ===");
console.log(`Source: ${sourceDir}`);
console.log(`Remote: ${isRemote ? "enabled" : "disabled"}`);
console.log(`Total articles found: ${result.articles.length}`);
console.log(`Valid articles: ${result.validCount}`);
console.log(`Insert candidates: ${result.insertCandidateCount}`);
console.log(`Total images: ${result.imageCount}`);
console.log(`Skipped files: ${result.skippedCount}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Duplicates: ${result.duplicates.length}`);

if (result.errors.length > 0) {
	console.log("\n--- Errors ---");
	for (const error of result.errors) {
		console.log(`  ${error.slug}: ${error.message}`);
	}
}

if (result.duplicates.length > 0) {
	console.log("\n--- Duplicates ---");
	for (const dup of result.duplicates) {
		console.log(`  ${dup}`);
	}
}

if (result.errors.length > 0 || result.duplicates.length > 0) {
	process.exitCode = 1;
}

if (result.validCount > 0) {
	console.log("\n--- Valid Articles ---");
	for (const article of result.articles) {
		if (article.status === "valid") {
			console.log(
				`  ${article.slug}: ${article.frontmatter.title} (${article.frontmatter.date})`,
			);
			if (article.images.length > 0) {
				console.log(`    Images: ${article.images.length}`);
				for (const img of article.images) {
					console.log(`      ${img.r2Key} (${img.mimeType})`);
				}
			}
			if (article.skipped.length > 0) {
				console.log(`    Skipped: ${article.skipped.length}`);
				for (const skip of article.skipped) {
					console.log(`      ${skip.path}: ${skip.reason}`);
				}
			}
		}
	}
}
