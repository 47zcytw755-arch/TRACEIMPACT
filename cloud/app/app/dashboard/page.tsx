'use client';

import React, { useEffect, useState, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EChartsChart } from '@/components/charts/EChartsChart';
import { DashboardConfig } from '@/lib/dashboard/dashboard-types';
import { DatasetRecord } from '@/types';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDatasetId = searchParams.get('datasetId');

  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(urlDatasetId);
  const [dashboard, setDashboard] = useState<DashboardConfig | null>(null);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [, startTransition] = useTransition();

  // 1. Fetch available datasets
  useEffect(() => {
    let ignore = false;

    async function loadDatasets() {
      try {
        const res = await fetch('/api/datasets');
        const data = await res.json();

        if (!ignore && data.success && Array.isArray(data.datasets)) {
          setDatasets(data.datasets);
          if (data.datasets.length > 0) {
            const readyDataset = data.datasets.find((d: DatasetRecord) => d.status === 'ready') || data.datasets[0];
            const initialId = urlDatasetId && data.datasets.some((d: DatasetRecord) => d.id === urlDatasetId)
              ? urlDatasetId
              : readyDataset.id;
            
            setSelectedDatasetId(initialId);
          } else {
            setSelectedDatasetId(null);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Failed to fetch datasets:', err);
          setError('Failed to load dataset catalog.');
        }
      } finally {
        if (!ignore) {
          setLoadingDatasets(false);
        }
      }
    }

    loadDatasets();

    return () => {
      ignore = true;
    };
  }, [urlDatasetId]);

  // 2. Fetch dashboard configuration for selected dataset
  useEffect(() => {
    if (!selectedDatasetId) {
      return;
    }

    let ignore = false;

    async function loadDashboard() {
      try {
        setLoadingDashboard(true);
        setError(null);
        const res = await fetch(`/api/datasets/${selectedDatasetId}/dashboard`);
        const data = await res.json();

        if (ignore) return;

        if (res.status === 202) {
          setError('Dataset is currently being processed. Please refresh in a moment.');
          setDashboard(null);
          return;
        }

        if (data.success && data.dashboard) {
          setDashboard(data.dashboard);
        } else {
          setError(data.error || 'Failed to generate dashboard configuration.');
          setDashboard(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('Failed to load dashboard:', err);
          setError('Unable to load analytical dashboard for this dataset.');
          setDashboard(null);
        }
      } finally {
        if (!ignore) {
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [selectedDatasetId, refreshTrigger]);

  const handleDatasetChange = (newId: string) => {
    setSelectedDatasetId(newId);
    startTransition(() => {
      router.push(`/app/dashboard?datasetId=${newId}`);
    });
  };

  // State A: Loading initial datasets catalog
  if (loadingDatasets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading datasets catalog...</p>
      </div>
    );
  }

  // State B: Zero datasets uploaded
  if (datasets.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">
          📊
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">No Datasets Available</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Upload a CSV, Excel, JSON, or TXT file to automatically generate dynamic charts, data-quality diagnostics, and analytical KPIs.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/app/upload">
            <Button variant="primary" size="lg">
              Upload Your First Dataset
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Dataset Selector & Context */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="default">Automated Intelligence</Badge>
            <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Analytical Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Deterministic visualizations generated from verified schema and data quality metadata.
          </p>
        </div>

        {/* Dataset Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              aria-label="Select Dataset"
              value={selectedDatasetId || ''}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium cursor-pointer shadow-sm"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                  {d.file?.originalName || d.name} ({d.file?.extension?.toUpperCase() || 'DATA'} • {d.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              ▼
            </div>
          </div>

          <Link href="/app/upload">
            <Button variant="secondary" size="md" className="hidden sm:inline-flex">
              + Ingest New
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error / Warning State */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="font-medium">Dashboard Notification</p>
            <p className="text-xs text-amber-200/80 mt-0.5">{error}</p>
          </div>
          {selectedDatasetId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRefreshTrigger((c) => c + 1)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* 3. Loading Dashboard State */}
      {loadingDashboard && (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Generating deterministic chart recommendations...</p>
        </div>
      )}

      {/* 4. Active Dashboard Content */}
      {!loadingDashboard && dashboard && (
        <>
          {/* Active Dataset Meta Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">{dashboard.datasetName}</span>
              <span className="text-slate-600">•</span>
              <span>Format: <span className="text-slate-300 font-mono">{selectedDataset?.file?.extension?.toUpperCase() || 'DATA'}</span></span>
              <span className="text-slate-600">•</span>
              <span>Generated: <span className="text-slate-300">{new Date(dashboard.generatedAt).toLocaleTimeString()}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-medium">Schema Synchronized</span>
            </div>
          </div>

          {/* KPI Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboard.kpis.map((kpi) => (
              <Card key={kpi.id} className="border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {kpi.title}
                    </p>
                    {kpi.trendIndicator === 'positive' && (
                      <span className="text-emerald-400 text-xs font-medium">✓ Optimal</span>
                    )}
                    {kpi.trendIndicator === 'negative' && (
                      <span className="text-rose-400 text-xs font-medium">! Attention</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tight mt-2">
                    {kpi.value}
                  </p>
                  {kpi.subtitle && (
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {kpi.subtitle}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analytical Charts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Recommended Visualizations
                </h2>
                <p className="text-xs text-slate-400">
                  Deterministically chosen from inferred data distributions, unique cardinalities, and continuous numerical series.
                </p>
              </div>
              <Badge variant="neutral">
                {dashboard.charts.length} Charts Rendered
              </Badge>
            </div>

            {dashboard.charts.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/30 p-8 text-center">
                <p className="text-sm text-slate-400">
                  No chart candidates met confidence criteria for this dataset shape.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {dashboard.charts.map((chart) => (
                  <Card key={chart.id} className="border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-semibold text-white">
                            {chart.title}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400 mt-0.5">
                            {chart.description}
                          </CardDescription>
                        </div>
                        <Badge variant="default" className="text-[10px] uppercase">
                          {chart.chartType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                        <EChartsChart options={chart.options} height="290px" />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">Reason: <span className="text-slate-300">{chart.reason}</span></span>
                        {chart.categoryLimitApplied && (
                          <span className="text-indigo-400 shrink-0 ml-2 font-medium">Top 10 Capped</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Data Quality & Governance Health Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Data Quality & Schema Diagnostics
                </h2>
                <p className="text-xs text-slate-400">
                  Granular validation audit scores, rule violations, and column profiling statistics.
                </p>
              </div>
              <Badge
                variant={
                  dashboard.qualitySummary.qualityScore >= 80
                    ? 'success'
                    : dashboard.qualitySummary.qualityScore >= 50
                    ? 'warning'
                    : 'danger'
                }
              >
                Health: {dashboard.qualitySummary.qualityScore}%
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Breakdown Cards */}
              <Card className="border-slate-800 bg-slate-900/50 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">
                    Audit Dimension Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Component scores and penalty deductions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">Base Score</span>
                      <span className="text-white font-mono">{dashboard.qualitySummary.scoreBreakdown.baseScore}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-amber-300">
                      <span>Missing Data Penalty</span>
                      <span className="font-mono">-{dashboard.qualitySummary.scoreBreakdown.missingPenalty}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-amber-300">
                      <span>Duplicate Penalty</span>
                      <span className="font-mono">-{dashboard.qualitySummary.scoreBreakdown.duplicatePenalty}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-amber-300">
                      <span>Type Inconsistency Penalty</span>
                      <span className="font-mono">-{dashboard.qualitySummary.scoreBreakdown.typeMismatchPenalty}%</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-amber-300">
                      <span>Consistency Penalty</span>
                      <span className="font-mono">-{dashboard.qualitySummary.scoreBreakdown.consistencyPenalty}%</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Missing Cell Ratio:</span>
                      <span className="text-slate-200 font-mono">{dashboard.qualitySummary.missingCellPercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duplicate Row Ratio:</span>
                      <span className="text-slate-200 font-mono">{dashboard.qualitySummary.duplicateRowPercentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Quality Issues List */}
              <Card className="border-slate-800 bg-slate-900/50 lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">
                        Detected Issues & Anomalies
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Deterministic DQ engine rule triggers.
                      </CardDescription>
                    </div>
                    <Badge variant="neutral">
                      {dashboard.qualitySummary.totalIssuesCount} Issues
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {dashboard.qualitySummary.issues.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <span className="text-emerald-400 text-base mr-1.5">✓</span>
                      No data quality anomalies or schema violations detected.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {dashboard.qualitySummary.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200 font-mono">
                                {issue.columnName ? `[${issue.columnName}]` : '[Dataset]'} {issue.issueType}
                              </span>
                              <Badge
                                variant={
                                  issue.severity === 'critical'
                                    ? 'danger'
                                    : issue.severity === 'high'
                                    ? 'warning'
                                    : 'neutral'
                                }
                                className="text-[10px] uppercase px-1.5 py-0"
                              >
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-slate-400">{issue.description}</p>
                          </div>
                          {issue.affectedRowsCount !== undefined && (
                            <span className="text-slate-500 font-mono text-[11px] shrink-0">
                              {issue.affectedRowsCount} affected
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inferred Column Profiles Table */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">
                  Inferred Schema Attributes & Cardinality
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Underlying column profile signatures used for visualization decisions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Column Name</th>
                        <th className="py-2.5 px-3">Inferred Type</th>
                        <th className="py-2.5 px-3">Unique Values</th>
                        <th className="py-2.5 px-3">Null Count</th>
                        <th className="py-2.5 px-3">Range / Sample</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dashboard.columnsSummary.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-medium text-white font-mono">{col.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[11px] border border-indigo-500/20">
                              {col.inferredType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{col.uniqueCount}</td>
                          <td className="py-2.5 px-3 font-mono">
                            {col.nullCount > 0 ? (
                              <span className="text-amber-400">{col.nullCount} ({col.nullPercentage}%)</span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs font-mono text-[11px]">
                            {col.minValue !== undefined && col.maxValue !== undefined
                              ? `${col.minValue} → ${col.maxValue}`
                              : col.sampleValues?.slice(0, 3).join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Initializing analytical intelligence engine...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
