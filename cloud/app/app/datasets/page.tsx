'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { DatasetRecord } from '@/types';
import { formatBytes, formatDate } from '@/lib/utils';

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch('/api/datasets?workspaceId=default-workspace');
        const data = await res.json();
        if (!ignore) {
          if (data.success && Array.isArray(data.datasets)) {
            setDatasets(data.datasets);
          } else {
            setFetchError(data.error || 'Failed to load datasets');
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Error fetching datasets';
          setFetchError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default">Dataset Catalog</Badge>
            <span className="text-xs text-slate-400">Workspace Boundary: Default</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Datasets
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Inspect your uploaded files, schema profiles, and data quality health.
          </p>
        </div>

        <Link href="/app/upload">
          <Button variant="primary" size="md">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload dataset
          </Button>
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center justify-between">
          <span>{fetchError}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsLoading(true);
              setFetchError(null);
              setRefreshIndex((i) => i + 1);
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-slate-800 bg-slate-900/40">
              <CardHeader className="p-5">
                <div className="h-5 bg-slate-800 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="h-10 bg-slate-800/40 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : datasets.length === 0 ? (
        /* Empty State */
        <div className="mt-8">
          <EmptyState
            title="No datasets yet"
            description="Upload your first dataset to start analyzing your data."
            actionText="Upload dataset"
            actionHref="/app/upload"
          />
        </div>
      ) : (
        /* Populated Datasets Grid & Table */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <Card key={dataset.id} className="border-slate-800 hover:border-slate-700 transition-all">
                <CardHeader className="p-5 pb-3 border-b border-slate-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold truncate text-white">
                      {dataset.name}
                    </CardTitle>
                    <Badge
                      variant={
                        dataset.status === 'ready'
                          ? 'success'
                          : dataset.status === 'failed'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {dataset.status.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs truncate">
                    {dataset.file.originalName} ({formatBytes(dataset.file.sizeBytes)})
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Rows</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {dataset.rowCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Columns</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {dataset.columnCount}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Quality</span>
                      <span className={`text-sm font-bold font-mono ${
                        (dataset.qualityScore ?? 0) >= 80
                          ? 'text-emerald-400'
                          : (dataset.qualityScore ?? 0) >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}>
                        {dataset.qualityScore !== null ? `${dataset.qualityScore}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>Uploaded {formatDate(dataset.createdAt)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] uppercase text-indigo-300">
                      {dataset.file.extension}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
