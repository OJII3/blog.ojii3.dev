/**
 * Toast通知を表示するためのユーティリティ（クライアントサイド専用）
 */

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
	duration?: number;
}

const DEFAULT_DURATION = 3000;
const CONTAINER_CLASS = "toast-container";

const alertClassMap: Record<ToastType, string> = {
	success: "alert-success",
	error: "alert-error",
	info: "alert-info",
};

/**
 * Toast通知を表示
 */
export const showToast = (
	message: string,
	type: ToastType = "info",
	options: ToastOptions = {},
) => {
	const { duration = DEFAULT_DURATION } = options;

	// 既存のトーストを削除
	const existing = document.querySelector(`.${CONTAINER_CLASS}`);
	if (existing) existing.remove();

	const container = document.createElement("div");
	container.className = `${CONTAINER_CLASS} toast toast-top toast-end z-50`;

	const alertClass = alertClassMap[type];
	container.innerHTML = `<div class="alert ${alertClass} shadow-lg"><span>${message}</span></div>`;

	document.body.appendChild(container);

	setTimeout(() => container.remove(), duration);
};

/** 成功通知を表示 */
export const showSuccess = (message: string, options?: ToastOptions) =>
	showToast(message, "success", options);

/** エラー通知を表示 */
export const showError = (message: string, options?: ToastOptions) =>
	showToast(message, "error", options);

/** 情報通知を表示 */
export const showInfo = (message: string, options?: ToastOptions) =>
	showToast(message, "info", options);
