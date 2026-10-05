import { DatasetRecord } from '@/types';
import { DashboardConfig, DashboardQualitySummary } from './dashboard-types';
import { generateDashboardKPIs } from './kpi-generator';
import { recommendDashboardCharts } from './chart-recommender';

export function generateDashboardConfig(dataset: DatasetRecord): DashboardConfig {
  const profiling = dataset.profilingSummary;
  const issues = dataset.qualityIssues || [];

  const qualitySummary: DashboardQualitySummary = {
    qualityScore: dataset.qualityScore ?? profiling?.qualityScore ?? 100,
    scoreBreakdown: profiling?.scoreBreakdown || {
      baseScore: 100,
      missingPenalty: 0,
      duplicatePenalty: 0,
      typeMismatchPenalty: 0,
      consistencyPenalty: 0,
      finalScore: dataset.qualityScore ?? 100,
    },
    totalIssuesCount: issues.length,
    criticalIssuesCount: issues.filter((i) => i.severity === 'critical').length,
    highIssuesCount: issues.filter((i) => i.severity === 'high').length,
    mediumIssuesCount: issues.filter((i) => i.severity === 'medium').length,
    lowIssuesCount: issues.filter((i) => i.severity === 'low').length,
    issues: issues,
    missingCellPercentage: profiling?.missingCellPercentage ?? 0,
    duplicateRowPercentage: profiling?.duplicateRowPercentage ?? 0,
  };

  const kpis = generateDashboardKPIs(dataset);
  const charts = recommendDashboardCharts(dataset);
  const columnsSummary = dataset.columns || profiling?.columns || [];

  return {
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
    datasetName: dataset.file?.originalName || dataset.name,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    kpis,
    charts,
    qualitySummary,
    columnsSummary,
  };
}
