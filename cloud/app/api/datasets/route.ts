import { NextRequest, NextResponse } from 'next/server';
import { datasetRepository } from '@/lib/db/dataset-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    const datasets = await datasetRepository.listDatasetsByWorkspace(workspaceId);

    return NextResponse.json({
      success: true,
      datasets,
      totalCount: datasets.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve datasets';
    console.error('List datasets error:', err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
