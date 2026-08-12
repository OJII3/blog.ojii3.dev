#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { parseArticles } from "./migrate-content-lib";
import { BunCommandRunner, writeArticles } from "./migrate-content-writer";

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		source: { type: "string" },
		"dry-run": { type: "boolean" },
		remote: { type: "boolean" },
	},
	strict: true,
});

if (!values.source) {
	console.error("Error: --source is required");
	process.exit(1);
}

const sourceDir = values.source as string;
const isDryRun = values["dry-run"] ?? false;
const isRemote = values.remote ?? false;

const result = await parseArticles(sourceDir);

console.log("\n=== Migration Parse Result ===");
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

if (isDryRun) {
	const hasErrors = result.errors.length > 0 || result.duplicates.length > 0;
	process.exit(hasErrors ? 1 : 0);
}

if (result.errors.length > 0 || result.duplicates.length > 0) {
	console.error(
		"\nError: Cannot proceed with write due to errors or duplicates.",
	);
	process.exit(1);
}

const runner = new BunCommandRunner();
const writeResult = await writeArticles(sourceDir, result, isRemote, runner);

console.log("\n=== Migration Write Result ===");
console.log(`Inserted: ${writeResult.inserted}`);
console.log(`Updated: ${writeResult.updated}`);
console.log(`Conflicts: ${writeResult.conflicts.length}`);
console.log(`Images uploaded: ${writeResult.imagesUploaded}`);
console.log(`Images skipped: ${writeResult.imagesSkipped.length}`);
console.log(`Failed images: ${writeResult.failedImages.length}`);

if (writeResult.conflicts.length > 0) {
	console.log("\n--- Conflicts ---");
	for (const slug of writeResult.conflicts) {
		console.log(`  ${slug}: body differs from existing`);
	}
}

if (writeResult.failedImages.length > 0) {
	console.log("\n--- Failed Images ---");
	for (const img of writeResult.failedImages) {
		console.log(`  ${img.key}: ${img.error}`);
	}
}

if (writeResult.conflicts.length > 0 || writeResult.failedImages.length > 0) {
	process.exit(1);
}
