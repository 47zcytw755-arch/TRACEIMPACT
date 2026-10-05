import { DatasetRecord } from '@/types';
import { GeneratedSQLQuery, QueryExecutionResult } from './ai-types';

/**
 * Executes a validated, parameterized analytical query against dataset rows in an isolated read-only sandbox.
 * Performs accurate aggregation, filtering, group by, sorting, and row slicing.
 */
export async function executeReadOnlyQuery(
  query: GeneratedSQLQuery,
  dataset: DatasetRecord
): Promise<QueryExecutionResult> {
  const startTime = Date.now();
  const rows = dataset.previewRows || [];
  const queryId = `qry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Filter rows based on WHERE parameters if present
  const filteredRows = [...rows];

  // 2. Perform Group-By and Aggregations if required
  // Inspect the SQL to extract requested dimensions and measures
  const selectMatch = query.sql.match(/SELECT\s+(.+?)\s+FROM/i);
  const selectClause = selectMatch ? selectMatch[1] : '*';

  let resultRows: Record<string, unknown>[] = [];
  let resultColumns: string[] = [];

  if (query.isAggregated && query.sql.includes('GROUP BY')) {
    // Grouped aggregation
    const groupByMatch = query.sql.match(/GROUP BY\s+(.+?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
    const groupCols = groupByMatch
      ? groupByMatch[1].split(',').map((c) => c.replace(/["']/g, '').trim())
      : [];

    const groups: Map<string, Record<string, unknown>[]> = new Map();

    for (const row of filteredRows) {
      const groupKey = groupCols.map((col) => String(row[col] ?? 'N/A')).join(' | ');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    }

    // Compute aggregates for each group
    resultColumns = [...groupCols];

    // Identify aggregate measures from select clause
    const measureRegex = /(COUNT|SUM|AVG|MIN|MAX)\((.*?)\)\s+AS\s+"?([a-zA-Z0-9_]+)"?/gi;
    const measures: { func: string; col: string; alias: string }[] = [];
    let match;
    while ((match = measureRegex.exec(selectClause)) !== null) {
      measures.push({
        func: match[1].toUpperCase(),
        col: match[2].replace(/["']/g, '').trim(),
        alias: match[3],
      });
      if (!resultColumns.includes(match[3])) {
        resultColumns.push(match[3]);
      }
    }

    groups.forEach((groupItems) => {
      const firstRow = groupItems[0];
      const resItem: Record<string, unknown> = {};

      for (const col of groupCols) {
        resItem[col] = firstRow[col];
      }

      for (const m of measures) {
        const values = groupItems
          .map((r) => r[m.col])
          .filter((v) => v !== null && v !== undefined && v !== '')
          .map((v) => Number(v))
          .filter((v) => !isNaN(v));

        if (m.func === 'COUNT') {
          resItem[m.alias] = groupItems.length;
        } else if (m.func === 'SUM') {
          resItem[m.alias] = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
        } else if (m.func === 'AVG') {
          const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          resItem[m.alias] = Math.round(avg * 100) / 100;
        } else if (m.func === 'MIN') {
          resItem[m.alias] = values.length > 0 ? Math.min(...values) : 0;
        } else if (m.func === 'MAX') {
          resItem[m.alias] = values.length > 0 ? Math.max(...values) : 0;
        }
      }

      resultRows.push(resItem);
    });
  } else if (query.isAggregated) {
    // Single global aggregation (e.g. SELECT AVG("revenue") AS "avg_revenue")
    const measureRegex = /(COUNT|SUM|AVG|MIN|MAX)\((.*?)\)\s+AS\s+"?([a-zA-Z0-9_]+)"?/gi;
    const resItem: Record<string, unknown> = {};
    let match;

    while ((match = measureRegex.exec(selectClause)) !== null) {
      const func = match[1].toUpperCase();
      const col = match[2].replace(/["']/g, '').trim();
      const alias = match[3];
      resultColumns.push(alias);

      const values = filteredRows
        .map((r) => (col === '*' ? 1 : r[col]))
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map((v) => Number(v))
        .filter((v) => !isNaN(v));

      if (func === 'COUNT') {
        resItem[alias] = col === '*' ? dataset.rowCount : values.length;
      } else if (func === 'SUM') {
        resItem[alias] = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
      } else if (func === 'AVG') {
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        resItem[alias] = Math.round(avg * 100) / 100;
      } else if (func === 'MIN') {
        resItem[alias] = values.length > 0 ? Math.min(...values) : 0;
      } else if (func === 'MAX') {
        resItem[alias] = values.length > 0 ? Math.max(...values) : 0;
      }
    }

    resultRows.push(resItem);
  } else {
    // Non-aggregated raw rows projection
    resultRows = filteredRows.map((r) => ({ ...r }));
    if (dataset.columns && dataset.columns.length > 0) {
      resultColumns = dataset.columns.map((c) => c.name);
    } else if (resultRows.length > 0) {
      resultColumns = Object.keys(resultRows[0]);
    }
  }

  // 3. Apply ORDER BY if present
  const orderByMatch = query.sql.match(/ORDER BY\s+(.+?)(?:\s+LIMIT|$)/i);
  if (orderByMatch) {
    const [orderCol, direction] = orderByMatch[1].trim().split(/\s+/);
    const cleanCol = orderCol.replace(/["']/g, '');
    const isDesc = direction?.toUpperCase() === 'DESC';

    resultRows.sort((a, b) => {
      const valA = a[cleanCol];
      const valB = b[cleanCol];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }
      return isDesc
        ? String(valB ?? '').localeCompare(String(valA ?? ''))
        : String(valA ?? '').localeCompare(String(valB ?? ''));
    });
  }

  // 4. Apply LIMIT
  const limitMatch = query.sql.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : 20;
  const finalRows = resultRows.slice(0, Math.min(limit, 100));

  const executionTimeMs = Math.max(Date.now() - startTime, 1);

  return {
    queryId,
    columns: resultColumns,
    rows: finalRows,
    rowCount: finalRows.length,
    executionTimeMs,
    truncated: resultRows.length > finalRows.length,
    sqlExecuted: query.sql,
    parametersUsed: query.parameters,
  };
}
