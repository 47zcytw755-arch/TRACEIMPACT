import { NextRequest, NextResponse } from 'next/server';
import { ingestDatasetFile } from '@/lib/ingestion/ingestion-service';
import { chunkStore } from '@/lib/storage/chunk-store';
import { SupportedFileType } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB max file size
const ALLOWED_EXTENSIONS: SupportedFileType[] = ['csv', 'xlsx', 'json', 'txt'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunkFile = formData.get('chunk') as File | null;
    const uploadId = (formData.get('uploadId') as string) || '';
    const filename = (formData.get('filename') as string) || 'dataset.csv';
    const chunkIndexStr = formData.get('chunkIndex') as string;
    const totalChunksStr = formData.get('totalChunks') as string;
    const totalFileSizeStr = formData.get('fileSize') as string;
    const workspaceId = (formData.get('workspaceId') as string) || 'default-workspace';
    const datasetName = (formData.get('name') as string) || undefined;
    const description = (formData.get('description') as string) || undefined;

    if (!chunkFile || !uploadId || chunkIndexStr === null || totalChunksStr === null) {
      return NextResponse.json(
        { success: false, error: 'Missing required chunk upload parameters (chunk, uploadId, chunkIndex, totalChunks).' },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);
    const totalFileSize = totalFileSizeStr ? parseInt(totalFileSizeStr, 10) : 0;

    if (isNaN(chunkIndex) || isNaN(totalChunks) || totalChunks <= 0 || chunkIndex < 0 || chunkIndex >= totalChunks) {
      return NextResponse.json(
        { success: false, error: 'Invalid chunkIndex or totalChunks values.' },
        { status: 400 }
      );
    }

    if (totalFileSize > MAX_FILE_SIZE_BYTES) {
      chunkStore.abortSession(uploadId);
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(totalFileSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 250 MB upload limit.`,
        },
        { status: 413 }
      );
    }

    const ext = filename.split('.').pop()?.toLowerCase() as SupportedFileType;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      chunkStore.abortSession(uploadId);
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format ".${ext}". Supported formats are: CSV, XLSX, JSON, TXT.`,
        },
        { status: 415 }
      );
    }

    const chunkArrayBuffer = await chunkFile.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);

    // Save and check chunk completion
    const chunkResult = chunkStore.saveChunk({
      uploadId,
      filename,
      chunkIndex,
      totalChunks,
      chunkBuffer,
      fileSizeBytes: totalFileSize,
    });

    if (!chunkResult.isComplete || !chunkResult.fullBuffer) {
      return NextResponse.json({
        success: true,
        isComplete: false,
        uploadedChunks: chunkResult.uploadedChunksCount,
        totalChunks: chunkResult.totalChunks,
        uploadId,
      });
    }

    // All chunks assembled — proceed to standard ingestion pipeline
    const fullBuffer = chunkResult.fullBuffer;
    console.log(`[CHUNKED_INGESTION_START] Assembled ${fullBuffer.length} bytes across ${totalChunks} chunks for ${filename}`);

    const ingestionResult = await ingestDatasetFile({
      workspaceId,
      datasetName,
      description,
      originalFilename: filename,
      extension: ext,
      mimeType: chunkFile.type || 'application/octet-stream',
      fileBuffer: fullBuffer,
    });

    if (!ingestionResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: ingestionResult.errorMessage || 'Dataset processing failed.',
          datasetId: ingestionResult.datasetId,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        isComplete: true,
        datasetId: ingestionResult.datasetId,
        fileId: ingestionResult.fileId,
        status: ingestionResult.status,
        dataset: ingestionResult.dataset,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error during chunked upload';
    console.error('Chunked upload route error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
