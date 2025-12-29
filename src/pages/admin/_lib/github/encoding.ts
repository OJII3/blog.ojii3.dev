/**
 * Base64エンコード/デコードのユーティリティ
 * Node.js (Buffer) とブラウザ (TextEncoder + btoa) の両方に対応
 */

/**
 * UTF-8文字列をBase64にエンコード
 */
export const encodeBase64 = (content: string): string => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(content, "utf8").toString("base64");
	}
	const encoded = new TextEncoder().encode(content);
	let binary = "";
	for (const byte of encoded) binary += String.fromCharCode(byte);
	return btoa(binary);
};

/**
 * Base64文字列をUTF-8にデコード
 */
export const decodeBase64 = (content: string): string => {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(content, "base64").toString("utf8");
	}
	const binary = atob(content);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
};
