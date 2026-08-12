import { describe, expect, it, mock } from "bun:test";
import {
	handleUploadImage,
	sanitizeFilename,
	validateImageFile,
	validateSlug,
} from "./media";

describe("validateSlug", () => {
	it("accepts valid YYYY-MM-DD-n slugs", () => {
		expect(() => validateSlug("2024-01-01-1")).not.toThrow();
		expect(() => validateSlug("2024-12-31-42")).not.toThrow();
	});

	it("rejects invalid slugs", () => {
		expect(() => validateSlug("")).toThrow();
		expect(() => validateSlug("hello")).toThrow();
		expect(() => validateSlug("2024-01-01")).toThrow();
		expect(() => validateSlug("2024/01/01-1")).toThrow();
	});
});

describe("validateImageFile", () => {
	it("accepts valid image types within size limit", () => {
		const file = new File(["x"], "test.png", { type: "image/png" });
		expect(() => validateImageFile(file)).not.toThrow();
	});

	it("accepts all supported MIME types", () => {
		for (const type of [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
		]) {
			const file = new File(["x"], "test", { type });
			expect(() => validateImageFile(file)).not.toThrow();
		}
	});

	it("rejects unsupported MIME types", () => {
		const file = new File(["x"], "test.bmp", { type: "image/bmp" });
		expect(() => validateImageFile(file)).toThrow();
	});

	it("rejects files over 10MB", () => {
		const big = new File([new ArrayBuffer(11 * 1024 * 1024)], "big.png", {
			type: "image/png",
		});
		expect(() => validateImageFile(big)).toThrow();
	});
});

describe("sanitizeFilename", () => {
	it("extracts basename from path", () => {
		expect(sanitizeFilename("path/to/file.png")).toBe("file.png");
		expect(sanitizeFilename("C:\\Users\\file.png")).toBe("file.png");
	});

	it("preserves safe filenames", () => {
		expect(sanitizeFilename("photo.jpg")).toBe("photo.jpg");
		expect(sanitizeFilename("my-image_v2.png")).toBe("my-image_v2.png");
	});
});

describe("handleUploadImage", () => {
	const mockMedia = {
		head: mock(() => Promise.resolve(null)),
		put: mock(() => Promise.resolve()),
	} as unknown as R2Bucket;

	it("rejects missing file", async () => {
		const formData = new FormData();
		formData.append("slug", "2024-01-01-1");

		expect(
			handleUploadImage(formData, mockMedia, "https://media.example.com"),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("rejects missing slug", async () => {
		const formData = new FormData();
		formData.append(
			"image",
			new File(["x"], "test.png", { type: "image/png" }),
		);

		expect(
			handleUploadImage(formData, mockMedia, "https://media.example.com"),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("rejects invalid slug format", async () => {
		const formData = new FormData();
		formData.append(
			"image",
			new File(["x"], "test.png", { type: "image/png" }),
		);
		formData.append("slug", "invalid-slug");

		expect(
			handleUploadImage(formData, mockMedia, "https://media.example.com"),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("rejects overwrite when key already exists", async () => {
		const mediaWithExisting = {
			head: mock(() => Promise.resolve({ key: "2024-01-01-1/test.png" })),
			put: mock(() => Promise.resolve()),
		} as unknown as R2Bucket;

		const formData = new FormData();
		formData.append(
			"image",
			new File(["x"], "test.png", { type: "image/png" }),
		);
		formData.append("slug", "2024-01-01-1");

		expect(
			handleUploadImage(
				formData,
				mediaWithExisting,
				"https://media.example.com",
			),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("uploads successfully and returns filename, path, url", async () => {
		const putMock = mock(() => Promise.resolve());
		const media = {
			head: mock(() => Promise.resolve(null)),
			put: putMock,
		} as unknown as R2Bucket;

		const formData = new FormData();
		formData.append(
			"image",
			new File(["x"], "photo.png", { type: "image/png" }),
		);
		formData.append("slug", "2024-01-01-1");

		const result = await handleUploadImage(
			formData,
			media,
			"https://media.example.com",
		);

		expect(result).toEqual({
			filename: "photo.png",
			path: "photo.png",
			url: "https://media.example.com/2024-01-01-1/photo.png",
		});
		expect(putMock).toHaveBeenCalled();
	});
});
