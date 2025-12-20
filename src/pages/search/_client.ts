import type { PagefindResult } from "@/types/pagefind";
import { getPostBorderColorFromDate } from "./_lib/getPostBorderColorFromDate";

const createResultElement = async (
	result: PagefindResult,
	template: Element,
): Promise<Node | null> => {
	const data = await result.data();
	const borderColor = getPostBorderColorFromDate(data.meta.date);
	const resultElement = document.createElement("div");
	resultElement.innerHTML = template.innerHTML
		.replace("%%borderColor%%", borderColor)
		.replace("%%url%%", data.url)
		.replace("%%title%%", data.meta.title)
		.replace("%%excerpt%%", data.excerpt);
	return resultElement.firstElementChild;
};

export const initSearch = () => {
	const resultsContainer = document.querySelector("#results");
	const template = document.querySelector("#search-result-template");

	if (!resultsContainer || !template) return;

	const searchAndShow = async (tags: string[], query: string | null) => {
		if ((!query || query.trim() === "") && (!tags || tags.length === 0)) {
			resultsContainer.innerHTML = "";
			return;
		}

		const pagefind = await import("/pagefind/pagefind.js");
		const search = await pagefind.search(query || null, {
			filters: tags && tags.length > 0 ? { tag: tags } : undefined,
		});

		resultsContainer.innerHTML = "";

		for (const result of search.results) {
			const node = await createResultElement(result, template);
			if (node) {
				resultsContainer.appendChild(node);
			}
		}
	};

	const handleUrlChange = () => {
		const urlParams = new URLSearchParams(window.location.search);
		const query = urlParams.get("q") || "";
		const tags = urlParams.getAll("tag");

		searchAndShow(tags, query);
	};

	if (window._searchUrlChangeHandler) {
		window.removeEventListener("popstate", window._searchUrlChangeHandler);
		window.removeEventListener("url-changed", window._searchUrlChangeHandler);
	}
	window._searchUrlChangeHandler = handleUrlChange;
	window.addEventListener("popstate", handleUrlChange);
	window.addEventListener("url-changed", handleUrlChange);

	// URLのクエリパラメータからデフォルト検索語を設定
	const urlParams = new URLSearchParams(window.location.search);
	const query = urlParams.get("q") || null;
	const tags = urlParams.getAll("tag");
	searchAndShow(tags, query);
};
