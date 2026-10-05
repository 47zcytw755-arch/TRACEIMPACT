import { DataQualityIssue, QualityScoreBreakdown } from '@/types';

/**
 * Deterministic Data Quality Score Calculator
 * Base: 100.0
 * Deductions based on missing cells, duplicate rows, type mismatches, and structural anomalies.
 */
export function calculateQualityScore(params: {
  rowCount: number;
  columnCount: number;
  totalMissingCells: number;
  duplicateRowCount: number;
  qualityIssues: DataQualityIssue[];
}): { qualityScore: number; scoreBreakdown: QualityScoreBreakdown } {
  const { rowCount, columnCount, totalMissingCells, duplicateRowCount, qualityIssues } = params;

  if (rowCount === 0 || columnCount === 0) {
    return {
      qualityScore: 0,
      scoreBreakdown: {
        baseScore: 100,
        missingPenalty: 0,
        duplicatePenalty: 0,
        typeMismatchPenalty: 0,
        consistencyPenalty: 100,
        finalScore: 0,
      },
    };
  }

  const totalCells = rowCount * columnCount;
  const missingRatio = totalCells > 0 ? totalMissingCells / totalCells : 0;
  const duplicateRatio = rowCount > 0 ? duplicateRowCount / rowCount : 0;

  // 1. Missing Value Penalty (Max 30 points)
  // 5% missing cells => 3 points penalty; 25% missing => 15 points penalty; 50%+ missing => 30 points penalty
  const missingPenalty = Math.min(30, Math.round(missingRatio * 60 * 10) / 10);

  // 2. Duplicate Row Penalty (Max 25 points)
  // 10% duplicate rows => 5 points penalty; 50%+ duplicate => 25 points penalty
  const duplicatePenalty = Math.min(25, Math.round(duplicateRatio * 50 * 10) / 10);

  // 3. Type Mismatch & Outlier Penalty (Max 25 points)
  const typeMismatchIssues = qualityIssues.filter(
    (i) => i.issueType === 'type_mismatch' || i.issueType === 'range_outlier'
  );
  let typeMismatchPenalty = 0;
  typeMismatchIssues.forEach((issue) => {
    switch (issue.severity) {
      case 'critical':
        typeMismatchPenalty += 8;
        break;
      case 'high':
        typeMismatchPenalty += 5;
        break;
      case 'medium':
        typeMismatchPenalty += 3;
        break;
      case 'low':
        typeMismatchPenalty += 1;
        break;
    }
  });
  typeMismatchPenalty = Math.min(25, typeMismatchPenalty);

  // 4. Consistency & Identifier Penalty (Max 20 points)
  const consistencyIssues = qualityIssues.filter(
    (i) =>
      i.issueType === 'inconsistent_casing' ||
      i.issueType === 'identifier_duplicate' ||
      i.issueType === 'empty_dataset'
  );
  let consistencyPenalty = 0;
  consistencyIssues.forEach((issue) => {
    switch (issue.severity) {
      case 'critical':
        consistencyPenalty += 10;
        break;
      case 'high':
        consistencyPenalty += 6;
        break;
      case 'medium':
        consistencyPenalty += 3;
        break;
      case 'low':
        consistencyPenalty += 1;
        break;
    }
  });
  consistencyPenalty = Math.min(20, consistencyPenalty);

  const totalDeductions =
    missingPenalty + duplicatePenalty + typeMismatchPenalty + consistencyPenalty;
  const rawScore = 100 - totalDeductions;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  return {
    qualityScore: finalScore,
    scoreBreakdown: {
      baseScore: 100,
      missingPenalty,
      duplicatePenalty,
      typeMismatchPenalty,
      consistencyPenalty,
      finalScore,
    },
  };
}
