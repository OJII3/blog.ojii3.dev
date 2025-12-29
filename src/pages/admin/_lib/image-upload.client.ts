import { actions } from "astro:actions";

type ToastType = "success" | "error" | "info";

const showToast = (message: string, type: ToastType = "info") => {
	const existing = document.querySelector(".toast-container");
	if (existing) existing.remove();

	const container = document.createElement("div");
	container.className = "toast-container toast toast-top toast-end z-50";

	const alertClass = {
		success: "alert-success",
		error: "alert-error",
		info: "alert-info",
	}[type];

	container.innerHTML = `<div class="alert ${alertClass} shadow-lg"><span>${message}</span></div>`;
	document.body.appendChild(container);

	setTimeout(() => container.remove(), 3000);
};

const insertTextAtCursor = (textarea: HTMLTextAreaElement, text: string) => {
	const start = textarea.selectionStart;
	const end = textarea.selectionEnd;
	const before = textarea.value.substring(0, start);
	const after = textarea.value.substring(end);

	textarea.value = before + text + after;
	textarea.selectionStart = textarea.selectionEnd = start + text.length;
	textarea.focus();

	textarea.dispatchEvent(new Event("input", { bubbles: true }));
};

const uploadImage = async (
	file: File,
	slug: string,
): Promise<string | null> => {
	const formData = new FormData();
	formData.append("image", file);
	formData.append("slug", slug);

	const { data, error } = await actions.uploadImage(formData);

	if (error) {
		throw new Error(error.message);
	}

	return data?.filename ?? null;
};

export const setupImageUploader = (
	uploaderId: string,
	textareaId: string,
	slug: string,
) => {
	const uploader = document.getElementById(uploaderId);
	const textarea = document.getElementById(
		textareaId,
	) as HTMLTextAreaElement | null;
	const fileInput =
		uploader?.querySelector<HTMLInputElement>('input[type="file"]');
	const dropZone = uploader?.querySelector<HTMLElement>("[data-drop-zone]");

	if (!uploader || !textarea || !fileInput) return;

	const handleFiles = async (files: FileList | File[]) => {
		const fileArray = Array.from(files);
		if (fileArray.length === 0) return;

		const statusEl = uploader.querySelector<HTMLElement>(
			"[data-upload-status]",
		);
		if (statusEl) {
			statusEl.textContent = `アップロード中... (0/${fileArray.length})`;
			statusEl.classList.remove("hidden");
		}

		let successCount = 0;

		for (const file of fileArray) {
			try {
				const filename = await uploadImage(file, slug);
				if (filename) {
					const markdown = `![${file.name}](${filename})`;
					insertTextAtCursor(textarea, markdown + "\n");
					successCount++;
				}
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Unknown error";
				showToast(`${file.name}: ${msg}`, "error");
			}

			if (statusEl) {
				statusEl.textContent = `アップロード中... (${successCount}/${fileArray.length})`;
			}
		}

		if (statusEl) {
			statusEl.classList.add("hidden");
		}

		if (successCount > 0) {
			showToast(`${successCount}件の画像をアップロードしました`, "success");
		}

		fileInput.value = "";
	};

	fileInput.addEventListener("change", () => {
		if (fileInput.files) {
			handleFiles(fileInput.files);
		}
	});

	if (dropZone) {
		dropZone.addEventListener("dragover", (e) => {
			e.preventDefault();
			dropZone.classList.add("border-primary", "bg-base-200");
		});

		dropZone.addEventListener("dragleave", (e) => {
			e.preventDefault();
			dropZone.classList.remove("border-primary", "bg-base-200");
		});

		dropZone.addEventListener("drop", (e) => {
			e.preventDefault();
			dropZone.classList.remove("border-primary", "bg-base-200");

			const files = e.dataTransfer?.files;
			if (files) {
				handleFiles(files);
			}
		});
	}

	textarea.addEventListener("paste", (e) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		const imageFiles: File[] = [];
		for (const item of items) {
			if (item.type.startsWith("image/")) {
				const file = item.getAsFile();
				if (file) {
					const timestamp = Date.now();
					const ext = file.type.split("/")[1] || "png";
					const newFile = new File([file], `pasted-${timestamp}.${ext}`, {
						type: file.type,
					});
					imageFiles.push(newFile);
				}
			}
		}

		if (imageFiles.length > 0) {
			e.preventDefault();
			handleFiles(imageFiles);
		}
	});
};
