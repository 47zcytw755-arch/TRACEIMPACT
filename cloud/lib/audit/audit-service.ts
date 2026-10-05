import crypto from 'crypto';
import { AuditLogRecord, AuditLogAction } from '@/types';
import { persistentStore } from '@/lib/db/persistent-store';

class AuditService {
  private sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta) return undefined;

    const forbiddenFields = [
      'password',
      'passwordhash',
      'token',
      'secret',
      'apikey',
      'api_key',
      'credentials',
      'authorization',
    ];

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      const lowerKey = k.toLowerCase();
      if (!forbiddenFields.some((f) => lowerKey.includes(f))) {
        clean[k] = v;
      }
    }
    return clean;
  }

  async recordAuditLog(entry: {
    workspaceId: string;
    userId: string;
    userEmail: string;
    action: AuditLogAction;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      workspaceId: entry.workspaceId,
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: this.sanitizeMetadata(entry.metadata),
      createdAt: new Date().toISOString(),
    };

    persistentStore.addAuditLog(record);
    return record;
  }

  async listAuditLogs(
    workspaceId: string,
    filters?: {
      action?: AuditLogAction;
      userId?: string;
      limit?: number;
    }
  ): Promise<AuditLogRecord[]> {
    const logs = persistentStore.getAuditLogs<AuditLogRecord>();
    let filtered = logs.filter((log) => log.workspaceId === workspaceId);

    if (filters?.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }
    if (filters?.userId) {
      filtered = filtered.filter((log) => log.userId === filters.userId);
    }

    const limit = filters?.limit || 100;
    return filtered.slice(0, limit);
  }
}

export const auditService = new AuditService();
