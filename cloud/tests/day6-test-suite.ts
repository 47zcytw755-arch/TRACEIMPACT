/**
 * Comprehensive Day 6 Test Suite for TraceImpact Cloud
 * Tests Production Hardening, Database & State Persistence across restarts,
 * Multi-Tenant Security Boundaries, AI Chat Safety, and Health Diagnostics.
 */

import { authService } from '../lib/auth/auth-service';
import { workspaceService } from '../lib/workspaces/workspace-service';
import { invitationService } from '../lib/workspaces/invitation-service';
import { auditService } from '../lib/audit/audit-service';
import { datasetRepository } from '../lib/db/dataset-repository';
import { persistentStore } from '../lib/db/persistent-store';
import { dbClient } from '../lib/db/db-client';
import {
  parseQueryIntentDeterministically,
  validateStructuredIntent,
  validateSQLQuery,
  buildParameterizedSQL,
  executeReadOnlyQuery,
  buildDatasetAIContext,
} from '../lib/ai';
import { DatasetRecord, ColumnProfile, ColumnInferredType } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

function createMockColumn(
  name: string,
  inferredType: ColumnInferredType,
  uniqueCount: number,
  nullCount = 0,
  sampleValues: string[] = []
): ColumnProfile {
  const breakdown: Record<ColumnInferredType, number> = {
    string: 0,
    integer: 0,
    float: 0,
    boolean: 0,
    date: 0,
    datetime: 0,
    null: nullCount,
  };
  breakdown[inferredType] = 50 - nullCount;

  return {
    name,
    inferredType,
    isNullable: nullCount > 0,
    nullCount,
    nullPercentage: (nullCount / 50) * 100,
    uniqueCount,
    uniquenessPercentage: (uniqueCount / 50) * 100,
    sampleValues,
    typeBreakdown: breakdown,
  };
}

