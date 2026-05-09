import { NextRequest, NextResponse } from 'next/server';
import { serverQuery } from '@/lib/server-db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

// ── Tables in dependency/FK order so INSERT order is valid ────────────────
const TABLE_ORDER = [
  'companies',
  'users',
  'sessions',
  'seller_info',
  'products',
  'bills',
  'bill_items',
  'password_reset_tokens',
  'audit_logs',
  'invoice_sequences',
];

// ── Escape a single value to a SQL literal ────────────────────────────────
function sqlLiteral(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  // Dates, UUIDs, strings — single-quote with escaped internal quotes
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

// ── Build INSERT statements for one table ────────────────────────────────
function buildInserts(tableName: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- (no data in ${tableName})\n`;

  const cols = Object.keys(rows[0]);
  const colList = cols.map(c => `"${c}"`).join(', ');

  const lines: string[] = [];
  for (const row of rows) {
    const vals = cols.map(c => sqlLiteral(row[c])).join(', ');
    lines.push(`INSERT INTO "${tableName}" (${colList}) VALUES (${vals});`);
  }
  return lines.join('\n') + '\n';
}

// ── Reconstruct CREATE TABLE DDL from information_schema ─────────────────
async function getTableDDL(tableName: string): Promise<string> {
  const cols = await serverQuery(
    `SELECT
       column_name,
       udt_name,
       data_type,
       character_maximum_length,
       is_nullable,
       column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );

  const colDefs = cols.map((c: any) => {
    let type = c.udt_name.toUpperCase();
    // Normalise common type aliases
    if (type === 'VARCHAR' || type === 'BPCHAR') {
      type = c.character_maximum_length ? `VARCHAR(${c.character_maximum_length})` : 'TEXT';
    }
    if (type === 'INT4') type = 'INTEGER';
    if (type === 'INT8') type = 'BIGINT';
    if (type === 'FLOAT8') type = 'DOUBLE PRECISION';
    if (type === 'BOOL') type = 'BOOLEAN';
    if (type === 'TIMESTAMPTZ') type = 'TIMESTAMPTZ';
    if (type === 'UUID') type = 'UUID';
    if (type === 'NUMERIC') type = 'NUMERIC';

    const nullable = c.is_nullable === 'NO' ? ' NOT NULL' : '';
    const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
    return `  "${c.column_name}" ${type}${nullable}${def}`;
  });

  // Fetch primary key
  const pks = await serverQuery(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema    = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema    = 'public'
       AND tc.table_name      = $1
     ORDER BY kcu.ordinal_position`,
    [tableName]
  );

  if (pks.length) {
    const pkCols = pks.map((r: any) => `"${r.column_name}"`).join(', ');
    colDefs.push(`  PRIMARY KEY (${pkCols})`);
  }

  return (
    `CREATE TABLE IF NOT EXISTS "${tableName}" (\n` +
    colDefs.join(',\n') +
    '\n);\n'
  );
}

// ── Fetch index DDL from pg_indexes ──────────────────────────────────────
async function getIndexes(tableName: string): Promise<string> {
  const rows = await serverQuery(
    `SELECT indexdef
     FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = $1
       AND indexname NOT LIKE '%_pkey'`,  // skip auto-generated PK indexes
    [tableName]
  );
  if (!rows.length) return '';
  return rows.map((r: any) => r.indexdef + ';').join('\n') + '\n';
}

/**
 * GET /api/admin/backup
 * Returns a full .sql file (schema + data) for the entire database.
 * Requires: superadmin session cookie.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if ('error' in authResult) return authResult.error;

  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateLabel = now.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    // ── Detect which tables actually exist ────────────────────────────────
    const existingTablesRows = await serverQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      []
    );
    const existingTables = new Set(
      existingTablesRows.map((r: any) => r.table_name as string)
    );
    const tables = TABLE_ORDER.filter(t => existingTables.has(t));
    // Append any extra tables not in the ordered list
    for (const t of Array.from(existingTables)) {
      if (!TABLE_ORDER.includes(t)) tables.push(t);
    }

    const sections: string[] = [];

    // ── File header ───────────────────────────────────────────────────────
    sections.push(
      `-- ================================================================\n` +
      `-- Laabham Pro — Database Backup\n` +
      `-- Generated: ${dateLabel} (${now.toISOString()})\n` +
      `-- Tables: ${tables.join(', ')}\n` +
      `--\n` +
      `-- To restore:\n` +
      `--   1. Create a new PostgreSQL database\n` +
      `--   2. Enable pgcrypto:  CREATE EXTENSION IF NOT EXISTS pgcrypto;\n` +
      `--   3. Run this file:   psql -d <your_db> -f this_backup.sql\n` +
      `-- ================================================================\n\n` +
      `SET client_encoding = 'UTF8';\n` +
      `SET standard_conforming_strings = on;\n\n` +
      `CREATE EXTENSION IF NOT EXISTS pgcrypto;\n` +
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`
    );

    // ── Schema section ────────────────────────────────────────────────────
    sections.push('\n-- ── SCHEMA ─────────────────────────────────────────────────────────\n');

    for (const table of tables) {
      sections.push(`\n-- Table: ${table}\n`);
      sections.push(`DROP TABLE IF EXISTS "${table}" CASCADE;\n`);
      sections.push(await getTableDDL(table));
    }

    // ── Indexes ───────────────────────────────────────────────────────────
    sections.push('\n-- ── INDEXES ────────────────────────────────────────────────────────\n');
    for (const table of tables) {
      const idx = await getIndexes(table);
      if (idx) {
        sections.push(`\n-- Indexes for ${table}\n${idx}`);
      }
    }

    // ── Data section ──────────────────────────────────────────────────────
    sections.push('\n-- ── DATA ───────────────────────────────────────────────────────────\n');

    let totalRows = 0;
    for (const table of tables) {
      const rows = await serverQuery(`SELECT * FROM "${table}" ORDER BY 1`, []);
      totalRows += rows.length;
      sections.push(`\n-- Data for ${table} (${rows.length} rows)\n`);
      if (rows.length) {
        sections.push(buildInserts(table, rows as Record<string, unknown>[]));
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────
    sections.push(
      `\n-- ================================================================\n` +
      `-- Backup complete. Total rows: ${totalRows}\n` +
      `-- ================================================================\n`
    );

    const sqlContent = sections.join('');
    const filename = `laabhampro_backup_${timestamp}.sql`;

    return new NextResponse(sqlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[API /admin/backup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup: ' + error.message },
      { status: 500 }
    );
  }
}
