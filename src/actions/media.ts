import { ActionError } from "astro:actions";
import { isValidContentSlug } from "@/lib/content/validation";

const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
export function validateSlug(slug: string): void {
	if (!isValidContentSlug(slug)) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: `記事のslugが不正な形式です: ${slug}`,
		});
	}
}

export function validateImageFile(file: File): void {
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: `対応していないファイル形式です: ${file.type}`,
		});
	}
	if (file.size > MAX_FILE_SIZE) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "ファイルサイズが10MBを超えています。",
		});
	}
}

export function sanitizeFilename(filename: string): string {
	const basename = filename.replace(/.*[/\\]/, "");
	return basename.replace(/\0/g, "");
}

export async function handleUploadImage(
	formData: FormData,
	media: R2Bucket,
	mediaBaseUrl: string,
) {
	const file = formData.get("image") as File | null;
	const slug = formData.get("slug") as string | null;

	if (!file || !(file instanceof File)) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "画像ファイルが選択されていません。",
		});
	}

	if (!slug) {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "記事のslugが指定されていません。",
		});
	}

	validateSlug(slug);
	validateImageFile(file);

	const filename = sanitizeFilename(file.name);
	if (!filename || filename === "." || filename === "..") {
		throw new ActionError({
			code: "BAD_REQUEST",
			message: "ファイル名が不正です。",
		});
	}
	const key = `${slug}/${filename}`;

	const existing = await media.head(key);
	if (existing) {
		throw new ActionError({
			code: "CONFLICT",
			message: `画像 ${key} は既に存在します。`,
		});
	}

	await media.put(key, file.stream(), {
		httpMetadata: { contentType: file.type },
	});

	return {
		filename,
		path: filename,
		url: new URL(
			`${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`,
			`${mediaBaseUrl.replace(/\/+$/, "")}/`,
		).href,
	};
}
