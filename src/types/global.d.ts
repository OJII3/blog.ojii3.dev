export {};

declare global {
	interface Window {
		_searchUrlChangeHandler?: () => void;
	}
}
