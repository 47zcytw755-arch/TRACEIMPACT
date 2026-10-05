import { WorkspaceRecord, WorkspaceMemberRecord, WorkspaceRole } from '@/types';
import { authService } from '@/lib/auth/auth-service';
import { hasPermission } from '@/lib/auth/rbac';
import { persistentStore } from '@/lib/db/persistent-store';

class WorkspaceService {
  constructor() {
    this.seedDefaultWorkspace();
  }

  private seedDefaultWorkspace() {
    const wsId = 'default-workspace';
    const ownerId = 'usr_demo_01';
    const workspaces = persistentStore.getCollection<WorkspaceRecord>('workspaces');

    if (!workspaces[wsId]) {
      const ws: WorkspaceRecord = {
        id: wsId,
        name: 'Default Workspace',
        slug: 'default-workspace',
        ownerId,
        tier: 'pro',
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      };

      persistentStore.setItem('workspaces', wsId, ws);

      const member: WorkspaceMemberRecord = {
        id: `mem_${wsId}_${ownerId}`,
        workspaceId: wsId,
        userId: ownerId,
        userEmail: 'demo@traceimpact.com',
        displayName: 'Demo User',
        role: 'owner',
        joinedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      };

      persistentStore.setItem('members', `${wsId}:${ownerId}`, member);
    }
  }

  async createWorkspace(name: string, ownerId: string, slug?: string): Promise<WorkspaceRecord> {
    const owner = await authService.getUserById(ownerId);
    if (!owner) throw new Error('User not found.');

    const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const wsSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const record: WorkspaceRecord = {
      id,
      name: name.trim(),
      slug: wsSlug,
      ownerId,
      tier: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    persistentStore.setItem('workspaces', id, record);

    // Automatically add creator as OWNER
    const memberRecord: WorkspaceMemberRecord = {
      id: `mem_${id}_${ownerId}`,
      workspaceId: id,
      userId: ownerId,
      userEmail: owner.email,
      displayName: owner.displayName,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    };

    persistentStore.setItem('members', `${id}:${ownerId}`, memberRecord);
    return record;
  }

  async getWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
    const workspaces = persistentStore.getCollection<WorkspaceRecord>('workspaces');
    const ws = workspaces[id];
    return ws ? { ...ws } : null;
  }

  async listWorkspacesForUser(userId: string): Promise<{ workspace: WorkspaceRecord; role: WorkspaceRole }[]> {
    const result: { workspace: WorkspaceRecord; role: WorkspaceRole }[] = [];
    const members = persistentStore.getCollection<WorkspaceMemberRecord>('members');
    const workspaces = persistentStore.getCollection<WorkspaceRecord>('workspaces');

    Object.values(members).forEach((mem) => {
      if (mem.userId === userId) {
        const ws = workspaces[mem.workspaceId];
        if (ws) {
          result.push({
            workspace: { ...ws },
            role: mem.role,
          });
        }
      }
    });

    return result;
  }

  async getMemberRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const members = persistentStore.getCollection<WorkspaceMemberRecord>('members');
    const member = members[`${workspaceId}:${userId}`];
    return member ? member.role : null;
  }

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    const members = persistentStore.getCollection<WorkspaceMemberRecord>('members');
    const list: WorkspaceMemberRecord[] = [];

    Object.values(members).forEach((mem) => {
      if (mem.workspaceId === workspaceId) {
        list.push({ ...mem });
      }
    });

    return list.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
  }

  async addMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    actorUserId?: string
  ): Promise<WorkspaceMemberRecord> {
    const ws = await this.getWorkspaceById(workspaceId);
    if (!ws) throw new Error('Workspace not found.');

    if (actorUserId) {
      const actorRole = await this.getMemberRole(workspaceId, actorUserId);
      if (!hasPermission(actorRole, 'manage_members')) {
        throw new Error('Unauthorized: Only workspace owners and admins can add members.');
      }
    }

    const user = await authService.getUserById(userId);
    if (!user) throw new Error('User not found.');

    const memberId = `mem_${workspaceId}_${userId}`;
    const memberRecord: WorkspaceMemberRecord = {
      id: memberId,
      workspaceId,
      userId,
      userEmail: user.email,
      displayName: user.displayName,
      role,
      joinedAt: new Date().toISOString(),
    };

    persistentStore.setItem('members', `${workspaceId}:${userId}`, memberRecord);
    return memberRecord;
  }

  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: WorkspaceRole,
    actorUserId: string
  ): Promise<WorkspaceMemberRecord> {
    const actorRole = await this.getMemberRole(workspaceId, actorUserId);
    if (!hasPermission(actorRole, 'manage_members')) {
      throw new Error('Unauthorized: Only workspace owners and admins can update member roles.');
    }

    const ws = await this.getWorkspaceById(workspaceId);
    if (ws && ws.ownerId === targetUserId && newRole !== 'owner') {
      throw new Error('Cannot change the role of the workspace owner.');
    }

    const members = persistentStore.getCollection<WorkspaceMemberRecord>('members');
    const member = members[`${workspaceId}:${targetUserId}`];
    if (!member) throw new Error('Member not found in workspace.');

    const updated: WorkspaceMemberRecord = {
      ...member,
      role: newRole,
    };

    persistentStore.setItem('members', `${workspaceId}:${targetUserId}`, updated);
    return updated;
  }

  async removeMember(
    workspaceId: string,
    targetUserId: string,
    actorUserId: string
  ): Promise<void> {
    const actorRole = await this.getMemberRole(workspaceId, actorUserId);
    if (!hasPermission(actorRole, 'manage_members')) {
      throw new Error('Unauthorized: Only workspace owners and admins can remove members.');
    }

    const ws = await this.getWorkspaceById(workspaceId);
    if (ws && ws.ownerId === targetUserId) {
      throw new Error('Cannot remove the owner of the workspace.');
    }

    persistentStore.deleteItem('members', `${workspaceId}:${targetUserId}`);
  }
}

export const workspaceService = new WorkspaceService();
