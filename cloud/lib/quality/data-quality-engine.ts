import { ColumnProfile, DataQualityIssue } from '@/types';
import crypto from 'crypto';

export interface DataQualityDetectionParams {
  headers: string[];
  rows: Record<string, unknown>[];
  columns: ColumnProfile[];
}

/**
 * Deterministic Data Quality Issue Detector
 */
export function detectDataQualityIssues(params: {
  rows: Record<string, unknown>[];
  columns: ColumnProfile[];
}): DataQualityIssue[] {
  const { rows, columns } = params;
  const issues: DataQualityIssue[] = [];

  // 1. Check for empty dataset
  if (rows.length === 0) {
    issues.push({
      id: crypto.randomUUID(),
      severity: 'critical',
      issueType: 'empty_dataset',
      description: 'The uploaded dataset contains zero data rows.',
      affectedRowsCount: 0,
      suggestedRemediation: 'Ensure your source file contains rows beneath the header line.',
    });
    return issues;
  }

  // 2. Check for exact duplicate rows
  const rowHashes = new Map<string, number>();
  let duplicateRowCount = 0;

  rows.forEach((row) => {
    // Deterministic JSON string representation for row comparison
    const rowStr = JSON.stringify(row);
    const count = rowHashes.get(rowStr) || 0;
    if (count === 1) {
      duplicateRowCount += 2; // Count original and duplicate
    } else if (count > 1) {
      duplicateRowCount += 1;
    }
    rowHashes.set(rowStr, count + 1);
  });

  if (duplicateRowCount > 0) {
    const dupRatio = duplicateRowCount / rows.length;
    issues.push({
      id: crypto.randomUUID(),
      severity: dupRatio > 0.2 ? 'high' : dupRatio > 0.05 ? 'medium' : 'low',
      issueType: 'duplicate_rows',
      description: `Detected ${duplicateRowCount.toLocaleString()} exact duplicate rows (${(dupRatio * 100).toFixed(1)}% of dataset).`,
      affectedRowsCount: duplicateRowCount,
      suggestedRemediation: 'Apply row deduplication during cleansing to prevent metric inflation.',
    });
  }

  // 3. Column-Level Anomaly Detection
  columns.forEach((col) => {
    const colName = col.name;

    // A. Missing values / Null spikes
    if (col.nullCount > 0) {
      if (col.nullPercentage >= 50) {
        issues.push({
          id: crypto.randomUUID(),
          columnName: colName,
          severity: 'high',
          issueType: 'missing_values',
          description: `Column "${colName}" has ${col.nullCount.toLocaleString()} missing values (${col.nullPercentage}% null rate).`,
          affectedRowsCount: col.nullCount,
          suggestedRemediation: 'Consider imputing default values or omitting this column from strict filters.',
        });
      } else if (col.nullPercentage >= 15) {
        issues.push({
          id: crypto.randomUUID(),
          columnName: colName,
          severity: 'medium',
          issueType: 'missing_values',
          description: `Column "${colName}" has ${col.nullCount.toLocaleString()} missing values (${col.nullPercentage}%).`,
          affectedRowsCount: col.nullCount,
          suggestedRemediation: 'Verify if missing entries indicate optional attributes.',
        });
      }
    }

    // B. Type Mismatches (e.g., text or unparseable values in numeric column)
    if (col.inferredType === 'integer' || col.inferredType === 'float') {
      const nonNumericCount = col.typeBreakdown.string;
      if (nonNumericCount > 0) {
        const mismatchPct = (nonNumericCount / rows.length) * 100;
        issues.push({
          id: crypto.randomUUID(),
          columnName: colName,
          severity: mismatchPct > 10 ? 'high' : 'medium',
          issueType: 'type_mismatch',
          description: `Column "${colName}" is inferred as ${col.inferredType}, but contains ${nonNumericCount.toLocaleString()} string/non-numeric values.`,
          affectedRowsCount: nonNumericCount,
          suggestedRemediation: 'Cleanse non-numeric placeholder strings (e.g., "N/A", "TBD") to ensure numerical aggregations work.',
        });
      }
    }

    // C. Inconsistent Casing & Whitespace Padding in String / Categorical Columns
    if (col.inferredType === 'string' && col.uniqueCount > 1 && col.uniqueCount <= 100) {
      const canonicalMap = new Map<string, Set<string>>();
      let hasWhitespaceIssues = false;

      rows.forEach((row) => {
        const val = row[colName];
        if (typeof val === 'string' && val.trim().length > 0) {
          if (val.startsWith(' ') || val.endsWith(' ')) {
            hasWhitespaceIssues = true;
          }
          const lower = val.trim().toLowerCase();
          if (!canonicalMap.has(lower)) {
            canonicalMap.set(lower, new Set());
          }
          canonicalMap.get(lower)!.add(val.trim());
        }
      });

      // Find casing variations (e.g. 'Active' and 'active')
      const inconsistentVariants: string[] = [];
      canonicalMap.forEach((variants) => {
        if (variants.size > 1) {
          inconsistentVariants.push(`[${Array.from(variants).join(', ')}]`);
        }
      });

      if (inconsistentVariants.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          columnName: colName,
          severity: 'low',
          issueType: 'inconsistent_casing',
          description: `Column "${colName}" has inconsistent casing variants for categorical values: ${inconsistentVariants.slice(0, 3).join('; ')}.`,
          affectedRowsCount: inconsistentVariants.length,
          suggestedRemediation: 'Standardize casing (e.g. lowercase or title case) for accurate category grouping.',
        });
      }

      if (hasWhitespaceIssues) {
        issues.push({
          id: crypto.randomUUID(),
          columnName: colName,
          severity: 'low',
          issueType: 'inconsistent_casing',
          description: `Column "${colName}" contains values with leading or trailing whitespace padding.`,
          affectedRowsCount: 1,
          suggestedRemediation: 'Trim leading and trailing whitespace to avoid pseudo-duplicate categories.',
        });
      }
    }

    // D. Identifier duplicate anomalies
    const isIdColumn = /(^id$|_id$|uuid|identifier|key|code|account_no|ssn)/i.test(colName);
    if (isIdColumn && col.uniqueCount > 0 && col.uniqueCount < (rows.length - col.nullCount)) {
      const duplicateIdCount = (rows.length - col.nullCount) - col.uniqueCount;
      issues.push({
        id: crypto.randomUUID(),
        columnName: colName,
        severity: 'high',
        issueType: 'identifier_duplicate',
        description: `Identifier column "${colName}" contains ${duplicateIdCount.toLocaleString()} duplicate keys (${col.uniqueCount.toLocaleString()} unique out of ${(rows.length - col.nullCount).toLocaleString()} populated rows).`,
        affectedRowsCount: duplicateIdCount,
        suggestedRemediation: 'Verify if the dataset is keyed by a composite primary key or if records are duplicated.',
      });
    }
  });

  return issues;
}
