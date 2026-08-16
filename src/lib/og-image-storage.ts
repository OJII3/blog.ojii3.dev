import { getColorIndex } from "@/pages/_lib/utils/color";
import type { OgImageRenderer } from "./og-image";
import { getOgImageKey, type OgImagePost } from "./og-image-path";

const OG_IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const createOgImageSaver = (options: {
	media: R2Bucket;
	render: OgImageRenderer;
}) => {
	return async (post: OgImagePost): Promise<void> => {
		const date = new Date(`${post.date}T00:00:00Z`);
		const image = await options.render({
			title: post.title,
			date,
			color: getColorIndex(date),
		});

		await options.media.put(getOgImageKey(post.slug, post.revision), image, {
			httpMetadata: {
				contentType: "image/png",
				cacheControl: OG_IMAGE_CACHE_CONTROL,
			},
		});
	};
};
