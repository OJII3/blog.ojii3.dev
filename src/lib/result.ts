/**
 * Result型 - エラーハンドリングを型安全に行うためのユーティリティ
 *
 * 使用例:
 * ```typescript
 * const result = await fetchData();
 * if (result.ok) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

/** 成功または失敗を表す基本のResult型 */
export type Result<T, E = string> =
	| { ok: true; value: T }
	| { ok: false; error: E };

/** 認証エラーを含むResult型（admin用） */
export type AuthResult<T, E = string> =
	| { ok: true; value: T }
	| { ok: false; error: E; unauthorized?: false }
	| { ok: false; error: "UNAUTHORIZED"; unauthorized: true };

/** 成功を表すResultを作成 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** 失敗を表すResultを作成 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** 認証エラーを表すResultを作成 */
export const unauthorized = (): AuthResult<never, "UNAUTHORIZED"> => ({
	ok: false,
	error: "UNAUTHORIZED",
	unauthorized: true,
});

/** 認証エラーかどうかを判定 */
export const isUnauthorized = <T, E>(
	result: AuthResult<T, E>,
): result is { ok: false; error: "UNAUTHORIZED"; unauthorized: true } =>
	!result.ok && "unauthorized" in result && result.unauthorized === true;

/** Result.mapの実装 */
export const map = <T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => U,
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

/** Result.mapErrorの実装 */
export const mapError = <T, E, F>(
	result: Result<T, E>,
	fn: (error: E) => F,
): Result<T, F> => (result.ok ? result : err(fn(result.error)));

/** Promise<T>をPromise<Result<T, Error>>に変換 */
export const fromPromise = async <T>(
	promise: Promise<T>,
): Promise<Result<T, Error>> => {
	try {
		const value = await promise;
		return ok(value);
	} catch (e) {
		return err(e instanceof Error ? e : new Error(String(e)));
	}
};
