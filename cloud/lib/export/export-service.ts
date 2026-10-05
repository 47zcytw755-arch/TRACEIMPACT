import Papa from 'papaparse';
import { DatasetRecord } from '@/types';

export interface ExportResult {
  data: string;
  mimeType: string;
  filename: string;
  rowCount: number;
}

/**
 * Exports normalized, cleaned tabular data for a dataset.
 * Uses the dataset's preview rows and structured columns, ensuring no internal server metadata is leaked.
 */
export function exportCleanedDataset(
  dataset: DatasetRecord,
  format: 'csv' | 'json' = 'csv'
): ExportResult {
  const rows = dataset.previewRows || [];
  const baseName = (dataset.file?.originalName || dataset.name).replace(/\.[^/.]+$/, '');
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  if (format === 'json') {
    const data = JSON.stringify(rows, null, 2);
    return {
      data,
      mimeType: 'application/json',
      filename: `${cleanName}_cleaned.json`,
      rowCount: rows.length,
    };
  }

  // Default: CSV Export
  const columns = dataset.columns?.map((c) => c.name) || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const csvData = Papa.unparse({
    fields: columns,
    data: rows,
  });

  return {
    data: csvData,
    mimeType: 'text/csv; charset=utf-8',
    filename: `${cleanName}_cleaned.csv`,
    rowCount: rows.length,
  };
}
