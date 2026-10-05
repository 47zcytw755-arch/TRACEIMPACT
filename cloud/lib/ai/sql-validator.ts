import { DatasetAIContext, SQLValidationResult } from './ai-types';

/**
 * Strictly validates SQL queries before execution.
 * Enforces read-only SELECT queries and blocks any destructive, multi-statement,
 * injection, or unauthorized metadata access attempts.
 */
export function validateSQLQuery(sql: string, context: DatasetAIContext): SQLValidationResult {
  const errors: string[] = [];
  const trimmed = sql.trim();

  // 1. Block SQL Comments
  if (/(--|\/\*|\*\/)/.test(trimmed)) {
    errors.push('Security Violation: SQL comments (-- or /* */) are strictly prohibited.');
  }

  // 2. Block Multiple Statements (semicolons in body)
  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    errors.push('Security Violation: Multiple semicolon-separated SQL statements are prohibited.');
  }

  // 3. Whitelist: Must begin strictly with SELECT
  if (!/^SELECT\s+/i.test(trimmed)) {
    errors.push('Security Violation: Only read-only SELECT queries are permitted.');
  }

  // 4. Blacklist Dangerous Write / DDL / Admin Keywords
  const forbiddenKeywords = [
    'DROP',
    'DELETE',
    'UPDATE',
    'INSERT',
    'ALTER',
    'TRUNCATE',
    'CREATE',
    'GRANT',
    'REVOKE',
    'MERGE',
    'CALL',
    'EXEC',
    'EXECUTE',
    'COPY',
    'VACUUM',
    'REINDEX',
    'REFRESH',
    'PRAGMA',
    'ATTACH',
    'DETACH',
    'INTO',
  ];

  for (const kw of forbiddenKeywords) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(trimmed)) {
      errors.push(`Security Violation: Prohibited statement or clause "${kw}" detected.`);
    }
  }

  // 5. Block System Catalog & Information Schema Tables
  const systemCatalogs = [
    'information_schema',
    'pg_catalog',
    'pg_',
    'sqlite_master',
    'sqlite_temp_master',
    'sys.',
    'master..',
  ];

  for (const cat of systemCatalogs) {
    if (trimmed.toLowerCase().includes(cat.toLowerCase())) {
      errors.push(`Security Violation: Access to system catalog "${cat}" is prohibited.`);
    }
  }

  // 6. Validate Allowed Table Name
  // Must only query FROM "dataset" or FROM dataset
  const fromMatch = trimmed.match(/\bFROM\s+("?[a-zA-Z0-9_]+"?(?:\s*,\s*"?[a-zA-Z0-9_]+"?)*)/i);
  if (fromMatch) {
    const rawTable = fromMatch[1].replace(/["']/g, '').trim().toLowerCase();
    if (rawTable !== 'dataset' && rawTable !== context.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')) {
      errors.push(`Security Violation: Query target table "${rawTable}" is not the authorized dataset table.`);
    }
  } else {
    errors.push('Query Error: Missing valid FROM clause targeting the dataset.');
  }

  // 7. Enforce LIMIT Clause
  if (!/\bLIMIT\s+\d+/i.test(trimmed)) {
    errors.push('Query Policy: Analytical queries must specify an explicit LIMIT clause.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    allowedClauses: ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT'],
  };
}
