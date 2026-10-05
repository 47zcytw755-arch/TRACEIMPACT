/**
 * Comprehensive Day 3 Test Suite for TraceImpact Cloud
 * Tests all Automated Dynamic Dashboard generation, KPI generation,
 * Chart recommendation rules, DQ visualization summaries, and API contracts.
 */

import { generateDashboardKPIs } from '../lib/dashboard/kpi-generator';
import { recommendDashboardCharts } from '../lib/dashboard/chart-recommender';
import { generateDashboardConfig } from '../lib/dashboard/dashboard-generator';
import {
  computeCategoryDistribution,
  computeNumericHistogram,
  computeTimeSeriesPoints,
  extractNumericPairs,
} from '../lib/dashboard/dashboard-utils';
import { datasetRepository } from '../lib/db/dataset-repository';
import { DatasetRecord, ColumnProfile, DataQualityIssue, ColumnInferredType } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

function createMockColumn(
  name: string,
  inferredType: ColumnInferredType,
  uniqueCount: number,
  nullCount = 0,
  minValue: string | number | null = null,
  maxValue: string | number | null = null,
  sampleValues: string[] = []
): ColumnProfile {
  const breakdown: Record<ColumnInferredType, number> = {
    string: 0,
    integer: 0,
    float: 0,
    boolean: 0,
    date: 0,
    datetime: 0,
    null: nullCount,
  };
  breakdown[inferredType] = 50 - nullCount;

  return {
    name,
    inferredType,
    isNullable: nullCount > 0,
    nullCount,
    nullPercentage: (nullCount / 50) * 100,
    uniqueCount,
    uniquenessPercentage: (uniqueCount / 50) * 100,
    sampleValues,
    minValue,
    maxValue,
    typeBreakdown: breakdown,
  };
}

