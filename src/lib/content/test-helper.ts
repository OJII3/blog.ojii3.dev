import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type {
	ContentD1Database,
	ContentD1PreparedStatement,
	ContentD1Result,
} from "../../db/client";
import { posts, postTags, tags } from "../../db/schema";

class D1Stmt implements ContentD1PreparedStatement {
	private values: unknown[] = [];
	constructor(
		private sqlite: Database,
		private sql: string,
	) {}
	bind(...values: unknown[]): ContentD1PreparedStatement {
		const s = new D1Stmt(this.sqlite, this.sql);
		s.values = values;
		return s;
	}
	async first<T = Record<string, unknown>>(): Promise<T | null> {
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const row = this.sqlite.prepare(this.sql).get(...(this.values as any[]));
		return (row as T) ?? null;
	}
	async all<T = Record<string, unknown>>(): Promise<ContentD1Result<T>> {
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const rows = this.sqlite
			.prepare(this.sql)
			.all(...(this.values as any[])) as T[];
		return { results: rows, meta: { changes: 0 }, success: true };
	}
	async run(): Promise<ContentD1Result> {
		// biome-ignore lint/suspicious/noExplicitAny: D1 bind values are dynamically typed
		const info = this.sqlite.prepare(this.sql).run(...(this.values as any[]));
		return {
			results: [],
			meta: { changes: info.changes },
			success: true,
		};
	}
	executeSync(): ContentD1Result {
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

class D1Db implements ContentD1Database {
	constructor(private sqlite: Database) {}
	prepare(sql: string): ContentD1PreparedStatement {
		return new D1Stmt(this.sqlite, sql);
	}
	async batch(stmts: ContentD1PreparedStatement[]): Promise<ContentD1Result[]> {
		const results: ContentD1Result[] = [];
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