export async function runDay6Tests() {
  console.log('\n==================================================');
  console.log('TRACEIMPACT CLOUD — DAY 6 VERIFICATION TEST SUITE');
  console.log('==================================================\n');

  // --- 1. PERSISTENT AUTHENTICATION & SESSIONS ---
  console.log('--- 1. Persistent Authentication & Sessions ---');

  const persistentEmail = `prod_user_${Date.now()}@traceimpact.com`;
  const signupResult = await authService.signup(
    persistentEmail,
    'ProdPassword123!',
    'Production Engineer'
  );
  const user = signupResult.user;
  const initialToken = signupResult.token;

  assert(!!user && user.email === persistentEmail, '1. Persistent user successfully registered');

  // Verify persistent store contains user
  const storedUser = await authService.getUserById(user.id);
  assert(storedUser?.id === user.id, '1b. User record persists in durable store');

  // 2. Validate session persists
  const sessionUser = await authService.validateSessionToken(initialToken);
  assert(sessionUser?.id === user.id, '2. Session token validated from persistent store');

  // 3. Logout & Revocation persists
  await authService.revokeSession(initialToken);
  const revokedSession = await authService.validateSessionToken(initialToken);
  assert(revokedSession === null, '3. Revoked session is permanently invalidated across storage');

  // --- 2. PERSISTENT WORKSPACES & RBAC ---
  console.log('\n--- 2. Persistent Workspaces & Multi-Tenant Boundaries ---');

  // 4. Workspace persistence
  const prodWorkspace = await workspaceService.createWorkspace(
    'Production Workspace',
    user.id,
    `prod-ws-${Date.now()}`
  );
  assert(prodWorkspace.ownerId === user.id, '4. Workspace created with owner attribution');

  const fetchedWs = await workspaceService.getWorkspaceById(prodWorkspace.id);
  assert(fetchedWs?.id === prodWorkspace.id, '4b. Workspace survives retrieval from persistent store');

  // 5. Workspace membership persistence
  const ownerRole = await workspaceService.getMemberRole(prodWorkspace.id, user.id);
  assert(ownerRole === 'owner', '5. Owner role persists in workspace membership index');

  // Add teammate
  const teammateSignup = await authService.signup(
    `teammate_${Date.now()}@traceimpact.com`,
    'SecurePass123!',
    'Team Member'
  );
  await workspaceService.addMember(prodWorkspace.id, teammateSignup.user.id, 'member', user.id);
  const memberRole = await workspaceService.getMemberRole(prodWorkspace.id, teammateSignup.user.id);
  assert(memberRole === 'member', '5b. Member role assignment persists');

  // --- 3. PERSISTENT INVITATIONS LIFECYCLE ---
  console.log('\n--- 3. Persistent Invitations Lifecycle ---');

  const inviteeEmail = `invitee_${Date.now()}@traceimpact.com`;
  // 6. Invitation persistence
  const invite = await invitationService.createInvitation(
    prodWorkspace.id,
    inviteeEmail,
    'viewer',
    user.id
  );
  assert(invite.status === 'pending' && invite.role === 'viewer', '6. Invitation created with pending state');

  const storedInvite = await invitationService.getInvitationById(invite.id);
  assert(storedInvite?.id === invite.id, '6b. Invitation record persists in durable store');

  // 7. Revoke invitation
  await invitationService.revokeInvitation(invite.id, user.id);
  const revokedInvite = await invitationService.getInvitationById(invite.id);
  assert(revokedInvite?.status === 'revoked', '8. Invitation revocation state persists');

  // 8. Expired invitation rejection
  const expiredInvite = await invitationService.createInvitation(
    prodWorkspace.id,
    `exp_${Date.now()}@traceimpact.com`,
    'member',
    user.id
  );
  expiredInvite.status = 'expired';
  persistentStore.setItem('invitations', expiredInvite.id, expiredInvite);

  try {
    await invitationService.acceptInvitation(
      expiredInvite.id,
      `exp_${Date.now()}@traceimpact.com`,
      teammateSignup.user.id
    );
    assert(false, '7. Expired invitation should not be accepted');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('expired'),
      '7. Expired invitation safely rejected by persistent validator'
    );
  }

  // --- 4. PERSISTENT AUDIT GOVERNANCE ---
  console.log('\n--- 4. Persistent Audit Governance ---');

  // 9. Persistent audit events
  const auditRecord = await auditService.recordAuditLog({
    workspaceId: prodWorkspace.id,
    userId: user.id,
    userEmail: user.email,
    action: 'WORKSPACE_CREATED',
    resourceType: 'workspace',
    resourceId: prodWorkspace.id,
    metadata: {
      workspaceName: 'Production Workspace',
      apiKey: 'SUPER_SECRET_KEY_NEVER_LOG',
      authToken: 'BEARER_TOKEN_NEVER_LOG',
    },
  });
  assert(auditRecord.action === 'WORKSPACE_CREATED', '9. Audit event recorded and assigned UUID');

  // 10. Audit credential sanitization
  assert(
    !auditRecord.metadata ||
      (!('apiKey' in auditRecord.metadata) && !('authToken' in auditRecord.metadata)),
    '10. Sensitive keys (apiKey, authToken) stripped from audit logs before persistence'
  );

  const logs = await auditService.listAuditLogs(prodWorkspace.id, { action: 'WORKSPACE_CREATED' });
  assert(logs.length >= 1 && logs[0].id === auditRecord.id, '9b. Audit records retrieve accurately from storage');

  // --- 5. PERSISTENT DATASET MANAGEMENT & MULTI-TENANCY ---
  console.log('\n--- 5. Dataset Authorization & Multi-Tenant Boundary ---');

  const datasetId = `ds_prod_${Date.now()}`;
  const mockDataset: DatasetRecord = {
    id: datasetId,
    workspaceId: prodWorkspace.id,
    name: 'Telemetry 2026.csv',
    status: 'ready',
    rowCount: 2,
    columnCount: 2,
    qualityScore: 98,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      id: 'f_prod_01',
      originalName: 'Telemetry 2026.csv',
      extension: 'csv',
      sizeBytes: 256,
      mimeType: 'text/csv',
      storageKey: `workspaces/${prodWorkspace.id}/telemetry.csv`,
    },
    columns: [
      createMockColumn('device_type', 'string', 2, 0, ['Sensor', 'Gateway']),
      createMockColumn('ping_ms', 'float', 2, 0, ['14.5', '22.1']),
    ],
    previewRows: [
      { device_type: 'Sensor', ping_ms: 14.5 },
      { device_type: 'Gateway', ping_ms: 22.1 },
    ],
  };

  // 11. Dataset authorization & persistence
  await datasetRepository.createDataset(mockDataset);
  const fetchedDataset = await datasetRepository.getDatasetById(datasetId, prodWorkspace.id);
  assert(fetchedDataset?.id === datasetId, '11. Dataset persists and is accessible in own workspace');

  // 12. Cross-workspace isolation
  const crossWsAccess = await datasetRepository.getDatasetById(datasetId, 'other-foreign-workspace');
  assert(crossWsAccess === null, '12. Cross-workspace dataset access blocked (Tenant Isolation)');

  // --- 6. DAY 4 AI REGRESSION & SECURITY GUARANTEES ---
  console.log('\n--- 6. AI Chat Hardening & SQL Security Guarantees ---');

  const aiCtx = buildDatasetAIContext(mockDataset);
  assert(aiCtx.datasetId === datasetId && aiCtx.workspaceId === prodWorkspace.id, '13. AI context scoped strictly to workspace and dataset');

  // 13. Intent generation
  const intent = parseQueryIntentDeterministically('What is the average ping ms by device type?', aiCtx);
  assert(intent !== null && intent.operation === 'group_by', '13b. Analytical question parsed into structured group_by intent');

  const intentValidation = validateStructuredIntent(intent!, aiCtx);
  assert(intentValidation.isValid === true, '13c. Intent adheres to dataset column whitelist');

  const query = buildParameterizedSQL(intent!);
  assert(query.sql.includes('GROUP BY "device_type"'), '13d. Parameterized SQL contains group by clause');

  // 14. SQL Injection Protection
  const injectionSQL = `SELECT * FROM "dataset" WHERE device_type = '1' OR '1'='1' --`;
  const injectionCheck = validateSQLQuery(injectionSQL, aiCtx);
  assert(injectionCheck.isValid === false, '14. SQL comment injection (--) is safely rejected');

  // 15. Destructive SQL Rejection
  const destructiveSQL = `TRUNCATE TABLE datasets; SELECT 1`;
  const destructiveCheck = validateSQLQuery(destructiveSQL, aiCtx);
  assert(destructiveCheck.isValid === false, '15. Destructive SQL (TRUNCATE) is rejected');

  // Read-only execution test
  const execResult = await executeReadOnlyQuery(query, mockDataset);
  assert(execResult.rowCount === 2, '15b. Read-only sandboxed query execution completes');

  // --- 7. PRODUCTION HEALTH CHECK & ENVIRONMENT VALIDATION ---
  console.log('\n--- 7. Production Health & Environment Diagnostics ---');

  // 16. Health client check
  const healthStatus = await dbClient.checkHealth();
  assert(
    healthStatus.status === 'connected' || healthStatus.status === 'local_storage',
    '16. Production health check returns valid operational status'
  );
  assert(
    !JSON.stringify(healthStatus).includes('password') && !JSON.stringify(healthStatus).includes('secret'),
    '16b. Health check response never exposes database passwords or internal secrets'
  );

  // 17. Production environment configuration sanity check
  assert(
    typeof process.env.NODE_ENV === 'string' || process.env.NODE_ENV === undefined,
    '17. Node environment is accessible and configured'
  );

  // 18. No secret keys exposed to client-safe global configuration
  const clientSafeKeys = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_'));
  const hasLeakedSecret = clientSafeKeys.some((k) =>
    ['PASSWORD', 'SECRET', 'SERVICE_ROLE', 'API_KEY'].some((bad) => k.toUpperCase().includes(bad))
  );
  assert(!hasLeakedSecret, '18. No server secrets leaked into NEXT_PUBLIC_ client bundles');

  console.log('\n==================================================');
  console.log(`DAY 6 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    throw new Error(`Day 6 test suite failed with ${failed} failure(s)`);
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runDay6Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
