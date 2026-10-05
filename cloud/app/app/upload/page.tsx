'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatBytes } from '@/lib/utils';
import { DatasetRecord, SupportedFileType } from '@/types';

export type FileUploadStatus = 'pending' | 'authorizing' | 'uploading' | 'processing' | 'success' | 'failed';

export interface QueuedFileItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  extension: SupportedFileType;
  status: FileUploadStatus;
  progress: number;
  errorMsg?: string;
  datasetResult?: DatasetRecord;
}

const ALLOWED_EXTENSIONS: SupportedFileType[] = ['csv', 'xlsx', 'json', 'txt'];
const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB configured ceiling (>= 200 MB supported)

function generateQueueItemId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export default function MultiFileUploadPage() {
  const [fileQueue, setFileQueue] = useState<QueuedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems: QueuedFileItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() as SupportedFileType;
      const isAllowed = ALLOWED_EXTENSIONS.includes(ext);
      const isWithinLimit = file.size <= MAX_FILE_SIZE_BYTES;

      let initialStatus: FileUploadStatus = 'pending';
      let errorMsg: string | undefined;

      if (!isAllowed) {
        initialStatus = 'failed';
        errorMsg = `Unsupported format ".${ext}". Please upload CSV, XLSX, JSON, or TXT.`;
      } else if (!isWithinLimit) {
        initialStatus = 'failed';
        errorMsg = `File size (${formatBytes(file.size)}) exceeds the 250 MB upload ceiling.`;
      } else if (file.size === 0) {
        initialStatus = 'failed';
        errorMsg = 'File is empty (0 bytes).';
      }

      newItems.push({
        id: generateQueueItemId(),
        file,
        name: file.name,
        sizeBytes: file.size,
        extension: ext,
        status: initialStatus,
        progress: 0,
        errorMsg,
      });
    });

    setFileQueue((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (id: string) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    setFileQueue([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearCompleted = () => {
    setFileQueue((prev) => prev.filter((item) => item.status !== 'success'));
  };

  /**
   * Direct Object-Storage Upload Pipeline:
   * 1. Request signed authorization (/api/datasets/upload/sign)
   * 2. Direct browser upload to durable object storage (PUT uploadUrl) with live progress
   * 3. Trigger server-side ingestion & profiling (/api/datasets/upload/complete)
   */
  const processSingleFile = async (item: QueuedFileItem): Promise<void> => {
    const { file, id, name, sizeBytes } = item;
    const cleanName = name.replace(/\.[^/.]+$/, '');

    // Step 1: Request signed upload authorization
    setFileQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'authorizing', progress: 5, errorMsg: undefined } : f))
    );

    try {
      const signRes = await fetch('/api/datasets/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: name,
          sizeBytes,
          mimeType: file.type || 'application/octet-stream',
          workspaceId: 'default-workspace',
          datasetName: cleanName,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok || !signData.success) {
        throw new Error(signData.error || 'Failed to authorize upload.');
      }

      const { uploadUrl, storageKey, datasetId, fileId, method = 'PUT', headers = {} } = signData;

      // Step 2: Direct browser-to-storage upload (bypassing Vercel serverless request body)
      setFileQueue((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: 10 } : f))
      );

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, uploadUrl, true);

        // Set request headers if provided
        Object.entries(headers).forEach(([k, v]) => {
          if (typeof v === 'string') {
            xhr.setRequestHeader(k, v);
          }
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 75) + 10; // 10% -> 85%
            setFileQueue((prev) =>
              prev.map((f) => (f.id === id ? { ...f, progress: pct } : f))
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Direct storage upload failed with status ${xhr.status}.`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during direct storage upload.'));
        };

        xhr.send(file);
      });

      // Step 3: Trigger server-side ingestion, schema inference & DQ profiling
      setFileQueue((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'processing', progress: 90 } : f))
      );

      const completeRes = await fetch('/api/datasets/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId,
          fileId,
          storageKey,
          workspaceId: 'default-workspace',
          filename: name,
          sizeBytes,
          mimeType: file.type || 'application/octet-stream',
          datasetName: cleanName,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok || !completeData.success) {
        throw new Error(completeData.error || 'Server ingestion and profiling failed.');
      }

      setFileQueue((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'success', progress: 100, datasetResult: completeData.dataset }
            : f
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setFileQueue((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'failed', progress: 0, errorMsg: msg } : f
        )
      );
    }
  };

  const handleUploadAll = async () => {
    const pendingItems = fileQueue.filter((f) => f.status === 'pending' || f.status === 'failed');
    if (pendingItems.length === 0) return;

    setIsBatchRunning(true);

    // Sequential controlled processing: each file processes independently with isolated error boundary
    for (const item of pendingItems) {
      if (item.status === 'pending' || item.status === 'failed') {
        await processSingleFile(item);
      }
    }

    setIsBatchRunning(false);
  };

  const handleRetrySingle = async (item: QueuedFileItem) => {
    await processSingleFile(item);
  };

  const totalCount = fileQueue.length;
  const successCount = fileQueue.filter((f) => f.status === 'success').length;
  const failedCount = fileQueue.filter((f) => f.status === 'failed').length;
  const pendingCount = fileQueue.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="success">Direct-to-Storage Ingestion</Badge>
          <span className="text-xs text-slate-400">High Capacity (200MB+ Supported)</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Upload Datasets
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload multiple CSV, XLSX, JSON, or TXT datasets. Files are streamed directly to durable object storage without serverless payload bottlenecks.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <Card className="border-slate-800">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.json,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFilesToQueue(e.target.files);
              }
            }}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 text-center">
              Drop datasets here or click to choose
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4 text-center">
              Select <span className="text-indigo-400 font-medium">multiple files</span> at once • Up to 250 MB per file (200 MB+ supported)
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">CSV (.csv)</span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">Excel (.xlsx)</span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">JSON (.json)</span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">Text (.txt)</span>
            </div>
          </div>

          {/* Queued Files Table / List */}
          {fileQueue.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">Selected Files ({totalCount})</h4>
                  {successCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {successCount} Ingested
                    </span>
                  )}
                  {failedCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {failedCount} Failed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={triggerFileInput} disabled={isBatchRunning}>
                    Add More Files
                  </Button>
                  {successCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCompleted} disabled={isBatchRunning}>
                      Clear Completed
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearQueue} disabled={isBatchRunning}>
                    Clear Queue
                  </Button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {fileQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      item.status === 'success'
                        ? 'bg-emerald-950/20 border-emerald-900/50'
                        : item.status === 'failed'
                        ? 'bg-rose-950/20 border-rose-900/50'
                        : item.status === 'uploading' || item.status === 'processing' || item.status === 'authorizing'
                        ? 'bg-indigo-950/20 border-indigo-800/50'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                            item.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : item.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.75}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{formatBytes(item.sizeBytes)}</span>
                            <span>•</span>
                            <span className="uppercase font-mono">{item.extension}</span>
                            <span>•</span>
                            <span className="text-indigo-400">Direct Object Storage</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges & Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {item.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            Pending
                          </span>
                        )}

                        {item.status === 'authorizing' && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            Authorizing...
                          </span>
                        )}

                        {item.status === 'uploading' && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            Uploading {item.progress}%
                          </span>
                        )}

                        {item.status === 'processing' && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            Profiling & Scoring...
                          </span>
                        )}

                        {item.status === 'success' && (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              ✓ Ingested ({item.datasetResult?.rowCount || 0} rows)
                            </span>
                            {item.datasetResult && (
                              <Link
                                href={`/app/dashboard?datasetId=${item.datasetResult.id}`}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                              >
                                Dashboard →
                              </Link>
                            )}
                          </div>
                        )}

                        {item.status === 'failed' && (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Failed
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetrySingle(item)}
                              disabled={isBatchRunning}
                            >
                              Retry
                            </Button>
                          </div>
                        )}

                        {!isBatchRunning && (
                          <button
                            onClick={() => removeFile(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Remove file"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar for Active Upload */}
                    {(item.status === 'uploading' || item.status === 'processing' || item.status === 'authorizing') && (
                      <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {item.status === 'failed' && item.errorMsg && (
                      <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{item.errorMsg}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  {pendingCount > 0 ? (
                    <span>{pendingCount} file(s) ready to ingest</span>
                  ) : successCount === totalCount ? (
                    <span className="text-emerald-400 font-medium">All {totalCount} datasets successfully ingested!</span>
                  ) : (
                    <span>{successCount} completed, {failedCount} failed</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {successCount > 0 && (
                    <Link href="/app/datasets">
                      <Button variant="outline" size="md">
                        View All Datasets ({successCount})
                      </Button>
                    </Link>
                  )}

                  {pendingCount > 0 && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleUploadAll}
                      disabled={isBatchRunning}
                    >
                      {isBatchRunning ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          Ingesting Files...
                        </span>
                      ) : (
                        `Upload All (${pendingCount})`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
