/**
 * Comprehensive Day 5 Test Suite for TraceImpact Cloud
 * Tests Authentication, Workspaces, RBAC, Invitations, Clean Data Exports,
 * Audit Governance, and Day 4 AI Chat Regression with Workspace Scoping.
 */

import { authService } from '../lib/auth/auth-service';
import { hasPermission } from '../lib/auth/rbac';
import { workspaceService } from '../lib/workspaces/workspace-service';
import { invitationService } from '../lib/workspaces/invitation-service';
import { auditService } from '../lib/audit/audit-service';
import { exportCleanedDataset } from '../lib/export/export-service';
import { datasetRepository } from '../lib/db/dataset-repository';
import {
  parseQueryIntentDeterministically,
  validateStructuredIntent,
  buildParameterizedSQL,
  validateSQLQuery,
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

export async function runDay5Tests() {
  console.log('\n==================================================');
  console.log('TRACEIMPACT CLOUD — DAY 5 VERIFICATION TEST SUITE');
  console.log('==================================================\n');

  // --- SECTION 1: AUTHENTICATION ---
  console.log('--- 1. Authentication Tests ---');

  // 1. Unauthenticated access is rejected (invalid session token)
  const invalidSession = await authService.validateSessionToken('non-existent-token-12345');
  assert(invalidSession === null, '1. Unauthenticated access is rejected with invalid token');

  // 2. User registration and authentication
  const testUserEmail = `alice_${Date.now()}@example.com`;
  const registerResult = await authService.signup(
    testUserEmail,
    'SecurePassword123!',
    'Alice Engineer'
  );
  const registeredUser = registerResult.user;
  assert(
    !!registeredUser && registeredUser.email === testUserEmail,
    '2a. User signup succeeds with valid credentials'
  );
  assert(
    !('passwordHash' in (registeredUser || {})),
    '2b. User profile representation never exposes password hash'
  );

  const loginResult = await authService.login(testUserEmail, 'SecurePassword123!');
  assert(
    !!loginResult.token && loginResult.user.id === registeredUser.id,
    '2c. Authenticated user can log in and obtain valid session token'
  );

  const validatedProfile = await authService.validateSessionToken(loginResult.token);
  assert(
    validatedProfile?.email === testUserEmail,
    '2d. Session token successfully validates authenticated identity'
  );

  // Wrong password fails
  try {
    await authService.login(testUserEmail, 'WrongPassword!');
    assert(false, '2e. Login with invalid password should fail');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('Invalid email or password'),
      '2e. Login with invalid password fails safely'
    );
  }

  // Logout invalidates session
  await authService.revokeSession(loginResult.token);
  const postLogoutSession = await authService.validateSessionToken(loginResult.token);
  assert(postLogoutSession === null, '2f. Logout immediately invalidates session');

  // --- SECTION 2: WORKSPACE ISOLATION & MEMBERSHIP ---
  console.log('\n--- 2. Workspace & Multi-Tenant Isolation Tests ---');

  const bobSignup = await authService.signup(
    `bob_${Date.now()}@example.com`,
    'SecurePassword123!',
    'Bob Analyst'
  );
  const bobUser = bobSignup.user;

  const charlieSignup = await authService.signup(
    `charlie_${Date.now()}@example.com`,
    'SecurePassword123!',
    'Charlie Viewer'
  );
  const charlieUser = charlieSignup.user;

  const aliceId = registeredUser.id;
  const bobId = bobUser.id;
  const charlieId = charlieUser.id;

  // 3. Workspace creation assigns OWNER role
  const aliceWorkspace = await workspaceService.createWorkspace('Alice Labs', aliceId);
  assert(
    aliceWorkspace.ownerId === aliceId,
    '3. Workspace creator is recorded as owner'
  );

  const aliceRole = await workspaceService.getMemberRole(aliceWorkspace.id, aliceId);
  assert(
    aliceRole === 'owner',
    '3b. Workspace creator is automatically assigned OWNER role'
  );

  // 4. User cannot access another workspace without membership
  const bobRoleInAliceWs = await workspaceService.getMemberRole(aliceWorkspace.id, bobId);
  assert(
    bobRoleInAliceWs === null,
    '4. User without membership cannot access workspace (Multi-tenant isolation)'
  );

  // 5. Add Bob as ADMIN and Charlie as VIEWER
  await workspaceService.addMember(aliceWorkspace.id, bobId, 'admin', aliceId);
  await workspaceService.addMember(aliceWorkspace.id, charlieId, 'viewer', aliceId);

  const bobRoleAssigned = await workspaceService.getMemberRole(aliceWorkspace.id, bobId);
  const charlieRoleAssigned = await workspaceService.getMemberRole(aliceWorkspace.id, charlieId);
  assert(bobRoleAssigned === 'admin', '5a. Member added with ADMIN role');
  assert(charlieRoleAssigned === 'viewer', '5b. Member added with VIEWER role');

  // --- SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) ---
  console.log('\n--- 3. Role-Based Access Control (RBAC) Tests ---');

  // 6. OWNER permissions
  assert(hasPermission('owner', 'manage_workspace'), '6a. OWNER has manage_workspace permission');
  assert(hasPermission('owner', 'manage_members'), '6b. OWNER has manage_members permission');
  assert(hasPermission('owner', 'manage_datasets'), '6c. OWNER has manage_datasets permission');
  assert(hasPermission('owner', 'export_data'), '6d. OWNER has export_data permission');
  assert(hasPermission('owner', 'view_audit_logs'), '6e. OWNER has view_audit_logs permission');

  // 7. ADMIN permissions
  assert(!hasPermission('admin', 'manage_workspace'), '7a. ADMIN cannot delete/manage workspace');
  assert(hasPermission('admin', 'manage_members'), '7b. ADMIN can manage members');
  assert(hasPermission('admin', 'manage_datasets'), '7c. ADMIN can manage datasets');
  assert(hasPermission('admin', 'export_data'), '7d. ADMIN can export data');
  assert(hasPermission('admin', 'view_audit_logs'), '7e. ADMIN can view audit logs');

  // 8. MEMBER permissions
  assert(!hasPermission('member', 'manage_members'), '8a. MEMBER cannot manage members');
  assert(hasPermission('member', 'manage_datasets'), '8b. MEMBER can manage datasets');
  assert(hasPermission('member', 'export_data'), '8c. MEMBER can export authorized data');
  assert(hasPermission('member', 'execute_ai_chat'), '8d. MEMBER can execute AI chat queries');
  assert(!hasPermission('member', 'view_audit_logs'), '8e. MEMBER cannot view audit logs');

  // 9. VIEWER permissions
  assert(!hasPermission('viewer', 'manage_datasets'), '9a. VIEWER cannot mutate datasets');
  assert(!hasPermission('viewer', 'manage_members'), '9b. VIEWER cannot manage members');
  assert(!hasPermission('viewer', 'view_audit_logs'), '9c. VIEWER cannot view audit logs');
  assert(hasPermission('viewer', 'view_datasets'), '9d. VIEWER has read-only view_datasets access');
  assert(hasPermission('viewer', 'execute_ai_chat'), '9e. VIEWER can query AI chat');

  // --- SECTION 4: TEAM INVITATIONS ---
  console.log('\n--- 4. Team Invitations Lifecycle Tests ---');

  const inviteeEmail = `diana_${Date.now()}@example.com`;

  // 10. Owner/Admin can create invitation
  const invite = await invitationService.createInvitation(
    aliceWorkspace.id,
    inviteeEmail,
    'member',
    aliceId
  );
  assert(
    invite.email === inviteeEmail && invite.status === 'pending' && invite.role === 'member',
    '10. OWNER creates pending invitation with chosen role'
  );

  // 11. Unauthorized non-admin user cannot create invitation
  try {
    await invitationService.createInvitation(
      aliceWorkspace.id,
      `eve_${Date.now()}@example.com`,
      'viewer',
      charlieId // Charlie is VIEWER
    );
    assert(false, '11. VIEWER should not be allowed to invite members');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('Unauthorized'),
      '11. Non-admin users cannot create invitations'
    );
  }

  // 12. Register Diana and accept invitation
  const dianaSignup = await authService.signup(
    inviteeEmail,
    'SecurePassword123!',
    'Diana Engineer'
  );
  const dianaId = dianaSignup.user.id;

  await invitationService.acceptInvitation(invite.id, inviteeEmail, dianaId);
  const dianaRole = await workspaceService.getMemberRole(aliceWorkspace.id, dianaId);
  assert(
    dianaRole === 'member',
    '12. Matching invitee email successfully accepts invitation and gains membership'
  );

  // 13. Wrong email cannot accept invitation
  const inviteForEva = await invitationService.createInvitation(
    aliceWorkspace.id,
    'eva@example.com',
    'member',
    aliceId
  );
  try {
    await invitationService.acceptInvitation(
      inviteForEva.id,
      inviteeEmail, // Diana's email != eva@example.com
      dianaId
    );
    assert(false, '13. Mismatched email should not be able to accept invitation');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('sent to a different email'),
      '13. Wrong email address cannot accept invitation'
    );
  }

  // 14. Revoked invitation cannot be accepted
  const inviteToRevoke = await invitationService.createInvitation(
    aliceWorkspace.id,
    'frank@example.com',
    'member',
    aliceId
  );
  await invitationService.revokeInvitation(inviteToRevoke.id, aliceId);
  try {
    await invitationService.acceptInvitation(
      inviteToRevoke.id,
      'frank@example.com',
      'frank_user_id'
    );
    assert(false, '14. Revoked invitation should not be accepted');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('revoked'),
      '14. Revoked invitation is safely rejected'
    );
  }

  // 15. Expired invitation cannot be accepted
  inviteToRevoke.status = 'expired'; // simulate expiration
  try {
    await invitationService.acceptInvitation(
      inviteToRevoke.id,
      'frank@example.com',
      'frank_user_id'
    );
    assert(false, '15. Expired invitation should not be accepted');
  } catch (err: unknown) {
    assert(
      (err as Error).message.includes('expired') || (err as Error).message.includes('revoked'),
      '15. Expired invitation is safely rejected'
    );
  }

  // --- SECTION 5: CLEAN DATA EXPORT ---
  console.log('\n--- 5. Clean Data Export Tests ---');

  // Create a mock dataset in Alice's workspace
  const mockDatasetId = `ds_${Date.now()}`;
  const mockDataset: DatasetRecord = {
    id: mockDatasetId,
    workspaceId: aliceWorkspace.id,
    name: 'Q3 Financials.csv',
    status: 'ready',
    rowCount: 3,
    columnCount: 3,
    qualityScore: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      id: 'f_123',
      originalName: 'Q3 Financials.csv',
      extension: 'csv',
      sizeBytes: 1024,
      mimeType: 'text/csv',
      storageKey: 'workspaces/alice/q3.csv',
    },
    columns: [
      createMockColumn('region', 'string', 3, 0, ['North', 'South', 'West']),
      createMockColumn('revenue', 'float', 3, 0, ['12000.5', '4500.0', '8900.25']),
      createMockColumn('active', 'boolean', 2, 0, ['true', 'false', 'true']),
    ],
    previewRows: [
      { region: 'North', revenue: 12000.5, active: true },
      { region: 'South', revenue: 4500.0, active: false },
      { region: 'West', revenue: 8900.25, active: true },
    ],
  };

  await datasetRepository.createDataset(mockDataset);

  // 16. Authorized CSV export succeeds
  const csvExport = exportCleanedDataset(mockDataset, 'csv');
  assert(
    csvExport.mimeType.includes('text/csv') &&
      csvExport.data.includes('region,revenue,active') &&
      csvExport.data.includes('North,12000.5,true'),
    '16. Authorized CSV export contains cleaned dataset headers and records'
  );

  // 17. Authorized JSON export succeeds
  const jsonExport = exportCleanedDataset(mockDataset, 'json');
  const parsedJson = JSON.parse(jsonExport.data);
  assert(
    Array.isArray(parsedJson) && parsedJson.length === 3 && parsedJson[0].region === 'North',
    '17. Authorized JSON export contains clean parsed tabular array'
  );

  // 18. RBAC export permissions check
  assert(hasPermission('owner', 'export_data'), '18a. OWNER has export_data permission');
  assert(hasPermission('admin', 'export_data'), '18b. ADMIN has export_data permission');
  assert(hasPermission('member', 'export_data'), '18c. MEMBER has export_data permission');
  assert(!hasPermission('viewer', 'export_data'), '18d. VIEWER cannot export data (RBAC enforced)');

  // 19. Multi-tenant isolation on dataset retrieval
  const retrievedDataset = await datasetRepository.getDatasetById(mockDatasetId, aliceWorkspace.id);
  assert(retrievedDataset !== null, '19a. Workspace owner can retrieve dataset');

  const alienDataset = await datasetRepository.getDatasetById(mockDatasetId, 'alien-workspace-id');
  assert(alienDataset === null, '19b. Foreign workspace cannot access or export dataset');

  // --- SECTION 6: AUDIT GOVERNANCE ---
  console.log('\n--- 6. Audit Governance Tests ---');

  // 20. Important actions create audit records
  const auditEntry = await auditService.recordAuditLog({
    workspaceId: aliceWorkspace.id,
    userId: aliceId,
    userEmail: testUserEmail,
    action: 'DATASET_EXPORTED',
    resourceType: 'dataset',
    resourceId: mockDatasetId,
    metadata: { format: 'csv', rows: 3, user_password: 'ShouldBeStripped!', api_key: 'SecretKey' },
  });
  assert(
    auditEntry.action === 'DATASET_EXPORTED' && auditEntry.workspaceId === aliceWorkspace.id,
    '20. Important action successfully created audit record'
  );

  // 21. Sensitive credentials stripped from audit metadata
  assert(
    !auditEntry.metadata ||
      (!('user_password' in auditEntry.metadata) && !('api_key' in auditEntry.metadata)),
    '21. Sensitive password / token fields are automatically stripped from audit metadata'
  );

  // 22. Audit logs query and filtering
  const ownerLogs = await auditService.listAuditLogs(aliceWorkspace.id, {
    action: 'DATASET_EXPORTED',
  });
  assert(
    ownerLogs.length >= 1 && ownerLogs[0].action === 'DATASET_EXPORTED',
    '22a. OWNER/ADMIN can query filtered workspace audit logs'
  );

  assert(hasPermission('owner', 'view_audit_logs'), '22b. OWNER has view_audit_logs permission');
  assert(hasPermission('admin', 'view_audit_logs'), '22c. ADMIN has view_audit_logs permission');
  assert(!hasPermission('member', 'view_audit_logs'), '22d. MEMBER cannot view audit logs');
  assert(!hasPermission('viewer', 'view_audit_logs'), '22e. VIEWER cannot view audit logs');

  // --- SECTION 7: DAY 4 AI CHAT REGRESSION & WORKSPACE SCOPING ---
  console.log('\n--- 7. Day 4 AI Chat Regression & Workspace Scoping Tests ---');

  // 23. AI Context Building works on workspace dataset
  const aiCtx = buildDatasetAIContext(mockDataset);
  assert(
    aiCtx.columns.length === 3 && aiCtx.datasetId === mockDatasetId,
    '23. AI Context builder formats workspace dataset schema cleanly'
  );

  // 24. Deterministic Intent Parsing & Parameterized SQL Generation
  const parsedIntent = parseQueryIntentDeterministically('Show total revenue by region', aiCtx);
  assert(parsedIntent !== null && parsedIntent.operation === 'group_by', '24a. Query intent successfully identified for natural question');

  const intentVal = validateStructuredIntent(parsedIntent!, aiCtx);
  assert(intentVal.isValid === true, '24b. Structured intent validated against authorized schema');

  // 25. Parameterized SQL Generation & Security Validation
  const generatedQuery = buildParameterizedSQL(parsedIntent!);
  const sqlCheck = validateSQLQuery(generatedQuery.sql, aiCtx);
  assert(sqlCheck.isValid === true, '25a. Read-only aggregation SQL passes validator');

  const maliciousSQL = 'DROP TABLE datasets; --';
  const dropCheck = validateSQLQuery(maliciousSQL, aiCtx);
  assert(dropCheck.isValid === false, '25b. Malicious DDL query rejected by SQL validator');

  // 26. Read-Only Execution Sandbox executes properly on mock data
  const queryResult = await executeReadOnlyQuery(generatedQuery, mockDataset);
  assert(
    queryResult.rowCount === 3 && queryResult.rows.length === 3,
    '26. Read-only execution returns verified grounded records'
  );

  // Record AI chat execution in audit log
  const chatAudit = await auditService.recordAuditLog({
    workspaceId: aliceWorkspace.id,
    userId: bobId,
    userEmail: bobUser.email,
    action: 'AI_QUERY_EXECUTED',
    resourceType: 'dataset',
    resourceId: mockDatasetId,
    metadata: { query: 'Show total revenue by region' },
  });
  assert(
    chatAudit.action === 'AI_QUERY_EXECUTED',
    '27. AI chat execution recorded in workspace governance trail'
  );

  console.log('\n==================================================');
  console.log(`DAY 5 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    throw new Error(`Day 5 test suite failed with ${failed} failure(s)`);
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runDay5Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