export async function runDay3Tests() {
  console.log('\n==================================================');
  console.log('TRACEIMPACT CLOUD — DAY 3 VERIFICATION TEST SUITE');
  console.log('==================================================\n');

  const mockColumns: ColumnProfile[] = [
    createMockColumn('order_id', 'string', 50, 0, null, null, ['ORD1', 'ORD2']),
    createMockColumn('status', 'string', 3, 0, null, null, ['Delivered', 'Processing', 'Cancelled']),
    createMockColumn('order_date', 'date', 15, 0, '2024-01-01', '2024-01-15', ['2024-01-01']),
    createMockColumn('revenue', 'float', 40, 0, 19.99, 999.50, ['150.0']),
    createMockColumn('quantity', 'integer', 8, 0, 1, 12, ['2']),
    createMockColumn('customer_rating', 'integer', 5, 2, 1, 5, ['5']),
  ];

  const mockQualityIssues: DataQualityIssue[] = [
    {
      id: 'dq_1',
      columnName: 'customer_rating',
      issueType: 'missing_values',
      severity: 'low',
      description: '2 missing values detected in customer_rating',
      affectedRowsCount: 2,
    },
  ];

  const mockEcommerceDataset: DatasetRecord = {
    id: 'ds_ecom_101',
    workspaceId: 'ws_demo_01',
    name: 'ecommerce_transactions.csv',
    status: 'ready',
    rowCount: 50,
    columnCount: 6,
    qualityScore: 92,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      id: 'f_ecom_101',
      originalName: 'ecommerce_transactions.csv',
      extension: 'csv',
      sizeBytes: 45000,
      mimeType: 'text/csv',
      storageKey: 'workspaces/ws_demo_01/datasets/ds_ecom_101.csv',
    },
    columns: mockColumns,
    previewRows: [
      { order_id: 'ORD1', status: 'Delivered', order_date: '2024-01-01', revenue: 150.0, quantity: 2, customer_rating: 5 },
      { order_id: 'ORD2', status: 'Delivered', order_date: '2024-01-02', revenue: 299.5, quantity: 1, customer_rating: 4 },
      { order_id: 'ORD3', status: 'Processing', order_date: '2024-01-02', revenue: 45.0, quantity: 1, customer_rating: 5 },
      { order_id: 'ORD4', status: 'Cancelled', order_date: '2024-01-03', revenue: 120.0, quantity: 3, customer_rating: 2 },
      { order_id: 'ORD5', status: 'Delivered', order_date: '2024-01-04', revenue: 550.0, quantity: 5, customer_rating: 5 },
      { order_id: 'ORD6', status: 'Processing', order_date: '2024-01-05', revenue: 75.0, quantity: 1, customer_rating: 3 },
      { order_id: 'ORD7', status: 'Delivered', order_date: '2024-01-06', revenue: 320.0, quantity: 2, customer_rating: 4 },
      { order_id: 'ORD8', status: 'Delivered', order_date: '2024-01-07', revenue: 890.0, quantity: 4, customer_rating: 5 },
    ],
    qualityIssues: mockQualityIssues,
    profilingSummary: {
      rowCount: 50,
      columnCount: 6,
      qualityScore: 92,
      scoreBreakdown: {
        baseScore: 100,
        missingPenalty: 4,
        duplicatePenalty: 0,
        typeMismatchPenalty: 2,
        consistencyPenalty: 2,
        finalScore: 92,
      },
      totalMissingCells: 2,
      missingCellPercentage: 0.67,
      duplicateRowCount: 0,
      duplicateRowPercentage: 0,
      columns: mockColumns,
      qualityIssues: mockQualityIssues,
      parsedAt: new Date().toISOString(),
      processingDurationMs: 12,
    },
  };

  // 1. KPI GENERATION TESTS
  console.log('--- 1. KPI Generation Tests ---');
  const kpis = generateDashboardKPIs(mockEcommerceDataset);
  assert(kpis.length <= 4, 'KPIs: Returns at most 4 bounded KPI cards');
  assert(kpis.some((k) => k.id === 'kpi_total_rows' && k.value === '50'), 'KPIs: Contains Total Records KPI');
  assert(kpis.some((k) => k.id === 'kpi_quality_score' && k.value === '92%'), 'KPIs: Contains Quality Score KPI');
  assert(kpis.some((k) => k.id === 'kpi_missing_rate'), 'KPIs: Contains Missing Data Completeness KPI');
  assert(kpis.some((k) => k.calculationType === 'min_max' || k.calculationType === 'range'), 'KPIs: Contains Dataset-specific domain metric');

  // 2. CATEGORICAL CHART RECOMMENDATION TESTS
  console.log('\n--- 2. Categorical Chart Recommendation Tests ---');
  const charts = recommendDashboardCharts(mockEcommerceDataset);
  const catBarChart = charts.find((c) => c.chartType === 'bar' && c.primaryColumn === 'status');
  assert(!!catBarChart, 'Categorical Recommender: Recommends Bar chart for low-cardinality status');
  assert(!!catBarChart?.reason.includes('categorical'), 'Categorical Recommender: Includes explainable reason');
  
  const catDist = computeCategoryDistribution(mockEcommerceDataset.previewRows || [], 'status', 10);
  assert(catDist.categories.includes('Delivered'), 'Category Distribution: Extracts Delivered category');
  assert(catDist.counts[catDist.categories.indexOf('Delivered')] === 5, 'Category Distribution: Computes exact frequency');

  // 3. NUMERICAL CHART RECOMMENDATION TESTS
  console.log('\n--- 3. Numerical Chart Recommendation Tests ---');
  const histChart = charts.find((c) => c.chartType === 'histogram');
  assert(!!histChart, 'Numeric Recommender: Recommends Histogram for continuous numeric column');
  
  const hist = computeNumericHistogram(mockEcommerceDataset.previewRows || [], 'revenue', 4);
  assert(hist.binLabels.length > 0 && hist.binCounts.length > 0, 'Numeric Utils: Computes histogram bins and counts');
  assert(hist.binCounts.reduce((a, b) => a + b, 0) === 8, 'Numeric Utils: Bin counts total sample size');

  // 4. TEMPORAL CHART RECOMMENDATION TESTS
  console.log('\n--- 4. Temporal Chart Recommendation Tests ---');
  const timeChart = charts.find((c) => c.chartType === 'area');
  assert(!!timeChart, 'Temporal Recommender: Recommends Area/Line chart for date column');
  assert(timeChart?.primaryColumn === 'order_date', 'Temporal Recommender: Uses order_date as temporal axis');
  
  const timePoints = computeTimeSeriesPoints(mockEcommerceDataset.previewRows || [], 'order_date', 'revenue');
  assert(timePoints.dates.length >= 2, 'Temporal Utils: Aggregates chronological dates');
  assert(timePoints.values.length === timePoints.dates.length, 'Temporal Utils: Generates matching series values');

  // 5. CORRELATION RECOMMENDATION TESTS
  console.log('\n--- 5. Correlation Recommendation Tests ---');
  const scatterChart = charts.find((c) => c.chartType === 'scatter');
  assert(!!scatterChart, 'Correlation Recommender: Recommends Scatter chart for bivariate numeric pairs');
  
  const pairs = extractNumericPairs(mockEcommerceDataset.previewRows || [], 'revenue', 'quantity', 50);
  assert(pairs.length === 8, 'Correlation Utils: Extracts valid [x, y] coordinates');
  assert(Array.isArray(pairs[0]) && pairs[0].length === 2, 'Correlation Utils: Formats coordinates as tuple');

  // 6. HIGH-CARDINALITY PROTECTION & ID FILTERING
  console.log('\n--- 6. High-Cardinality & ID Protection Tests ---');
  const orderIdChart = charts.find((c) => c.primaryColumn === 'order_id');
  assert(!orderIdChart, 'Guardrails: Ignores high-cardinality primary keys and UUID/ID columns');

  const { isTruncated } = computeCategoryDistribution(
    Array.from({ length: 30 }, (_, i) => ({ item: `Cat_${i}` })),
    'item',
    10
  );
  assert(isTruncated === true, 'Guardrails: Flags truncation when categories exceed limit');

  // 7. EMPTY / MINIMAL DATASET HANDLING
  console.log('\n--- 7. Empty & Edge Case Dataset Tests ---');
  const emptyDataset: DatasetRecord = {
    id: 'ds_empty',
    workspaceId: 'ws_demo_01',
    name: 'empty.csv',
    status: 'ready',
    rowCount: 0,
    columnCount: 0,
    qualityScore: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      id: 'f_empty',
      originalName: 'empty.csv',
      extension: 'csv',
      sizeBytes: 0,
      mimeType: 'text/csv',
      storageKey: 'workspaces/ws_demo_01/datasets/ds_empty.csv',
    },
    columns: [],
    previewRows: [],
  };
  const emptyKPIs = generateDashboardKPIs(emptyDataset);
  assert(emptyKPIs.length >= 3, 'Empty Dataset: Generates baseline KPIs without crashing');
  const emptyCharts = recommendDashboardCharts(emptyDataset);
  assert(Array.isArray(emptyCharts) && emptyCharts.length === 0, 'Empty Dataset: Gracefully returns empty charts list');

  // 8. DATA QUALITY SUMMARY GENERATION
  console.log('\n--- 8. Data Quality Summary Tests ---');
  const dashboardConfig = generateDashboardConfig(mockEcommerceDataset);
  assert(dashboardConfig.qualitySummary.qualityScore === 92, 'DQ Summary: Reflects dataset quality score');
  assert(dashboardConfig.qualitySummary.totalIssuesCount === 1, 'DQ Summary: Computes issue counts');
  assert(dashboardConfig.qualitySummary.lowIssuesCount === 1, 'DQ Summary: Accurately tallies low severity issues');
  assert(dashboardConfig.qualitySummary.scoreBreakdown.finalScore === 92, 'DQ Summary: Carries accurate score breakdown');

  // 9. DASHBOARD CONFIGURATION INTEGRITY
  console.log('\n--- 9. Dashboard Configuration Integrity Tests ---');
  assert(dashboardConfig.datasetId === 'ds_ecom_101', 'Dashboard Config: Carries correct datasetId');
  assert(dashboardConfig.workspaceId === 'ws_demo_01', 'Dashboard Config: Carries correct workspaceId');
  assert(dashboardConfig.charts.length <= 4, 'Dashboard Config: Bounded chart limit (<= 4)');
  assert(dashboardConfig.charts.every((c) => !!c.options && !!c.title && !!c.reason), 'Dashboard Config: Every chart has title, reason, options');

  // 10. MULTI-TENANT ISOLATION & REPOSITORY ACCESS
  console.log('\n--- 10. Multi-Tenant Workspace Boundary Tests ---');
  await datasetRepository.createDataset(mockEcommerceDataset);
  const foundDataset = await datasetRepository.getDatasetById('ds_ecom_101', 'ws_demo_01');
  assert(!!foundDataset, 'Security: Workspace can access own dataset');

  const unauthorizedAccess = await datasetRepository.getDatasetById('ds_ecom_101', 'ws_other_tenant');
  assert(unauthorizedAccess === null, 'Security: Prevents cross-workspace dataset access');

  // 11. SUMMARY
  console.log('\n--------------------------------------------------');
  console.log(`Day 3 Tests: ${passed} passed, ${failed} failed`);
  console.log('--------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`Day 3 verification failed with ${failed} failing tests.`);
  }
}

// Run if executed directly
if (require.main === module) {
  runDay3Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
