import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { posts, postTags, tags } from "../../db/schema";

// D1Database test double wrapping bun:sqlite to exercise the same SQL statements
// that would run against Cloudflare D1 in production. A true D1 binding is unavailable
// in Bun tests, so this double implements prepare/bind/first/all/run/batch.
export interface D1Result<T = unknown> {
	results: T[];
	meta: { changes: number };
	success: boolean;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
	run(): Promise<D1Result>;
}

export interface D1Database {
	prepare(sql: string): D1PreparedStatement;
	batch(stmts: D1PreparedStatement[]): Promise<D1Result[]>;
}

class D1Stmt implements D1PreparedStatement {
	private values: unknown[] = [];
	constructor(
		private sqlite: Database,
		private sql: string,
	) {}
	bind(...values: unknown[]): D1PreparedStatement {
		const s = new D1Stmt(this.sqlite, this.sql);
		s.values = values;
		return s;
	}
	async first<T = Record<string, unknown>>(): Promise<T | null> {
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const row = this.sqlite.prepare(this.sql).get(...(this.values as any[]));
		return (row as T) ?? null;
	}
	async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const rows = this.sqlite
			.prepare(this.sql)
			.all(...(this.values as any[])) as T[];
		return { results: rows, meta: { changes: 0 }, success: true };
	}
	async run(): Promise<D1Result> {
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const info = this.sqlite.prepare(this.sql).run(...(this.values as any[]));
		return {
			results: [],
			meta: { changes: info.changes },
			success: true,
		};
	}
	executeSync(): D1Result {
		const sql = this.sql.trim().toUpperCase();
		if (sql.startsWith("SELECT") || sql.startsWith("WITH")) {
			// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
			const rows = this.sqlite.prepare(this.sql).all(...(this.values as any[]));
			return { results: rows, meta: { changes: 0 }, success: true };
		}
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const info = this.sqlite.prepare(this.sql).run(...(this.values as any[]));
		return { results: [], meta: { changes: info.changes }, success: true };
	}
}

class D1Db implements D1Database {
	constructor(private sqlite: Database) {}
	prepare(sql: string): D1PreparedStatement {
		return new D1Stmt(this.sqlite, sql);
	}
	async batch(stmts: D1PreparedStatement[]): Promise<D1Result[]> {
		const results: D1Result[] = [];
		const tx = this.sqlite.transaction(() => {
			for (const s of stmts) {
				results.push((s as D1Stmt).executeSync());
			}
		});
		tx();
		return results;
	}
}

export type TestDb = ReturnType<typeof createTestDb>;

export function createTestDb() {
	const sqlite = new Database(":memory:");
	const sqlPath = join(process.cwd(), "drizzle/0000_create_content.sql");
	const sqlFile = readFileSync(sqlPath, "utf-8");
	const statements = sqlFile
		.split("--> statement-breakpoint")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	for (const stmt of statements) {
		sqlite.exec(stmt);
	}
	const drizzleDb = drizzle(sqlite, { schema: { posts, tags, postTags } });
	const d1Db = new D1Db(sqlite);
	return { db: drizzleDb, d1: d1Db };
}
