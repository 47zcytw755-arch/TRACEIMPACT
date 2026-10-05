import { NextRequest, NextResponse } from 'next/server';
import { datasetRepository } from '@/lib/db/dataset-repository';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    const dataset = await datasetRepository.getDatasetById(id, workspaceId);

    if (!dataset) {
      return NextResponse.json(
        { success: false, error: 'Dataset not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dataset,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve dataset';
    console.error('Get dataset error:', err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    const deleted = await datasetRepository.deleteDataset(id, workspaceId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Dataset not found or could not be deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully.',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to delete dataset';
    console.error('Delete dataset error:', err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
