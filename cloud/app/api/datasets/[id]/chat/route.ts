import { NextRequest, NextResponse } from 'next/server';
import { datasetRepository } from '@/lib/db/dataset-repository';
import { getAuthenticatedUser } from '@/lib/auth';
import { workspaceService } from '@/lib/workspaces';
import { hasPermission } from '@/lib/auth/rbac';
import { auditService } from '@/lib/audit';
import {
  buildDatasetAIContext,
  validateStructuredIntent,
  buildParameterizedSQL,
  validateSQLQuery,
  executeReadOnlyQuery,
  generateEvidenceGroundedAnswer,
  getAIProvider,
} from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    const body = await request.json();
    const userMessage = body.message?.trim();

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: 'Question message cannot be empty.' },
        { status: 400 }
      );
    }

    // 1. Authenticate user & verify workspace membership
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await workspaceService.getMemberRole(workspaceId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You are not a member of this workspace.' },
        { status: 404 }
      );
    }

    if (!hasPermission(userRole, 'execute_ai_chat')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to execute AI queries.' },
        { status: 403 }
      );
    }

    // 2. Validate Dataset Existence & Multi-Tenant Boundaries
    const dataset = await datasetRepository.getDatasetById(id, workspaceId);

    if (!dataset) {
      return NextResponse.json(
        { success: false, error: 'Dataset not found or access denied for this workspace.' },
        { status: 404 }
      );
    }

    if (dataset.status !== 'ready') {
      return NextResponse.json(
        {
          success: false,
          error: `Dataset is currently "${dataset.status}". AI querying requires a ready dataset.`,
        },
        { status: 400 }
      );
    }

    // 3. Build Isolated Context
    const aiContext = buildDatasetAIContext(dataset);
    const provider = getAIProvider();

    // 4. Generate Structured Intent
    const intent = await provider.generateQueryIntent(userMessage, aiContext);

    // 5. Validate Structured Intent against trusted schema
    const intentValidation = validateStructuredIntent(intent, aiContext);
    if (!intentValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `Query intent rejected: ${intentValidation.errors.join('; ')}`,
        },
        { status: 400 }
      );
    }

    // 6. Build Parameterized SQL
    const generatedSQL = buildParameterizedSQL(intent);

    // 7. Validate SQL with Security Validator
    const sqlValidation = validateSQLQuery(generatedSQL.sql, aiContext);
    if (!sqlValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: `SQL validation failed: ${sqlValidation.errors.join('; ')}`,
        },
        { status: 400 }
      );
    }

    // 8. Execute in Read-Only Sandbox
    const queryResult = await executeReadOnlyQuery(generatedSQL, dataset);

    // 9. Generate Evidence-Grounded Answer and Visualization
    const { answer, visualization } = generateEvidenceGroundedAnswer(
      userMessage,
      intent,
      queryResult,
      aiContext
    );

    // 10. Record AI Query in Audit Log
    await auditService.recordAuditLog({
      workspaceId,
      userId: user.id,
      userEmail: user.email,
      action: 'AI_QUERY_EXECUTED',
      resourceType: 'dataset',
      resourceId: dataset.id,
      metadata: {
        operation: intent.operation,
        executionTimeMs: queryResult.executionTimeMs,
        rowCount: queryResult.rowCount,
      },
    });

    return NextResponse.json({
      success: true,
      answer,
      query: {
        intent,
        sql: generatedSQL.sql,
        parameters: generatedSQL.parameters,
      },
      result: {
        columns: queryResult.columns,
        rows: queryResult.rows,
        rowCount: queryResult.rowCount,
      },
      visualization,
      metadata: {
        executionTimeMs: queryResult.executionTimeMs,
        evidenceRowsCount: queryResult.rowCount,
        provider: provider.name,
        model: 'v1-controlled-sql',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal AI query processing error';
    console.error('AI Chat Error:', err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
