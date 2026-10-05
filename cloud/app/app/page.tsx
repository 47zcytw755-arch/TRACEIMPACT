'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface DatasetSummary {
  id: string;
  name: string;
  rowCount: number;
  qualityScore: number | null;
  status: string;
}

export default function WorkspaceOverviewPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/datasets')
      .then((res) => (res.ok ? res.json() : { datasets: [] }))
      .then((data) => {
        if (isMounted) {
          setDatasets(data.datasets || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalDatasets = datasets.length;
  const totalRows = datasets.reduce((acc, d) => acc + (d.rowCount || 0), 0);
  const scoredDatasets = datasets.filter((d) => typeof d.qualityScore === 'number');
  const avgQualityScore =
    scoredDatasets.length > 0
      ? Math.round(scoredDatasets.reduce((acc, d) => acc + (d.qualityScore || 0), 0) / scoredDatasets.length)
      : 100;

  const stats = [
    {
      title: 'Datasets Uploaded',
      value: loading ? '...' : totalDatasets.toString(),
      change: totalDatasets === 0 ? 'No datasets uploaded yet' : `${totalDatasets} active dataset${totalDatasets > 1 ? 's' : ''}`,
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
    },
    {
      title: 'Total Rows Ingested',
      value: loading ? '...' : totalRows.toLocaleString(),
      change: totalRows === 0 ? 'Awaiting first dataset run' : 'Processed & normalized',
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Avg Quality Score',
      value: loading ? '...' : totalDatasets === 0 ? '—' : `${avgQualityScore}/100`,
      change: totalDatasets === 0 ? 'Computed after profiling' : 'Autonomous health diagnostic',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: 'AI Intelligence',
      value: 'Active',
      change: 'Controlled safe SQL chat enabled',
      icon: (
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900/80 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">Production Workspace</Badge>
            <span className="text-xs text-emerald-400 font-medium">Enterprise Engine Active</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome to TraceImpact Cloud
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Your multi-tenant data workspace is active. Upload datasets in CSV, XLSX, JSON, or TXT format to begin automatic profiling, quality scoring, dashboard generation, and controlled AI chat.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/app/upload">
              <Button variant="primary" size="md">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload new dataset
              </Button>
            </Link>
            <Link href="/app/datasets">
              <Button variant="outline" size="md">
                View All Datasets
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Workspace Telemetry & Operational Health
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="border-slate-800 hover:border-slate-700 transition-all bg-slate-900/60 backdrop-blur-sm">
              <CardHeader className="p-4 pb-2 border-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">{stat.title}</span>
                  <div className="p-2 rounded-lg bg-slate-800/70">{stat.icon}</div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <p className="text-xs text-slate-400">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Launchpad & Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <CardTitle className="text-base text-white">01. Autonomous Ingestion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-400">
            <p>
              Robust tabular parsers supporting CSV, Excel, JSON, and TXT with statistical schema inference and anomaly detection.
            </p>
            <Link href="/app/upload" className="inline-block text-indigo-400 hover:text-indigo-300 font-medium">
              Go to Upload →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <CardTitle className="text-base text-white">02. Automated Dashboards</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-400">
            <p>
              Instant KPI generation, statistical distributions, and ECharts visualizations personalized to your uploaded data schema.
            </p>
            <Link href="/app/dashboard" className="inline-block text-emerald-400 hover:text-emerald-300 font-medium">
              Explore Dashboards →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <CardTitle className="text-base text-white">03. Controlled AI Data Chat</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-400">
            <p>
              Ask plain English questions against your dataset. Verified read-only execution with zero hallucinations and evidence grounding.
            </p>
            <Link href="/app/chat" className="inline-block text-cyan-400 hover:text-cyan-300 font-medium">
              Open AI Chat →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
