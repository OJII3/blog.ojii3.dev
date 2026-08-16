export type OgImagePost = {
	slug: string;
	revision: number;
	title: string;
	date: string;
};

export const getOgImageKey = (slug: string, revision: number): string => {
	return `${slug}/og-image-${revision}.png`;
};

export const getOgImageUrl = (
	mediaBaseUrl: string,
	slug: string,
	revision: number,
): string => {
	const baseUrl = `${mediaBaseUrl.replace(/\/+$/, "")}/`;
	return new URL(
		`${encodeURIComponent(slug)}/og-image-${revision}.png`,
		baseUrl,
	).href;
};

export const getOgImageRouteUrl = (
	siteUrl: string | URL,
	slug: string,
	revision: number,
): string => {
	const url = new URL(`/${encodeURIComponent(slug)}/og-image.png`, siteUrl);
	url.searchParams.set("v", String(revision));
	return url.href;
};
