import { ColumnProfile, DatasetProfilingResult } from '@/types';
import { inferColumnType, isNullOrEmpty } from './schema-inference';
import { detectDataQualityIssues } from '@/lib/quality/data-quality-engine';
import { calculateQualityScore } from '@/lib/quality/quality-scorer';

export interface ProfilerOptions {
  sampleLimit?: number;
}

/**
 * Execute automated profiling on tabular rows
 */
export async function profileTabularData(
  headers: string[],
  rows: Record<string, unknown>[]
): Promise<DatasetProfilingResult> {
  const startTime = Date.now();
  const rowCount = rows.length;
  const columnCount = headers.length;

  let totalMissingCells = 0;

  // 1. Column-by-column profiling
  const columns: ColumnProfile[] = headers.map((header) => {
    const rawValues = rows.map((r) => r[header]);

    // Schema inference & type breakdown
    const inference = inferColumnType(rawValues);

    const nullCount = inference.nullCount;
    totalMissingCells += nullCount;

    const nullPercentage =
      rowCount > 0 ? Math.round((nullCount / rowCount) * 1000) / 10 : 0;

    // Unique values & sample extraction
    const nonNullValues = rawValues.filter((v) => !isNullOrEmpty(v));
    const uniqueValuesSet = new Set(nonNullValues.map((v) => String(v).trim()));
    const uniqueCount = uniqueValuesSet.size;
    const uniquenessPercentage =
      nonNullValues.length > 0
        ? Math.round((uniqueCount / nonNullValues.length) * 1000) / 10
        : 0;

    const sampleValues = Array.from(uniqueValuesSet).slice(0, 5);

    // Min / Max computation for numeric or date types
    let minValue: string | number | null = null;
    let maxValue: string | number | null = null;

    if (inference.inferredType === 'integer' || inference.inferredType === 'float') {
      const numValues = nonNullValues
        .map((v) => {
          if (typeof v === 'number') return v;
          const clean = String(v).replace(/^[$€£¥]/, '').replace(/,/g, '').trim();
          return parseFloat(clean);
        })
        .filter((n) => !isNaN(n));

      if (numValues.length > 0) {
        minValue = Math.min(...numValues);
        maxValue = Math.max(...numValues);
      }
    } else if (inference.inferredType === 'date' || inference.inferredType === 'datetime') {
      const dates = nonNullValues
        .map((v) => new Date(String(v)).getTime())
        .filter((t) => !isNaN(t));

      if (dates.length > 0) {
        minValue = new Date(Math.min(...dates)).toISOString().split('T')[0];
        maxValue = new Date(Math.max(...dates)).toISOString().split('T')[0];
      }
    }

    return {
      name: header,
      inferredType: inference.inferredType,
      isNullable: nullCount > 0,
      nullCount,
      nullPercentage,
      uniqueCount,
      uniquenessPercentage,
      sampleValues,
      minValue,
      maxValue,
      typeBreakdown: inference.typeBreakdown,
    };
  });

  // 2. Duplicate Row Analysis
  const rowStrings = new Set<string>();
  let duplicateRowCount = 0;
  rows.forEach((row) => {
    const s = JSON.stringify(row);
    if (rowStrings.has(s)) {
      duplicateRowCount++;
    } else {
      rowStrings.add(s);
    }
  });

  const duplicateRowPercentage =
    rowCount > 0 ? Math.round((duplicateRowCount / rowCount) * 1000) / 10 : 0;
  const totalCells = rowCount * columnCount;
  const missingCellPercentage =
    totalCells > 0 ? Math.round((totalMissingCells / totalCells) * 1000) / 10 : 0;

  // 3. Data Quality Issue Detection
  const qualityIssues = detectDataQualityIssues({
    rows,
    columns,
  });

  // 4. Calculate Deterministic Quality Score
  const { qualityScore, scoreBreakdown } = calculateQualityScore({
    rowCount,
    columnCount,
    totalMissingCells,
    duplicateRowCount,
    qualityIssues,
  });

  const durationMs = Date.now() - startTime;

  return {
    rowCount,
    columnCount,
    columns,
    totalMissingCells,
    missingCellPercentage,
    duplicateRowCount,
    duplicateRowPercentage,
    qualityIssues,
    qualityScore,
    scoreBreakdown,
    parsedAt: new Date().toISOString(),
    processingDurationMs: durationMs,
  };
}
