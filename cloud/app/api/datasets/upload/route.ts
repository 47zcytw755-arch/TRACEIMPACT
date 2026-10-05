import { NextRequest, NextResponse } from 'next/server';
import { ingestDatasetFile } from '@/lib/ingestion/ingestion-service';
import { SupportedFileType } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB
const ALLOWED_EXTENSIONS: SupportedFileType[] = ['csv', 'xlsx', 'json', 'txt'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const workspaceId = (formData.get('workspaceId') as string) || 'default-workspace';
    const datasetName = (formData.get('name') as string) || undefined;
    const description = (formData.get('description') as string) || undefined;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in form data.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 250 MB limit.`,
        },
        { status: 413 }
      );
    }

    const filename = file.name || 'dataset.csv';
    const ext = filename.split('.').pop()?.toLowerCase() as SupportedFileType;

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format ".${ext}". Supported formats are: CSV, XLSX, JSON, TXT.`,
        },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await ingestDatasetFile({
      workspaceId,
      datasetName,
      description,
      originalFilename: filename,
      extension: ext,
      mimeType: file.type || 'application/octet-stream',
      fileBuffer: buffer,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errorMessage || 'Dataset processing failed.',
          datasetId: result.datasetId,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        datasetId: result.datasetId,
        fileId: result.fileId,
        status: result.status,
        dataset: result.dataset,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal server error during ingestion';
    console.error('Upload route error:', err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
