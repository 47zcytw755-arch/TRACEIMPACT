import { DatasetRecord } from '@/types';
import { DatasetAIContext } from './ai-types';

/**
 * Builds a secure, tenant-isolated AI context object containing only
 * the metadata and bounded sample rows necessary for SQL generation and evidence grounding.
 */
export function buildDatasetAIContext(dataset: DatasetRecord): DatasetAIContext {
  const columns = dataset.columns || dataset.profilingSummary?.columns || [];
  const previewRows = dataset.previewRows || [];

  return {
    datasetId: dataset.id,
    workspaceId: dataset.workspaceId,
    name: dataset.file?.originalName || dataset.name,
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount || columns.length,
    format: dataset.file?.extension || 'csv',
    columns: columns.map((col) => ({
      name: col.name,
      inferredType: col.inferredType,
      isNullable: col.isNullable,
      nullCount: col.nullCount,
      nullPercentage: col.nullPercentage,
      uniqueCount: col.uniqueCount,
      uniquenessPercentage: col.uniquenessPercentage,
      sampleValues: col.sampleValues?.slice(0, 5) || [],
      minValue: col.minValue,
      maxValue: col.maxValue,
      typeBreakdown: col.typeBreakdown,
    })),
    sampleRows: previewRows.slice(0, 10),
    qualityScore: dataset.qualityScore ?? dataset.profilingSummary?.qualityScore ?? 100,
  };
}
