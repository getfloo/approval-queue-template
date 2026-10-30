import { readFileSync } from "node:fs";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { describe, expect, it } from "vitest";

describe("committed migration", () => {
  const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
  const sql = migrations.flatMap((migration) => migration.sql).join("\n");
  const tables = new Map(Array.from(
    sql.matchAll(/CREATE TABLE "(\w+)"\s*\(([\s\S]*?)\n\);/g),
    ([, name, columns]) => [name, columns],
  ));

  it("creates users with the gateway ID and profile fields", () => {
    expect(tables.get("users")).toMatch(/"id" text PRIMARY KEY NOT NULL/);
    for (const column of ["email", "name", "role", "created_at", "updated_at"]) {
      expect(tables.get("users")).toContain(`"${column}"`);
    }
  });

  it("creates requests with a status, requester and decision trail, and no foreign keys to users", () => {
    const columns = tables.get("requests");
    expect(columns).toMatch(/"id" uuid PRIMARY KEY DEFAULT gen_random_uuid\(\) NOT NULL/);
    expect(columns).toContain(`"status" text DEFAULT 'pending' NOT NULL`);
    expect(columns).toContain('"amount" numeric(12, 2),');
    for (const column of ["title", "category", "justification", "requested_by_id", "requested_by_name", "requested_via"]) {
      expect(columns).toContain(`"${column}" text NOT NULL`);
    }
    for (const column of ["decided_by_id", "decided_by_name", "decided_via", "decision_comment"]) {
      expect(columns).toContain(`"${column}" text`);
      expect(columns).not.toContain(`"${column}" text NOT NULL`);
    }
    expect(sql).not.toMatch(/FOREIGN KEY/);
    expect(sql).toContain('ON "requests" USING btree ("status","created_at")');
    expect(sql).toContain('ON "requests" USING btree ("requested_by_id","created_at")');
  });

  it("keeps SQL portable across managed tenant schemas", () => {
    expect(sql).not.toMatch(/"public"\.|CREATE SCHEMA|SET search_path/i);
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    expect(journal.entries).toHaveLength(migrations.length);
    expect(migrations.length).toBeGreaterThan(0);
  });
});
