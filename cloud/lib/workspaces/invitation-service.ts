import crypto from 'crypto';
import { WorkspaceInvitationRecord, WorkspaceRole } from '@/types';
import { workspaceService } from './workspace-service';
import { authService } from '@/lib/auth/auth-service';
import { hasPermission } from '@/lib/auth/rbac';
import { persistentStore } from '@/lib/db/persistent-store';

class InvitationService {
  async createInvitation(
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    actorUserId: string
  ): Promise<WorkspaceInvitationRecord> {
    const actorRole = await workspaceService.getMemberRole(workspaceId, actorUserId);
    if (!hasPermission(actorRole, 'manage_members')) {
      throw new Error('Unauthorized: Only workspace owners and admins can invite members.');
    }

    const actor = await authService.getUserById(actorUserId);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Valid invitation email address is required.');
    }

    // Check if user is already a member
    const members = await workspaceService.listWorkspaceMembers(workspaceId);
    if (members.some((m) => m.userEmail.toLowerCase() === cleanEmail)) {
      throw new Error('User is already a member of this workspace.');
    }

    const invitations = persistentStore.getCollection<WorkspaceInvitationRecord>('invitations');

    // Check for duplicate pending invitation
    Object.values(invitations).forEach((inv) => {
      if (
        inv.workspaceId === workspaceId &&
        inv.email.toLowerCase() === cleanEmail &&
        inv.status === 'pending' &&
        new Date(inv.expiresAt).getTime() > Date.now()
      ) {
        throw new Error('A pending invitation for this email address already exists.');
      }
    });

    const id = `inv_${crypto.randomBytes(16).toString('hex')}`;
    const now = Date.now();
    const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitation: WorkspaceInvitationRecord = {
      id,
      workspaceId,
      email: cleanEmail,
      role,
      invitedBy: actorUserId,
      invitedByEmail: actor?.email || 'admin@traceimpact.com',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    persistentStore.setItem('invitations', id, invitation);
    return invitation;
  }

  async listInvitations(workspaceId: string): Promise<WorkspaceInvitationRecord[]> {
    const invitations = persistentStore.getCollection<WorkspaceInvitationRecord>('invitations');
    const list: WorkspaceInvitationRecord[] = [];

    Object.values(invitations).forEach((inv) => {
      if (inv.workspaceId === workspaceId) {
        list.push({ ...inv });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getInvitationById(id: string): Promise<WorkspaceInvitationRecord | null> {
    const invitations = persistentStore.getCollection<WorkspaceInvitationRecord>('invitations');
    const inv = invitations[id];
    return inv ? { ...inv } : null;
  }

  async acceptInvitation(invitationId: string, userEmail: string, userId: string): Promise<void> {
    const invitations = persistentStore.getCollection<WorkspaceInvitationRecord>('invitations');
    const inv = invitations[invitationId];
    if (!inv) throw new Error('Invitation not found.');

    if (inv.status === 'revoked') {
      throw new Error('This invitation has been revoked by the workspace administrator.');
    }

    if (inv.status === 'expired' || new Date(inv.expiresAt).getTime() < Date.now()) {
      inv.status = 'expired';
      persistentStore.setItem('invitations', invitationId, inv);
      throw new Error('This invitation has expired.');
    }

    if (inv.status === 'accepted') {
      throw new Error('This invitation has already been accepted.');
    }

    if (inv.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
      throw new Error('This invitation was sent to a different email address.');
    }

    // Add member to workspace
    await workspaceService.addMember(inv.workspaceId, userId, inv.role);

    // Update invitation status
    inv.status = 'accepted';
    persistentStore.setItem('invitations', invitationId, inv);
  }

  async revokeInvitation(invitationId: string, actorUserId: string): Promise<void> {
    const invitations = persistentStore.getCollection<WorkspaceInvitationRecord>('invitations');
    const inv = invitations[invitationId];
    if (!inv) throw new Error('Invitation not found.');

    const actorRole = await workspaceService.getMemberRole(inv.workspaceId, actorUserId);
    if (!hasPermission(actorRole, 'manage_members')) {
      throw new Error('Unauthorized: Only workspace owners and admins can revoke invitations.');
    }

    inv.status = 'revoked';
    persistentStore.setItem('invitations', invitationId, inv);
  }
}

export const invitationService = new InvitationService();
