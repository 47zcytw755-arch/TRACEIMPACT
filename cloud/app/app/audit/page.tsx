'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const workspaceId = 'default-workspace';

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      try {
        const url =
          selectedAction === 'ALL'
            ? `/api/workspaces/${workspaceId}/audit?limit=100`
            : `/api/workspaces/${workspaceId}/audit?limit=100&action=${selectedAction}`;

        const res = await fetch(url);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Access denied or failed to load audit logs.');
        }
      } catch {
        if (isMounted) setError('An error occurred while fetching audit trail');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, selectedAction]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.user_id.toLowerCase().includes(term) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(term)) ||
      log.resource_type.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (action: string) => {
    if (action.startsWith('AUTH_')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          {action}
        </span>
      );
    }
    if (action.startsWith('MEMBER_') || action.startsWith('ROLE_')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
          {action}
        </span>
      );
    }
    if (action.startsWith('DATASET_')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          {action}
        </span>
      );
    }
    if (action === 'AI_QUERY_EXECUTED') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Governance & Audit Trail</h1>
        <p className="text-sm text-slate-400 mt-1">
          Immutable log of security-sensitive operations, data exports, authentication events, and AI executions.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="Search by action, user ID, resource..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <svg
                className="w-4 h-4 text-slate-500 absolute left-3.5 top-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All Actions</option>
                <option value="AUTH_LOGIN">AUTH_LOGIN</option>
                <option value="AUTH_SIGNUP">AUTH_SIGNUP</option>
                <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
                <option value="MEMBER_INVITED">MEMBER_INVITED</option>
                <option value="MEMBER_ACCEPTED">MEMBER_ACCEPTED</option>
                <option value="MEMBER_REMOVED">MEMBER_REMOVED</option>
                <option value="DATASET_EXPORTED">DATASET_EXPORTED</option>
                <option value="AI_QUERY_EXECUTED">AI_QUERY_EXECUTED</option>
                <option value="WORKSPACE_CREATED">WORKSPACE_CREATED</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-white">Event Log ({filteredLogs.length})</CardTitle>
          <CardDescription className="text-slate-400">
            Chronological audit events recorded for workspace: <code className="text-indigo-400">{workspaceId}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading audit events...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-y border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400">
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-6">Action</th>
                    <th className="py-3 px-6">Actor (User)</th>
                    <th className="py-3 px-6">Resource</th>
                    <th className="py-3 px-6">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-slate-400 text-xs whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">{getActionBadge(log.action)}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-300">
                        {log.user_id}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300">
                        <span className="font-semibold text-slate-400">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="ml-1 text-slate-500 font-mono">({log.resource_id})</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-400 max-w-xs truncate">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <span title={JSON.stringify(log.metadata, null, 2)}>
                            {JSON.stringify(log.metadata)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
