import { DatasetRecord } from '@/types';
import { DashboardKPICard } from './dashboard-types';

export function generateDashboardKPIs(dataset: DatasetRecord): DashboardKPICard[] {
  const kpis: DashboardKPICard[] = [];
  const profiling = dataset.profilingSummary;
  const columns = dataset.columns || profiling?.columns || [];

  // 1. Total Rows Analyzed
  kpis.push({
    id: 'kpi_total_rows',
    title: 'Total Records',
    value: dataset.rowCount.toLocaleString(),
    subtitle: `${dataset.columnCount} attributes indexed`,
    calculationType: 'count',
    trendIndicator: 'neutral',
  });

  // 2. Data Quality Health
  const score = dataset.qualityScore ?? profiling?.qualityScore ?? 100;
  kpis.push({
    id: 'kpi_quality_score',
    title: 'Data Quality Score',
    value: `${score}%`,
    subtitle:
      score >= 80
        ? 'High confidence rating'
        : score >= 50
        ? 'Moderate anomalies detected'
        : 'Critical defects flagged',
    calculationType: 'score',
    trendIndicator: score >= 80 ? 'positive' : score >= 50 ? 'neutral' : 'negative',
  });

  // 3. Missing Cell Completeness
  const missingPct = profiling?.missingCellPercentage ?? 0;
  kpis.push({
    id: 'kpi_missing_rate',
    title: 'Missing Data Rate',
    value: `${missingPct}%`,
    subtitle:
      missingPct === 0
        ? 'Zero null values'
        : `${profiling?.totalMissingCells.toLocaleString() ?? 0} missing cells`,
    calculationType: 'percentage',
    trendIndicator: missingPct === 0 ? 'positive' : missingPct > 10 ? 'negative' : 'neutral',
  });

  // 4. Dataset-Specific Domain Metric (Numeric Average or Date Span or Duplicate Rate)
  const numericCol = columns.find(
    (c) => (c.inferredType === 'integer' || c.inferredType === 'float') && c.minValue !== null
  );

  const dateCol = columns.find((c) => c.inferredType === 'date' || c.inferredType === 'datetime');

  if (numericCol && numericCol.minValue !== undefined && numericCol.maxValue !== undefined) {
    kpis.push({
      id: `kpi_numeric_${numericCol.name}`,
      title: `${numericCol.name} Range`,
      value: `${numericCol.minValue} - ${numericCol.maxValue}`,
      subtitle: `Type: ${numericCol.inferredType} (${numericCol.uniqueCount} distinct values)`,
      sourceColumn: numericCol.name,
      calculationType: 'min_max',
      trendIndicator: 'neutral',
    });
  } else if (dateCol && dateCol.minValue && dateCol.maxValue) {
    kpis.push({
      id: `kpi_date_span`,
      title: 'Timeline Span',
      value: `${dateCol.minValue} to ${dateCol.maxValue}`,
      subtitle: `Source: ${dateCol.name}`,
      sourceColumn: dateCol.name,
      calculationType: 'range',
      trendIndicator: 'neutral',
    });
  } else {
    const dupPct = profiling?.duplicateRowPercentage ?? 0;
    kpis.push({
      id: 'kpi_duplicate_rate',
      title: 'Duplicate Row Rate',
      value: `${dupPct}%`,
      subtitle: `${profiling?.duplicateRowCount ?? 0} identical records`,
      calculationType: 'percentage',
      trendIndicator: dupPct === 0 ? 'positive' : 'negative',
    });
  }

  return kpis.slice(0, 4); // Keep concise 4 KPI grid
}
