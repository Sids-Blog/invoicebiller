import { neon } from '@neondatabase/serverless';

/**
 * Server-side Neon SQL client.
 * Only used in API routes (server-side) — never imported in client components.
 */
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return url;
};

export const getServerSql = () => {
  const sql = neon(getDatabaseUrl());
  return sql;
};

/**
 * Neon serverless driver returns NUMERIC/DECIMAL columns as strings.
 * This coerces any string that looks like a number back to a JS number.
 */
export const castRow = <T extends Record<string, any>>(row: T): T => {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      result[key] = val;
    } else if (Array.isArray(val)) {
      result[key] = val.map((item: any) =>
        item && typeof item === 'object' ? castRow(item) : item
      );
    } else if (typeof val === 'object' && !(val instanceof Date)) {
      result[key] = castRow(val);
    } else if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) {
      result[key] = Number(val);
    } else {
      result[key] = val;
    }
  }
  return result as T;
};

/**
 * Execute a parameterized SQL query on the server.
 */
export const serverQuery = async (query: string, params: any[] = []): Promise<any[]> => {
  const sql = getServerSql();
  try {
    const result = await (sql as any).query(query, params);
    
    let rows: any[];
    if (Array.isArray(result)) {
      rows = result;
    } else if (result && Array.isArray(result.rows)) {
      rows = result.rows;
    } else {
      rows = [];
    }
    return rows.map(castRow);
  } catch (error) {
    console.error('[serverQuery ERROR]', error);
    throw error;
  }
};
