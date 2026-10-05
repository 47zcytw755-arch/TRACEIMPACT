'use client';

import React, { useState, useEffect, useRef, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EChartsChart } from '@/components/charts/EChartsChart';
import { DatasetRecord } from '@/types';
import { AIChatResponse } from '@/lib/ai/ai-types';

interface UIMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responsePayload?: AIChatResponse;
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDatasetId = searchParams.get('datasetId');

  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(urlDatasetId);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCounter = useRef(0);
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

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  const handleDatasetChange = (newId: string) => {
    setSelectedDatasetId(newId);
    setMessages([]);
    startTransition(() => {
      router.push(`/app/chat?datasetId=${newId}`);
    });
  };

  const handleSendMessage = async (text: string) => {
    const q = text.trim();
    if (!q || !selectedDatasetId || isQuerying) return;

    setInputQuery('');
    messageCounter.current += 1;
    const msgSeq = messageCounter.current;
    const currentTime = 'Just now';

    const userMsg: UIMessage = {
      id: `usr_${msgSeq}`,
      sender: 'user',
      content: q,
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsQuerying(true);

    try {
      const res = await fetch(`/api/datasets/${selectedDatasetId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });

      const data = await res.json();
      messageCounter.current += 1;
      const respSeq = messageCounter.current;

      if (data.success) {
        const assistantMsg: UIMessage = {
          id: `asst_${respSeq}`,
          sender: 'assistant',
          content: data.answer,
          timestamp: 'Just now',
          responsePayload: data,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: UIMessage = {
          id: `asst_err_${respSeq}`,
          sender: 'assistant',
          content: `⚠️ Query Rejected: ${data.error || 'Unable to process query safely.'}`,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: unknown) {
      console.error('Chat error:', err);
      messageCounter.current += 1;
      const errorMsg: UIMessage = {
        id: `asst_err_${messageCounter.current}`,
        sender: 'assistant',
        content: '⚠️ Network or processing error occurred while querying dataset.',
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  const toggleSqlExpand = (msgId: string) => {
    setExpandedSqlIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const sampleQuestions = [
    'How many total records are there?',
    'What are the top categories by volume?',
    'What is the average value across metrics?',
    'Show me the highest recorded numbers.',
  ];

  if (loadingDatasets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading datasets catalog...</p>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-2xl">
          💬
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">No Datasets Available</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Upload a dataset to chat with your data using controlled, read-only SQL queries.
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
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto space-y-4 pb-2">
      {/* 1. Header with Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Badge variant="default">Controlled AI SQL</Badge>
            <span className="text-xs text-slate-400 font-mono">Read-Only Sandbox</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Conversational Dataset Assistant
          </h1>
        </div>

        {/* Dataset Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              aria-label="Select Dataset"
              value={selectedDatasetId || ''}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl px-4 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium cursor-pointer shadow-sm"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                  {d.file?.originalName || d.name} ({d.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              ▼
            </div>
          </div>

          <Link href={`/app/dashboard?datasetId=${selectedDatasetId || ''}`}>
            <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
              View Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Messages Container */}
      <Card className="flex-1 flex flex-col border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden min-h-0">
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Welcome / Empty Conversation State */}
          {messages.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-xl text-indigo-400">
                💬
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  Ask anything about &ldquo;{selectedDataset?.file?.originalName || selectedDataset?.name}&rdquo;
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Questions are safely translated into structured queries, validated for security, executed in a read-only sandbox, and explained from factual evidence.
                </p>
              </div>

              {/* Sample Suggestions */}
              <div className="pt-2 w-full">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Sample Questions:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                <span className="font-semibold">{msg.sender === 'user' ? 'You' : 'TraceImpact AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none space-y-3'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Evidence & Visualizations for Assistant Responses */}
                {msg.responsePayload && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    {/* KPI Visualization */}
                    {msg.responsePayload.visualization?.type === 'kpi' && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 max-w-xs">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {msg.responsePayload.visualization.title}
                        </p>
                        <p className="text-xl font-bold text-white tracking-tight mt-1">
                          {msg.responsePayload.visualization.kpiValue}
                        </p>
                        {msg.responsePayload.visualization.kpiSubtitle && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {msg.responsePayload.visualization.kpiSubtitle}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bar Chart Visualization */}
                    {msg.responsePayload.visualization?.type === 'bar' && msg.responsePayload.visualization.options && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/80">
                        <p className="text-[11px] font-semibold text-slate-300 mb-2">
                          {msg.responsePayload.visualization.title}
                        </p>
                        <EChartsChart options={msg.responsePayload.visualization.options} height="220px" />
                      </div>
                    )}

                    {/* Table Visualization */}
                    {msg.responsePayload.visualization?.type === 'table' && msg.responsePayload.result.rows.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                              {msg.responsePayload.result.columns.map((c) => (
                                <th key={c} className="py-2 px-3 font-mono">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {msg.responsePayload.result.rows.slice(0, 5).map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-800/30">
                                {msg.responsePayload!.result.columns.map((c) => (
                                  <td key={c} className="py-2 px-3 font-mono text-[11px] truncate max-w-xs">
                                    {String(row[c] ?? '—')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Collapsible Executed SQL Accordion */}
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSqlExpand(msg.id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>{expandedSqlIds.has(msg.id) ? '▼ Hide' : '▶ View'} Executed SQL & Evidence</span>
                        <span className="text-slate-500">
                          ({msg.responsePayload.metadata.executionTimeMs}ms)
                        </span>
                      </button>

                      {expandedSqlIds.has(msg.id) && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase">Generated Parameterized SQL:</span>
                            <code className="text-emerald-400 break-all">{msg.responsePayload.query.sql}</code>
                          </div>
                          {msg.responsePayload.query.parameters.length > 0 && (
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase">Parameters:</span>
                              <code className="text-amber-400">
                                {JSON.stringify(msg.responsePayload.query.parameters)}
                              </code>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                            <span>Provider: {msg.responsePayload.metadata.provider}</span>
                            <span>Model: {msg.responsePayload.metadata.model}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Thinking Indicator */}
          {isQuerying && (
            <div className="flex flex-col items-start space-y-1.5">
              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                <span className="font-semibold">TraceImpact AI</span>
                <span>•</span>
                <span>Analyzing schema & executing SQL...</span>
              </div>
              <div className="rounded-2xl rounded-tl-none p-4 bg-slate-950/80 border border-slate-800 text-slate-400 text-xs flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <span>Translating intent to validated SQL...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Input Form */}
        <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/90">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputQuery);
            }}
            className="flex flex-col gap-2"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isQuerying}
                placeholder={`Ask about "${selectedDataset?.file?.originalName || 'dataset'}" (e.g., 'What is the average revenue by status?')`}
                className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-24 transition-all disabled:opacity-50"
              />
              <div className="absolute right-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={!inputQuery.trim() || isQuerying}
                >
                  {isQuerying ? 'Querying...' : 'Send'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Security: Read-only SELECT sandbox with AST parameterization</span>
              <span className="text-emerald-400 font-mono">✓ Grounded in Data</span>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Initializing AI query interface...</p>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
