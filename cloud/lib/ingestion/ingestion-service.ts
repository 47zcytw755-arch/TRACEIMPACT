import crypto from 'crypto';
import { SupportedFileType, DatasetRecord, DatasetProfilingResult } from '@/types';
import { getStorageProvider } from '@/lib/storage';
import { parseFileContent } from '@/lib/parsers';
import { profileTabularData } from '@/lib/profiling/profiler';
import { datasetRepository } from '@/lib/db/dataset-repository';

export interface IngestionOptions {
  workspaceId: string;
  datasetName?: string;
  description?: string;
  originalFilename: string;
  extension: SupportedFileType;
  mimeType: string;
  fileBuffer: Buffer | Uint8Array;
}

export interface IngestionResult {
  success: boolean;
  datasetId: string;
  fileId: string;
  storageKey: string;
  status: 'ready' | 'failed';
  dataset?: DatasetRecord;
  profilingSummary?: DatasetProfilingResult;
  errorMessage?: string;
}

/**
 * End-to-end Dataset Ingestion and Profiling Service
 */
export async function ingestDatasetFile(options: IngestionOptions): Promise<IngestionResult> {
  const {
    workspaceId,
    datasetName,
    description,
    originalFilename,
    extension,
    mimeType,
    fileBuffer,
  } = options;

  const datasetId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const cleanName =
    datasetName?.trim() ||
    originalFilename.substring(0, originalFilename.lastIndexOf('.')) ||
    'Untitled Dataset';

  const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);

  // Structured Log: Ingestion Started
  console.log(`[INGESTION_START] Workspace: ${workspaceId}, Dataset: ${datasetId}, File: ${originalFilename}, Size: ${buffer.length} bytes`);

  try {
    // 1. Storage Upload
    const storage = getStorageProvider();
    const storageResult = await storage.upload({
      workspaceId,
      datasetId,
      fileId,
      originalFilename,
      extension,
      mimeType,
      buffer,
    });

    console.log(`[STORAGE_UPLOAD_COMPLETE] Key: ${storageResult.storageKey}, Provider: ${storageResult.storageProvider}`);

    // 2. Create Initial Dataset Record
    const initialRecord: DatasetRecord = {
      id: datasetId,
      workspaceId,
      name: cleanName,
      description: description || '',
      status: 'processing',
      rowCount: 0,
      columnCount: 0,
      qualityScore: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      file: {
        id: fileId,
        originalName: originalFilename,
        extension,
        sizeBytes: buffer.length,
        mimeType,
        storageKey: storageResult.storageKey,
      },
    };

    await datasetRepository.createDataset(initialRecord);

    // 3. File Parsing
    console.log(`[PARSING_START] Parser: ${extension}`);
    const parsedData = await parseFileContent(buffer, extension);
    console.log(`[PARSING_COMPLETE] Rows: ${parsedData.totalRows}, Columns: ${parsedData.totalColumns}`);

    // 4. Schema Inference, Profiling & Data Quality Scoring
    console.log(`[PROFILING_START] Analyzing ${parsedData.totalColumns} columns across ${parsedData.totalRows} rows`);
    const profilingResult = await profileTabularData(parsedData.headers, parsedData.rows);
    console.log(`[PROFILING_COMPLETE] Quality Score: ${profilingResult.qualityScore}, Issues: ${profilingResult.qualityIssues.length}`);

    // 5. Extract Sample Preview Rows (First 20 rows)
    const previewRows = parsedData.rows.slice(0, 20);

    // 6. Update Dataset State to 'ready'
    const updatedRecord = await datasetRepository.updateDatasetStatus(datasetId, workspaceId, 'ready', {
      profilingSummary: profilingResult,
      rowCount: profilingResult.rowCount,
      columnCount: profilingResult.columnCount,
      qualityScore: profilingResult.qualityScore,
    });

    if (updatedRecord) {
      updatedRecord.previewRows = previewRows;
    }

    console.log(`[INGESTION_SUCCESS] Dataset ${datasetId} is READY.`);

    return {
      success: true,
      datasetId,
      fileId,
      storageKey: storageResult.storageKey,
      status: 'ready',
      dataset: updatedRecord || undefined,
      profilingSummary: profilingResult,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[INGESTION_FAILED] Dataset ${datasetId}: ${errorMsg}`);

    // Update status to 'failed' in repository
    await datasetRepository.updateDatasetStatus(datasetId, workspaceId, 'failed', {
      errorMessage: errorMsg,
    });

    return {
      success: false,
      datasetId,
      fileId,
      storageKey: '',
      status: 'failed',
      errorMessage: errorMsg,
    };
  }
}

export interface IngestionFromStorageOptions {
  datasetId: string;
  fileId: string;
  storageKey: string;
  workspaceId: string;
  datasetName?: string;
  description?: string;
  originalFilename: string;
  extension: SupportedFileType;
  mimeType: string;
  sizeBytes?: number;
}

/**
 * Ingests and profiles a dataset that has been directly uploaded to object storage.
 * Prevents 200MB payloads from ever traversing Vercel serverless request bodies.
 */
export async function ingestFromStoredObject(options: IngestionFromStorageOptions): Promise<IngestionResult> {
  const {
    datasetId,
    fileId,
    storageKey,
    workspaceId,
    datasetName,
    description,
    originalFilename,
    extension,
    mimeType,
    sizeBytes = 0,
  } = options;

  const cleanName =
    datasetName?.trim() ||
    originalFilename.substring(0, originalFilename.lastIndexOf('.')) ||
    'Untitled Dataset';

  console.log(`[STORAGE_INGESTION_START] Workspace: ${workspaceId}, Dataset: ${datasetId}, StorageKey: ${storageKey}`);

  try {
    const storage = getStorageProvider();
    const buffer = await storage.getBuffer(storageKey);

    if (!buffer || buffer.length === 0) {
      throw new Error(`Failed to retrieve uploaded file from object storage (key: ${storageKey}).`);
    }

    const actualSizeBytes = sizeBytes || buffer.length;

    // Check if initial record already exists or create new
    const existing = await datasetRepository.getDatasetById(datasetId, workspaceId);
    if (!existing) {
      const initialRecord: DatasetRecord = {
        id: datasetId,
        workspaceId,
        name: cleanName,
        description: description || '',
        status: 'processing',
        rowCount: 0,
        columnCount: 0,
        qualityScore: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        file: {
          id: fileId,
          originalName: originalFilename,
          extension,
          sizeBytes: actualSizeBytes,
          mimeType,
          storageKey,
        },
      };
      await datasetRepository.createDataset(initialRecord);
    } else {
      await datasetRepository.updateDatasetStatus(datasetId, workspaceId, 'processing');
    }

    // 2. Parse file content
    console.log(`[PARSING_START] Parser: ${extension}`);
    const parsedData = await parseFileContent(buffer, extension);
    console.log(`[PARSING_COMPLETE] Rows: ${parsedData.totalRows}, Columns: ${parsedData.totalColumns}`);

    // 3. Schema Inference, Profiling & DQ Scoring
    console.log(`[PROFILING_START] Analyzing ${parsedData.totalColumns} columns across ${parsedData.totalRows} rows`);
    const profilingResult = await profileTabularData(parsedData.headers, parsedData.rows);
    console.log(`[PROFILING_COMPLETE] Quality Score: ${profilingResult.qualityScore}, Issues: ${profilingResult.qualityIssues.length}`);

    // 4. Sample Preview Rows (First 20 rows)
    const previewRows = parsedData.rows.slice(0, 20);

    // 5. Update status to 'ready'
    const updatedRecord = await datasetRepository.updateDatasetStatus(datasetId, workspaceId, 'ready', {
      profilingSummary: profilingResult,
      rowCount: profilingResult.rowCount,
      columnCount: profilingResult.columnCount,
      qualityScore: profilingResult.qualityScore,
    });

    if (updatedRecord) {
      updatedRecord.previewRows = previewRows;
    }

    console.log(`[STORAGE_INGESTION_SUCCESS] Dataset ${datasetId} is READY.`);

    return {
      success: true,
      datasetId,
      fileId,
      storageKey,
      status: 'ready',
      dataset: updatedRecord || undefined,
      profilingSummary: profilingResult,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[STORAGE_INGESTION_FAILED] Dataset ${datasetId}: ${errorMsg}`);

    await datasetRepository.updateDatasetStatus(datasetId, workspaceId, 'failed', {
      errorMessage: errorMsg,
    });

    return {
      success: false,
      datasetId,
      fileId,
      storageKey,
      status: 'failed',
      errorMessage: errorMsg,
    };
  }
}

