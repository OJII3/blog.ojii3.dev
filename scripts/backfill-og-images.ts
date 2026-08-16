#!/usr/bin/env bun
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
	createOgImageRenderer,
	OG_IMAGE_WASM_PATH,
	type OgImageAssetLoader,
	type OgImageRenderInput,
} from "../src/lib/og-image";
import { getOgImageKey } from "../src/lib/og-image-path";
import { getColorIndex } from "../src/pages/_lib/utils/color";
import {
	BunCommandRunner,
	type CommandRunner,
	r2ObjectExists,
} from "./migrate-content-writer";

type BackfillPost = {
	slug: string;
	title: string;
	date: string;
	revision: number;
};

type WranglerResult = {
	results?: unknown;
};

export function parseRows(stdout: string): BackfillPost[] {
	try {
		const parsed = JSON.parse(stdout) as WranglerResult | WranglerResult[];
		const result = Array.isArray(parsed) ? parsed[0] : parsed;
		if (!Array.isArray(result?.results)) return [];

		return result.results.filter((row): row is BackfillPost => {
			if (typeof row !== "object" || row === null) return false;
			const post = row as Record<string, unknown>;
			return (
				typeof post.slug === "string" &&
				typeof post.title === "string" &&
				typeof post.date === "string" &&
				Number.isInteger(post.revision)
			);
		});
	} catch {
		throw new Error(`Failed to parse D1 response: ${stdout}`);
	}
}

export async function fetchPosts(
	isRemote: boolean,
	runner: CommandRunner,
): Promise<BackfillPost[]> {
	const locationFlag = isRemote ? "--remote" : "--local";
	const result = await runner.run([
		"bun",
		"wrangler",
		"d1",
		"execute",
		"blog-content",
		locationFlag,
		"--command",
		"SELECT slug, title, date, revision FROM posts WHERE draft = 0 ORDER BY date DESC",
		"--json",
	]);

	if (result.exitCode !== 0) {
		throw new Error(`Failed to query D1: ${result.stderr}`);
	}

	return parseRows(result.stdout);
}

const toArrayBuffer = (file: Uint8Array): ArrayBuffer => {
	const copy = new Uint8Array(file.byteLength);
	copy.set(file);
	return copy.buffer;
};

const createLocalAssetLoader = (): OgImageAssetLoader => {
	return async (path) => {
		const file = await readFile(
			path === OG_IMAGE_WASM_PATH
				? new URL(
						"../node_modules/@resvg/resvg-wasm/index_bg.wasm",
						import.meta.url,
					)
				: new URL(`../public${path}`, import.meta.url),
		);
		return toArrayBuffer(file);
	};
};

const renderOgImage = async (
	render: (input: OgImageRenderInput) => Promise<Uint8Array>,
	post: BackfillPost,
): Promise<Uint8Array> => {
	const date = new Date(`${post.date}T00:00:00Z`);
	return render({
		title: post.title,
		date,
		color: getColorIndex(date),
	});
};

export async function uploadOgImage(
	post: BackfillPost,
	isRemote: boolean,
	runner: CommandRunner,
	render: (input: OgImageRenderInput) => Promise<Uint8Array>,
	tmpDir: string,
): Promise<"uploaded" | "skipped"> {
	const key = getOgImageKey(post.slug, post.revision);
	const r2Key = `blog-media/${key}`;
	if (await r2ObjectExists(r2Key, isRemote, runner)) return "skipped";

	const image = await renderOgImage(render, post);
	const imagePath = join(tmpDir, `${post.slug}-${post.revision}.png`);
	await writeFile(imagePath, image);

	const locationFlag = isRemote ? "--remote" : "--local";
	const result = await runner.run([
		"bun",
		"wrangler",
		"r2",
		"object",
		"put",
		r2Key,
		"--file",
		imagePath,
		"--content-type",
		"image/png",
		"--cache-control",
		"public, max-age=31536000, immutable",
		locationFlag,
		"--force",
	]);

	if (result.exitCode !== 0) {
		throw new Error(`Failed to upload ${r2Key}: ${result.stderr}`);
	}

	return "uploaded";
}

async function main() {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			remote: { type: "boolean" },
			"dry-run": { type: "boolean" },
		},
		strict: true,
	});

	const isRemote = values.remote ?? false;
	const isDryRun = values["dry-run"] ?? false;
	const runner = new BunCommandRunner();
	const posts = await fetchPosts(isRemote, runner);

	console.log(`Published posts: ${posts.length}`);
	console.log(`Remote: ${isRemote ? "enabled" : "disabled"}`);

	if (isDryRun || posts.length === 0) return;

	const tmpDir = await mkdtemp(join(tmpdir(), "og-image-backfill-"));
	try {
		const svg = await readFile(
			new URL("../src/assets/wordmark-for-og.svg", import.meta.url),
			"utf8",
		);
		const wordmarkSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
		const renderer = createOgImageRenderer(createLocalAssetLoader(), {
			wordmarkSrc,
		});
		let uploaded = 0;
		let skipped = 0;

		for (const post of posts) {
			const result = await uploadOgImage(
				post,
				isRemote,
				runner,
				renderer,
				tmpDir,
			);
			if (result === "uploaded") uploaded++;
			else skipped++;
		}

		console.log(
			`OG image backfill completed: ${uploaded} uploaded, ${skipped} skipped.`,
		);
	} finally {
		await rm(tmpDir, { recursive: true, force: true });
	}
}

if (import.meta.main) await main();
