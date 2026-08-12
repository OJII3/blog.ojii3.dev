import { actions } from "astro:actions";

type SearchResultItem = {
	slug: string;
	title: string;
	excerpt: string;
	dateString: string;
	color: string;
};

const createResultElement = (result: SearchResultItem): HTMLElement => {
	const url = `/${result.slug}/`;

	const link = document.createElement("a");
	link.className = `${result.color} 2x:w-[200px] 2x:h-[200px] 2x:max-w-[200px] flex h-[calc(50dvw-32px)] max-w-full min-w-full flex-col gap-2 overflow-hidden rounded-2xl border-2 p-4`;
	link.href = url;

	const title = document.createElement("h3");
	title.className = "text-gray-5 text-xs";
	title.textContent = result.title;

	const excerptWrapper = document.createElement("p");
	excerptWrapper.className = "overflow-hidden";

	const excerpt = document.createElement("span");
	excerpt.className = "text-sm font-bold overflow-ellipsis";
	excerpt.textContent = result.excerpt;

	excerptWrapper.appendChild(excerpt);
	link.appendChild(title);
	link.appendChild(excerptWrapper);

	return link;
};

export const initSearch = () => {
	const resultsContainer = document.querySelector("#results");

	if (!resultsContainer) return;

	const searchAndShow = async (tags: string[], query: string | null) => {
		if ((!query || query.trim() === "") && (!tags || tags.length === 0)) {
			resultsContainer.innerHTML = "";
			return;
		}

		const { data, error } = await actions.searchPosts({
			query: query || undefined,
			tags: tags.length > 0 ? tags : undefined,
		});

		resultsContainer.innerHTML = "";

		if (error) {
			console.error("Search error:", error);
			return;
		}

		for (const result of data) {
			const element = createResultElement(result);
			resultsContainer.appendChild(element);
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
