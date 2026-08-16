import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { createOgImageRenderer } from "./og-image";

const toArrayBuffer = (file: Uint8Array): ArrayBuffer => {
	const copy = new Uint8Array(file.byteLength);
	copy.set(file);
	return copy.buffer;
};

describe("createOgImageRenderer", () => {
	it("renders a PNG from the local OG assets", async () => {
		const renderer = createOgImageRenderer(
			async (path) => toArrayBuffer(await readFile(`public${path}`)),
			{
				wordmarkSrc: `data:image/svg+xml;base64,${Buffer.from(
					await readFile("src/assets/wordmark-for-og.svg"),
				).toString("base64")}`,
			},
		);

		const png = await renderer({
			title: "テスト記事",
			date: new Date("2024-01-01T00:00:00Z"),
			color: 1,
		});

		expect(Array.from(png.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
	});
});
