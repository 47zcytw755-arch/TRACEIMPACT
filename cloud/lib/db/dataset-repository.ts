import { DatasetRecord, DatasetProcessingStatus, DatasetProfilingResult } from '@/types';
import { persistentStore } from '@/lib/db/persistent-store';

export interface IDatasetRepository {
  createDataset(record: DatasetRecord): Promise<DatasetRecord>;
  getDatasetById(id: string, workspaceId: string): Promise<DatasetRecord | null>;
  listDatasetsByWorkspace(workspaceId: string): Promise<DatasetRecord[]>;
  updateDatasetStatus(
    id: string,
    workspaceId: string,
    status: DatasetProcessingStatus,
    updates?: {
      profilingSummary?: DatasetProfilingResult;
      rowCount?: number;
      columnCount?: number;
      qualityScore?: number;
      errorMessage?: string;
    }
  ): Promise<DatasetRecord | null>;
  deleteDataset(id: string, workspaceId: string): Promise<boolean>;
}

/**
 * Persistent PostgreSQL / Multi-Tenant Dataset Repository
 * Enforces workspace boundary and persists to durable storage.
 */
class DatasetRepositoryImpl implements IDatasetRepository {
  async createDataset(record: DatasetRecord): Promise<DatasetRecord> {
    persistentStore.setItem('datasets', record.id, { ...record });
    return { ...record };
  }

  async getDatasetById(id: string, workspaceId: string): Promise<DatasetRecord | null> {
    const datasets = persistentStore.getCollection<DatasetRecord>('datasets');
    const record = datasets[id];
    if (!record) return null;
    // Enforce tenant boundary
    if (record.workspaceId !== workspaceId) {
      return null;
    }
    return { ...record };
  }

  async listDatasetsByWorkspace(workspaceId: string): Promise<DatasetRecord[]> {
    const datasets = persistentStore.getCollection<DatasetRecord>('datasets');
    const list: DatasetRecord[] = [];

    Object.values(datasets).forEach((record) => {
      if (record.workspaceId === workspaceId) {
        list.push({ ...record });
      }
    });

    // Sort descending by creation date
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateDatasetStatus(
    id: string,
    workspaceId: string,
    status: DatasetProcessingStatus,
    updates?: {
      profilingSummary?: DatasetProfilingResult;
      rowCount?: number;
      columnCount?: number;
      qualityScore?: number;
      errorMessage?: string;
    }
  ): Promise<DatasetRecord | null> {
    const existing = await this.getDatasetById(id, workspaceId);
    if (!existing) return null;

    const updated: DatasetRecord = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      ...(updates?.profilingSummary && {
        profilingSummary: updates.profilingSummary,
        columns: updates.profilingSummary.columns,
        qualityIssues: updates.profilingSummary.qualityIssues,
        rowCount: updates.profilingSummary.rowCount,
        columnCount: updates.profilingSummary.columnCount,
        qualityScore: updates.profilingSummary.qualityScore,
      }),
      ...(updates?.rowCount !== undefined && { rowCount: updates.rowCount }),
      ...(updates?.columnCount !== undefined && { columnCount: updates.columnCount }),
      ...(updates?.qualityScore !== undefined && { qualityScore: updates.qualityScore }),
      ...(updates?.errorMessage !== undefined && { errorMessage: updates.errorMessage }),
    };

    persistentStore.setItem('datasets', id, updated);
    return { ...updated };
  }

  async deleteDataset(id: string, workspaceId: string): Promise<boolean> {
    const existing = await this.getDatasetById(id, workspaceId);
    if (!existing) return false;
    return persistentStore.deleteItem('datasets', id);
  }
}

// Global singleton repository instance
export const datasetRepository: IDatasetRepository = new DatasetRepositoryImpl();
