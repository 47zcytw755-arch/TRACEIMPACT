import { ColumnProfile, DataQualityIssue, QualityScoreBreakdown } from '@/types';
import type { EChartsOption } from 'echarts';

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area';

export interface DashboardKPICard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  sourceColumn?: string;
  calculationType: 'count' | 'percentage' | 'score' | 'average' | 'min_max' | 'cardinality' | 'range';
  trendIndicator?: 'positive' | 'negative' | 'neutral';
}

export interface DashboardChartConfig {
  id: string;
  title: string;
  chartType: ChartType;
  primaryColumn: string;
  secondaryColumn?: string;
  reason: string;
  description: string;
  options: EChartsOption;
  categoryLimitApplied?: boolean;
}

export interface DashboardQualitySummary {
  qualityScore: number;
  scoreBreakdown: QualityScoreBreakdown;
  totalIssuesCount: number;
  criticalIssuesCount: number;
  highIssuesCount: number;
  mediumIssuesCount: number;
  lowIssuesCount: number;
  issues: DataQualityIssue[];
  missingCellPercentage: number;
  duplicateRowPercentage: number;
}

export interface DashboardConfig {
  datasetId: string;
  workspaceId: string;
  datasetName: string;
  generatedAt: string;
  version: string;
  kpis: DashboardKPICard[];
  charts: DashboardChartConfig[];
  qualitySummary: DashboardQualitySummary;
  columnsSummary: ColumnProfile[];
}
