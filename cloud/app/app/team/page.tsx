'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

interface Member {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  created_at: string;
  user?: {
    id: string;
    email: string;
    display_name: string;
  };
}

interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invited_by: string;
  created_at: string;
  expires_at: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Invite modal / form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  // Default workspace id (matches backend default)
  const workspaceId = 'default-workspace';

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [membersRes, invRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/members`),
          fetch(`/api/workspaces/${workspaceId}/invitations`),
        ]);

        if (!isMounted) return;

        if (membersRes.ok) {
          const memData = await membersRes.json();
          setMembers(memData.members || []);
        } else {
          const errData = await membersRes.json();
          setError(errData.error || 'Failed to load members');
        }

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvitations(invData.invitations || []);
        }
      } catch {
        if (isMounted) setError('An error occurred while fetching team data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, reloadTrigger]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
      setReloadTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send invitation');
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (invId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations/${invId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReloadTrigger((prev) => prev + 1);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to revoke invitation');
      }
    } catch {
      setError('Failed to revoke invitation');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            OWNER
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            ADMIN
          </span>
        );
      case 'MEMBER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            MEMBER
          </span>
        );
      case 'VIEWER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            VIEWER
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {role}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Pending
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Accepted
          </span>
        );
      case 'REVOKED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Revoked
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Expired
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team & Access Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage workspace members, assign role-based permissions (RBAC), and invite colleagues.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {/* Invite Member Card */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-white">Invite Team Member</CardTitle>
          <CardDescription className="text-slate-400">
            Send an invitation to join this workspace with custom role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="w-full sm:w-40 space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'MEMBER' | 'VIEWER')}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="MEMBER">Member (Full Access)</option>
                <option value="VIEWER">Viewer (Read Only)</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-5 py-2"
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Members Table */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-white">Active Members ({members.length})</CardTitle>
          <CardDescription className="text-slate-400">
            Colleagues with authenticated access to this workspace&apos;s datasets and intelligence services.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No members found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-y border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400">
                    <th className="py-3 px-6">Member</th>
                    <th className="py-3 px-6">Email</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
                            {(m.user?.display_name || m.user?.email || 'M').slice(0, 2).toUpperCase()}
                          </div>
                          <span>{m.user?.display_name || 'Active User'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-400">{m.user?.email || '—'}</td>
                      <td className="py-4 px-6">{getRoleBadge(m.role)}</td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending / Historical Invitations */}
      {invitations.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg text-white">Pending & Past Invitations</CardTitle>
            <CardDescription className="text-slate-400">
              Invitations sent to email addresses for workspace onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-y border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400">
                    <th className="py-3 px-6">Invitee</th>
                    <th className="py-3 px-6">Assigned Role</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Sent Date</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-200">{inv.email}</td>
                      <td className="py-4 px-6">{getRoleBadge(inv.role)}</td>
                      <td className="py-4 px-6">{getStatusBadge(inv.status)}</td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
