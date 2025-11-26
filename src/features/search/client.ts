const borderColors = [
	"border-rose-500",
	"border-orange-500",
	"border-yellow-500",
	"border-lime-500",
	"border-emerald-500",
	"border-indigo-500",
	"border-purple-500",
];

const getIndexByDate = (dateString: string) => {
	const date = new Date(dateString);
	return date.getDate() % borderColors.length;
};

export const initSearch = () => {
	console.log("initSearch called");
	const resultsContainer = document.querySelector("#results");
	const template = document.querySelector("#search-result-template");

	if (!resultsContainer || !template) return;

	/**
	 *
	 * @param tags {string[]}
	 * @param query {string | null}
	 */
	const searchAndShow = async (tags: string[], query: string | null) => {
		const pagefind = await import("/pagefind/pagefind.js");
		const search = await pagefind.search(query || null, {
			filters: tags && tags.length > 0 ? { tag: tags } : undefined,
		});

		resultsContainer.innerHTML = "";
		for (const result of search.results) {
			const data = await result.data();
			const borderColor = borderColors[getIndexByDate(data.meta.date)];
			const resultElement = document.createElement("div");
			resultElement.innerHTML = template.innerHTML
				.replace("%%borderColor%%", borderColor)
				.replace("%%url%%", data.url)
				.replace("%%title%%", data.meta.title)
				.replace("%%excerpt%%", data.excerpt);
			resultsContainer.appendChild(resultElement.firstElementChild as Node);
		}
	};

	const handleUrlChange = () => {
		const urlParams = new URLSearchParams(window.location.search);
		const query = urlParams.get("search") || "";
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
	const query = urlParams.get("search") || null;
	const tags = urlParams.getAll("tag");
	if (query || tags.length > 0) {
		searchAndShow(tags, query);
	}
};
