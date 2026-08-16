import { describe, expect, it, mock } from "bun:test";
import type { OgImageRenderer } from "./og-image";
import { createOgImageSaver } from "./og-image-storage";

describe("createOgImageSaver", () => {
	it("renders and stores a revisioned PNG with cache metadata", async () => {
		const image = new Uint8Array([1, 2, 3]);
		const render = mock<OgImageRenderer>(() => Promise.resolve(image));
		const put = mock(() => Promise.resolve());

		const saveOgImage = createOgImageSaver({
			media: { put } as unknown as R2Bucket,
			render,
		});

		await saveOgImage({
			slug: "2024-01-01-1",
			revision: 3,
			title: "Test title",
			date: "2024-01-01",
		});

		expect(render).toHaveBeenCalledWith({
			title: "Test title",
			date: expect.any(Date),
			color: 1,
		});
		expect(put).toHaveBeenCalledWith("2024-01-01-1/og-image-3.png", image, {
			httpMetadata: {
				contentType: "image/png",
				cacheControl: "public, max-age=31536000, immutable",
			},
		});
	});
});
