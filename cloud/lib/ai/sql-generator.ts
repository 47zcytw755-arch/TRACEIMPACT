import { StructuredQueryIntent, GeneratedSQLQuery } from './ai-types';

/**
 * Builds a safe, parameterized SQL query from a validated StructuredQueryIntent.
 * All user-supplied filter values are passed via positional parameters ($1, $2, ...).
 * Table and column names are quoted safely.
 */
export function buildParameterizedSQL(intent: StructuredQueryIntent): GeneratedSQLQuery {
  const parameters: (string | number | boolean)[] = [];
  let paramIndex = 1;

  const selectExpressions: string[] = [];
  const selectedColumns: string[] = [];
  let isAggregated = false;

  // 1. Dimensions (Group By Columns)
  for (const dim of intent.dimensions) {
    selectExpressions.push(`"${dim}"`);
    selectedColumns.push(dim);
  }

  // 2. Measures (Aggregations)
  for (const measure of intent.measures) {
    isAggregated = true;
    const fieldExpr = measure.field === '*' ? '*' : `"${measure.field}"`;
    const alias = measure.alias || `${measure.aggregation}_${measure.field === '*' ? 'count' : measure.field}`;
    selectExpressions.push(`${measure.aggregation.toUpperCase()}(${fieldExpr}) AS "${alias}"`);
    selectedColumns.push(alias);
  }

  // Fallback: If no dimensions or measures, SELECT columns up to limit
  if (selectExpressions.length === 0) {
    selectExpressions.push('*');
    selectedColumns.push('*');
  }

  let sql = `SELECT ${selectExpressions.join(', ')} FROM "dataset"`;

  // 3. WHERE Clause (Parameterized)
  if (intent.filters.length > 0) {
    const filterClauses: string[] = [];
    for (const filter of intent.filters) {
      if (filter.operator === 'is_null') {
        filterClauses.push(`"${filter.column}" IS NULL`);
      } else if (filter.operator === 'is_not_null') {
        filterClauses.push(`"${filter.column}" IS NOT NULL`);
      } else if (filter.operator === 'contains') {
        filterClauses.push(`"${filter.column}" ILIKE $${paramIndex++}`);
        parameters.push(`%${filter.value}%`);
      } else {
        filterClauses.push(`"${filter.column}" ${filter.operator} $${paramIndex++}`);
        parameters.push(filter.value as string | number | boolean);
      }
    }
    sql += ` WHERE ${filterClauses.join(' AND ')}`;
  }

  // 4. GROUP BY Clause
  if (intent.dimensions.length > 0 && intent.measures.length > 0) {
    const groupExprs = intent.dimensions.map((d) => `"${d}"`);
    sql += ` GROUP BY ${groupExprs.join(', ')}`;
  }

  // 5. ORDER BY Clause
  if (intent.sort.length > 0) {
    const orderExprs = intent.sort.map((s) => `"${s.column}" ${s.direction}`);
    sql += ` ORDER BY ${orderExprs.join(', ')}`;
  }

  // 6. LIMIT Clause
  const finalLimit = Math.min(Math.max(intent.limit || 20, 1), 100);
  sql += ` LIMIT ${finalLimit}`;

  return {
    sql,
    parameters,
    tableName: 'dataset',
    selectedColumns,
    isAggregated,
  };
}
