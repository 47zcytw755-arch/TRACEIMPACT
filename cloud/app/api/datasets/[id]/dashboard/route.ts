import { NextRequest, NextResponse } from 'next/server';
import { datasetRepository } from '@/lib/db/dataset-repository';
import { generateDashboardConfig } from '@/lib/dashboard/dashboard-generator';

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

    if (dataset.status === 'processing') {
      return NextResponse.json(
        {
          success: false,
          error: 'Dataset is currently processing. Dashboard will be available once ingestion completes.',
          status: 'processing',
        },
        { status: 202 }
      );
    }

    if (dataset.status === 'failed') {
      return NextResponse.json(
        {
          success: false,
          error: dataset.errorMessage || 'Dataset processing failed.',
          status: 'failed',
        },
        { status: 422 }
      );
    }

    const dashboardConfig = generateDashboardConfig(dataset);

    return NextResponse.json({
      success: true,
      dashboard: dashboardConfig,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to generate dashboard';
    console.error('Dashboard generation error:', err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
