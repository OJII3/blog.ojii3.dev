import { describe, expect, it } from "bun:test";
import {
	err,
	fromPromise,
	isUnauthorized,
	map,
	mapError,
	ok,
	unauthorized,
} from "./result";

describe("Result型", () => {
	describe("ok", () => {
		it("成功結果を作成できる", () => {
			const result = ok(42);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});
	});

	describe("err", () => {
		it("失敗結果を作成できる", () => {
			const result = err("エラーメッセージ");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("エラーメッセージ");
			}
		});
	});

	describe("unauthorized", () => {
		it("認証エラー結果を作成できる", () => {
			const result = unauthorized();
			expect(result.ok).toBe(false);
			expect(isUnauthorized(result)).toBe(true);
		});
	});

	describe("isUnauthorized", () => {
		it("認証エラーを正しく判定できる", () => {
			expect(isUnauthorized(unauthorized())).toBe(true);
			expect(isUnauthorized(ok(42))).toBe(false);
			expect(isUnauthorized(err("other error"))).toBe(false);
		});
	});

	describe("map", () => {
		it("成功時に値を変換できる", () => {
			const result = map(ok(2), (x) => x * 3);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(6);
			}
		});

		it("失敗時は変換されない", () => {
			const result = map(err("error"), (x: number) => x * 3);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("error");
			}
		});
	});

	describe("mapError", () => {
		it("失敗時にエラーを変換できる", () => {
			const result = mapError(err("error"), (e) => `wrapped: ${e}`);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("wrapped: error");
			}
		});

		it("成功時は変換されない", () => {
			const result = mapError(ok(42), (e) => `wrapped: ${e}`);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});
	});

	describe("fromPromise", () => {
		it("成功したPromiseをResultに変換できる", async () => {
			const result = await fromPromise(Promise.resolve(42));
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});

		it("失敗したPromiseをResultに変換できる", async () => {
			const result = await fromPromise(Promise.reject(new Error("failed")));
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toBe("failed");
			}
		});

		it("非ErrorオブジェクトもErrorに変換される", async () => {
			const result = await fromPromise(Promise.reject("string error"));
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toBe("string error");
			}
		});
	});
});
