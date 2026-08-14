import { actions } from "astro:actions";
import { showToast } from "./ui/toast";

type SubmitState = {
	button?: HTMLButtonElement | null;
	label?: HTMLElement | null;
	originalText?: string;
	originalTitle?: string;
};

const parseTags = (value: FormDataEntryValue | null) => {
	if (typeof value !== "string") return [] as string[];

	return value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
};

const buildFrontmatter = (formData: FormData) => {
	const draft = formData.get("draft") === "on";
	const title = formData.get("title");
	const date = formData.get("date");

	return {
		title: typeof title === "string" ? title : "",
		date: typeof date === "string" ? date : "",
		tags: parseTags(formData.get("tags")),
		draft,
	};
};

const toggleSubmitState = (state: SubmitState, isSubmitting: boolean) => {
	if (!state.button) return;

	state.button.disabled = isSubmitting;
	state.button.setAttribute("aria-busy", String(isSubmitting));
	if (state.originalTitle) {
		state.button.title = isSubmitting ? "Saving..." : state.originalTitle;
	}
	if (state.label && state.originalText) {
		state.label.textContent = isSubmitting ? "Saving..." : state.originalText;
	}
};

const readSubmitState = (form: HTMLFormElement): SubmitState => {
	const button =
		form.querySelector<HTMLButtonElement>('button[type="submit"]') ??
		form.ownerDocument.querySelector<HTMLButtonElement>(
			`button[type="submit"][form="${form.id}"]`,
		);
	const label = form.querySelector<HTMLElement>("#btn-text");

	return {
		button,
		label,
		originalText: label?.textContent ?? undefined,
		originalTitle: button?.title ?? undefined,
	};
};

const getFormMetadata = (form: HTMLFormElement) => {
	const slug = form.dataset.slug;
	const revision = Number(form.dataset.revision);
	const isNew = form.dataset.mode === "create";

	return { slug, revision, isNew };
};

export const setupEditPostForm = (formId = "edit-form") => {
	const form = document.getElementById(formId) as HTMLFormElement | null;
	if (!form) return;

	const submitState = readSubmitState(form);
	const { slug, revision, isNew } = getFormMetadata(form);

	if (!slug && !isNew) {
		console.warn("Missing slug on edit form; aborting setup.");
		return;
	}

	let currentRevision = revision;
	let isSubmitting = false;

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (isSubmitting) return;
		isSubmitting = true;

		toggleSubmitState(submitState, true);

		const formData = new FormData(form);
		const frontmatter = buildFrontmatter(formData);
		const body = formData.get("body");

		try {
			const { data, error } = isNew
				? await actions.createPost({
						frontmatter,
						body: typeof body === "string" ? body : "",
					})
				: await actions.updatePost({
						slug: slug as string,
						frontmatter,
						body: typeof body === "string" ? body : "",
						revision: currentRevision,
					});

			if (!error && data) {
				if (isNew && "slug" in data) {
					showToast("記事を作成しました", "success");
					window.location.assign(`/admin/edit/${data.slug}`);
					return;
				}
				if (data.revision != null) {
					currentRevision = data.revision;
					form.dataset.revision = String(data.revision);
				}
				showToast("保存しました", "success");
				return;
			}

			if (error?.code === "CONFLICT") {
				showToast(
					"コンフリクトが発生しました。ページを再読み込みしてください。",
					"error",
				);
			} else {
				const message = error?.message ?? "Unknown error";
				showToast(`エラー: ${message}`, "error");
			}
		} catch (err) {
			console.error(err);
			showToast("ネットワークエラーが発生しました", "error");
		} finally {
			isSubmitting = false;
			toggleSubmitState(submitState, false);
		}
	});
};
