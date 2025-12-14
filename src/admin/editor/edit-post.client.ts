import { actions } from "astro:actions";

type SubmitState = {
	button?: HTMLButtonElement | null;
	label?: HTMLElement | null;
	originalText?: string;
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
		draft: draft ? true : undefined,
	};
};

const toggleSubmitState = (state: SubmitState, isSubmitting: boolean) => {
	if (!state.button || !state.label || !state.originalText) return;
	state.button.disabled = isSubmitting;
	state.label.textContent = isSubmitting ? "Saving..." : state.originalText;
};

const readSubmitState = (form: HTMLFormElement): SubmitState => {
	const button = form.querySelector(
		'button[type="submit"]',
	) as HTMLButtonElement | null;
	const label = form.querySelector<HTMLElement>("#btn-text");

	return {
		button,
		label,
		originalText: label?.textContent ?? undefined,
	};
};

const getFormMetadata = (form: HTMLFormElement) => {
	const slug = form.dataset.slug;
	const sha = form.dataset.sha;

	return { slug, sha };
};

export const setupEditPostForm = (formId = "edit-form") => {
	const form = document.getElementById(formId) as HTMLFormElement | null;
	if (!form) return;

	const submitState = readSubmitState(form);
	const { slug, sha } = getFormMetadata(form);

	if (!slug) {
		console.warn("Missing slug on edit form; aborting setup.");
		return;
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		toggleSubmitState(submitState, true);

		const formData = new FormData(form);
		const frontmatter = buildFrontmatter(formData);
		const body = formData.get("body");

		try {
			const { error } = await actions.updatePost({
				slug,
				frontmatter,
				body: typeof body === "string" ? body : "",
				sha,
			});

			if (!error) {
				window.location.href = `/admin/preview/${slug}`;
				return;
			}

			alert(`Error: ${error.message}`);
		} catch (error) {
			console.error(error);
			alert("Network error");
		} finally {
			toggleSubmitState(submitState, false);
		}
	});
};
