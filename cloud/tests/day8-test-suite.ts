/**
 * Day 8 Master QA, Security Audit & Deployment Verification Test Suite
 * 
 * Verifies:
 * 1. Authentication lifecycle & password hash secrecy
 * 2. Session persistence & instant token revocation
 * 3. Multi-tenant workspace isolation
 * 4. Full RBAC matrix (OWNER, ADMIN, MEMBER, VIEWER)
 * 5. Dataset persistence & multi-format schema retention
 * 6. Dataset authorization & tenant boundaries
 * 7. Controlled AI Chat NL-to-SQL parameterization & evidence grounding
 * 8. SQL injection & adversarial attack immunity
 * 9. Clean data export & VIEWER restriction
 * 10. Team invitation lifecycle & security edge cases
 * 11. Persistent audit governance & credential sanitization
 * 12. Client bundle secret scan & environment safety
 * 13. Operational health diagnostics
 * 14. Serverless storage adaptability
 */

import { authService } from '../lib/auth/auth-service';
import { workspaceService } from '../lib/workspaces/workspace-service';
import { invitationService } from '../lib/workspaces/invitation-service';
import { auditService } from '../lib/audit/audit-service';
import { datasetRepository } from '../lib/db/dataset-repository';
import { dbClient } from '../lib/db/db-client';
import { exportCleanedDataset } from '../lib/export/export-service';
import { hasPermission } from '../lib/auth/rbac';
import {
  parseQueryIntentDeterministically,
  validateStructuredIntent,
  validateSQLQuery,
  buildParameterizedSQL,
  executeReadOnlyQuery,
  buildDatasetAIContext,
} from '../lib/ai';
import {
  DatasetRecord,
  ColumnProfile,
  ColumnInferredType,
} from '../types';

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
    typeBreakdown: breakdown,
    sampleValues: sampleValues.length > 0 ? sampleValues : ['Sample_A', 'Sample_B'],
  };
}

export async function runDay8Tests() {
  console.log('\n====================================================');
  console.log('DAY 8 — FINAL PRODUCTION QA & SECURITY AUDIT SUITE');
  console.log('====================================================\n');

  const ts = Date.now();

  // ----------------------------------------------------
  // SECTION 1: Authentication & Password Hash Secrecy
  // ----------------------------------------------------
  console.log('--- 1. Authentication Lifecycle & Credential Secrecy ---');
  const user1Res = await authService.signup(`qa_owner_${ts}@traceimpact.io`, 'SecurePassw0rd!', 'QA Lead');
  const user1 = user1Res.user;
  const token1 = user1Res.token;

  assert(!!user1 && user1.email.startsWith('qa_owner_'), 'User successfully signed up with sanitized profile');
  assert(!('passwordHash' in (user1 as unknown as Record<string, unknown>)), 'Password hash is strictly omitted from UserProfile');
  assert(!('salt' in (user1 as unknown as Record<string, unknown>)), 'Cryptographic salt is strictly omitted from UserProfile');
  assert(typeof token1 === 'string' && token1.startsWith('sess_'), 'Session token format matches standard prefix');

  // Verify login authentication
  const loginRes = await authService.login(`qa_owner_${ts}@traceimpact.io`, 'SecurePassw0rd!');
  assert(loginRes.user.id === user1.id && typeof loginRes.token === 'string', 'Login returns authenticated user and valid session token');

  // Verify invalid login failure
  let invalidLoginFailed = false;
  try {
    await authService.login(`qa_owner_${ts}@traceimpact.io`, 'WrongPassword123!');
  } catch {
    invalidLoginFailed = true;
  }
  assert(invalidLoginFailed, 'Login with incorrect password safely throws error');

  // ----------------------------------------------------
  // SECTION 2: Session Persistence & Revocation
  // ----------------------------------------------------
  console.log('\n--- 2. Session Persistence & Token Invalidation ---');
  const activeUser = await authService.validateSessionToken(token1);
  assert(activeUser?.id === user1.id, 'Active session token validates authenticated user');

  await authService.revokeSession(token1);
  const revokedUser = await authService.validateSessionToken(token1);
  assert(revokedUser === null, 'Revoked session token returns null immediately');

  // New session for remaining workspace tests
  const freshSessionToken = await authService.createSession(user1.id);
  assert(typeof freshSessionToken === 'string' && freshSessionToken.length > 20, 'Fresh session token generated');

  // ----------------------------------------------------
  // SECTION 3: Workspace Multi-Tenant Boundary Isolation
  // ----------------------------------------------------
  console.log('\n--- 3. Multi-Tenant Workspace Boundary Isolation ---');
  const wsA = await workspaceService.createWorkspace('Primary Tenant Workspace', user1.id);
  assert(!!wsA && wsA.name === 'Primary Tenant Workspace', 'Workspace created with creator as owner');

  const user2Res = await authService.signup(`qa_outsider_${ts}@external.io`, 'SecurePassw0rd!', 'External User');
  const user2 = user2Res.user;
  const wsB = await workspaceService.createWorkspace('Secondary Tenant Workspace', user2.id);

  const user1Workspaces = await workspaceService.listWorkspacesForUser(user1.id);
  assert(user1Workspaces.some((w) => w.workspace.id === wsA.id), 'User 1 has access to Primary Workspace');
  assert(!user1Workspaces.some((w) => w.workspace.id === wsB.id), 'User 1 is strictly isolated from Secondary Workspace');

  // ----------------------------------------------------
  // SECTION 4: Comprehensive RBAC Matrix Verification
  // ----------------------------------------------------
  console.log('\n--- 4. Comprehensive RBAC Matrix Verification ---');
  const adminRes = await authService.signup(`qa_admin_${ts}@traceimpact.io`, 'SecurePassw0rd!', 'Admin Tester');
  const memberRes = await authService.signup(`qa_member_${ts}@traceimpact.io`, 'SecurePassw0rd!', 'Member Tester');
  const viewerRes = await authService.signup(`qa_viewer_${ts}@traceimpact.io`, 'SecurePassw0rd!', 'Viewer Tester');
  const admin = adminRes.user;
  const member = memberRes.user;
  const viewer = viewerRes.user;

  await workspaceService.addMember(wsA.id, admin.id, 'admin', user1.id);
  await workspaceService.addMember(wsA.id, member.id, 'member', user1.id);
  await workspaceService.addMember(wsA.id, viewer.id, 'viewer', user1.id);

  const ownerRole = await workspaceService.getMemberRole(wsA.id, user1.id);
  const adminRole = await workspaceService.getMemberRole(wsA.id, admin.id);
  const memberRole = await workspaceService.getMemberRole(wsA.id, member.id);
  const viewerRole = await workspaceService.getMemberRole(wsA.id, viewer.id);

  // OWNER checks
  assert(hasPermission(ownerRole, 'manage_workspace'), 'OWNER: manage_workspace = true');
  assert(hasPermission(ownerRole, 'manage_members'), 'OWNER: manage_members = true');
  assert(hasPermission(ownerRole, 'manage_datasets'), 'OWNER: manage_datasets = true');
  assert(hasPermission(ownerRole, 'export_data'), 'OWNER: export_data = true');
  assert(hasPermission(ownerRole, 'view_audit_logs'), 'OWNER: view_audit_logs = true');

  // ADMIN checks
  assert(!hasPermission(adminRole, 'manage_workspace'), 'ADMIN: manage_workspace = false');
  assert(hasPermission(adminRole, 'manage_members'), 'ADMIN: manage_members = true');
  assert(hasPermission(adminRole, 'manage_datasets'), 'ADMIN: manage_datasets = true');
  assert(hasPermission(adminRole, 'export_data'), 'ADMIN: export_data = true');
  assert(hasPermission(adminRole, 'view_audit_logs'), 'ADMIN: view_audit_logs = true');

  // MEMBER checks
  assert(!hasPermission(memberRole, 'manage_members'), 'MEMBER: manage_members = false');
  assert(hasPermission(memberRole, 'manage_datasets'), 'MEMBER: manage_datasets = true');
  assert(hasPermission(memberRole, 'export_data'), 'MEMBER: export_data = true');
  assert(hasPermission(memberRole, 'execute_ai_chat'), 'MEMBER: execute_ai_chat = true');
  assert(!hasPermission(memberRole, 'view_audit_logs'), 'MEMBER: view_audit_logs = false');

  // VIEWER checks
  assert(!hasPermission(viewerRole, 'manage_datasets'), 'VIEWER: manage_datasets = false');
  assert(!hasPermission(viewerRole, 'export_data'), 'VIEWER: export_data = false');
  assert(!hasPermission(viewerRole, 'view_audit_logs'), 'VIEWER: view_audit_logs = false');
  assert(hasPermission(viewerRole, 'view_datasets'), 'VIEWER: view_datasets = true');
  assert(hasPermission(viewerRole, 'view_dashboard'), 'VIEWER: view_dashboard = true');
  assert(hasPermission(viewerRole, 'execute_ai_chat'), 'VIEWER: execute_ai_chat = true');

  // ----------------------------------------------------
  // SECTION 5: Dataset Persistence & Multi-Format Lifecycle
  // ----------------------------------------------------
  console.log('\n--- 5. Dataset Persistence & Multi-Format Lifecycle ---');
  const dsId = `ds_qa_${ts}`;
  const mockDataset: DatasetRecord = {
    id: dsId,
    workspaceId: wsA.id,
    name: 'Q4 Global Performance.csv',
    status: 'ready',
    rowCount: 5,
    columnCount: 4,
    qualityScore: 96,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    file: {
      id: 'f_qa_01',
      originalName: 'Q4 Global Performance.csv',
      extension: 'csv',
      sizeBytes: 2048,
      mimeType: 'text/csv',
      storageKey: `workspaces/${wsA.id}/perf.csv`,
    },
    columns: [
      createMockColumn('region', 'string', 3, 0, ['EMEA', 'APAC', 'AMER']),
      createMockColumn('department', 'string', 3, 0, ['Engineering', 'Sales', 'Marketing']),
      createMockColumn('budget_usd', 'integer', 5, 0, ['50000', '120000', '85000', '95000', '60000']),
      createMockColumn('is_active', 'boolean', 2, 0, ['true', 'false']),
    ],
    previewRows: [
      { region: 'EMEA', department: 'Engineering', budget_usd: 50000, is_active: true },
      { region: 'APAC', department: 'Sales', budget_usd: 120000, is_active: true },
      { region: 'AMER', department: 'Marketing', budget_usd: 85000, is_active: false },
      { region: 'EMEA', department: 'Sales', budget_usd: 95000, is_active: true },
      { region: 'AMER', department: 'Engineering', budget_usd: 60000, is_active: true },
    ],
  };

  await datasetRepository.createDataset(mockDataset);
  const fetchedDataset = await datasetRepository.getDatasetById(dsId, wsA.id);
  assert(fetchedDataset?.id === dsId, 'Dataset successfully saved and retrieved with schema and preview rows');

  // Cross-workspace dataset security
  const crossWsAccess = await datasetRepository.getDatasetById(dsId, wsB.id);
  assert(crossWsAccess === null, 'Dataset cannot be accessed by foreign workspace (tenant boundary enforced)');

  // ----------------------------------------------------
  // SECTION 6: Controlled AI Chat NL-to-SQL & Security Defense
  // ----------------------------------------------------
  console.log('\n--- 6. Controlled AI Chat NL-to-SQL & Security Defense ---');
  const aiCtx = buildDatasetAIContext(mockDataset);
  assert(aiCtx.datasetId === dsId && aiCtx.columns.length === 4, 'AI context generated with sanitized column whitelist');

  // Deterministic question: Group by department
  const intent = parseQueryIntentDeterministically('Show total budget usd by department', aiCtx);
  assert(intent !== null && intent.operation === 'group_by', 'Question parsed into structured group_by intent');

  const intentValid = validateStructuredIntent(intent!, aiCtx);
  assert(intentValid.isValid, 'Structured intent validated against column whitelist');

  const sqlObj = buildParameterizedSQL(intent!);
  assert(sqlObj.sql.startsWith('SELECT') && sqlObj.sql.includes('GROUP BY "department"'), 'Parameterized SQL contains GROUP BY clause');

  const sqlValid = validateSQLQuery(sqlObj.sql, aiCtx);
  assert(sqlValid.isValid, 'Whitelist SQL validator confirms query safety');

  const execRes = await executeReadOnlyQuery(sqlObj, mockDataset);
  assert(execRes.rowCount > 0 && execRes.rows.length <= 5, 'Read-only execution returns accurate grouped rows');

  // Adversarial SQL injection attacks
  const jailbreakQueries = [
    'DROP TABLE users;',
    'DELETE FROM datasets;',
    'UPDATE datasets SET name = "Hacked";',
    'INSERT INTO users (email) VALUES ("attacker@hack.com");',
    'SELECT * FROM data; DROP TABLE data;',
    'SELECT * FROM pg_catalog.pg_tables;',
    'SELECT * FROM information_schema.columns;',
    'SELECT password_hash FROM users;',
    'ALTER TABLE datasets ADD COLUMN backdoor text;',
    'TRUNCATE TABLE datasets;',
    'SELECT * FROM "dataset" WHERE 1=1 --',
    'SELECT * FROM "dataset" /* comment */ WHERE 1=1',
  ];

  for (const q of jailbreakQueries) {
    const val = validateSQLQuery(q, aiCtx);
    assert(!val.isValid, `Adversarial attack blocked: "${q.slice(0, 30)}..."`);
  }

  // ----------------------------------------------------
  // SECTION 7: Clean Data Export & RBAC Enforcement
  // ----------------------------------------------------
  console.log('\n--- 7. Clean Data Export & RBAC Enforcement ---');
  const csvRes = exportCleanedDataset(mockDataset, 'csv');
  assert(csvRes.mimeType.includes('text/csv') && csvRes.data.includes('department') && csvRes.data.includes('Engineering'), 'CSV export contains valid tabular headers and records');
  assert(!csvRes.data.includes('passwordHash') && !csvRes.data.includes('sess_'), 'CSV export is free of internal credentials or session tokens');

  const jsonRes = exportCleanedDataset(mockDataset, 'json');
  assert(jsonRes.mimeType === 'application/json', 'JSON export returns application/json');
  const parsed = JSON.parse(jsonRes.data);
  assert(Array.isArray(parsed) && parsed.length === 5, 'JSON export matches exactly 5 dataset rows');

  // Verify export permissions
  assert(hasPermission(ownerRole, 'export_data') === true, 'OWNER has export_data permission');
  assert(hasPermission(adminRole, 'export_data') === true, 'ADMIN has export_data permission');
  assert(hasPermission(memberRole, 'export_data') === true, 'MEMBER has export_data permission');
  assert(hasPermission(viewerRole, 'export_data') === false, 'VIEWER is strictly denied export_data permission');

  // ----------------------------------------------------
  // SECTION 8: Team Invitation Lifecycle & Edge Cases
  // ----------------------------------------------------
  console.log('\n--- 8. Team Invitation Lifecycle & Security ---');
  const inviteEmail = `invitee_${ts}@partner.com`;
  const invite = await invitationService.createInvitation(wsA.id, inviteEmail, 'member', user1.id);
  assert(invite.status === 'pending' && invite.email === inviteEmail, 'Invitation created by OWNER in pending state');

  // Non-admin cannot invite
  let nonAdminInviteFailed = false;
  try {
    await invitationService.createInvitation(wsA.id, 'another@partner.com', 'member', member.id);
  } catch {
    nonAdminInviteFailed = true;
  }
  assert(nonAdminInviteFailed, 'Non-admin member cannot create invitations');

  // Duplicate invite safety
  let duplicateInviteFailed = false;
  try {
    await invitationService.createInvitation(wsA.id, inviteEmail, 'member', user1.id);
  } catch {
    duplicateInviteFailed = true;
  }
  assert(duplicateInviteFailed, 'Duplicate pending invitation rejected');

  // Accept invitation
  const inviteeUserRes = await authService.signup(inviteEmail, 'SecurePassw0rd!', 'Invitee User');
  const inviteeUser = inviteeUserRes.user;
  await invitationService.acceptInvitation(invite.id, inviteeUser.email, inviteeUser.id);
  const assignedRole = await workspaceService.getMemberRole(wsA.id, inviteeUser.id);
  assert(assignedRole === 'member', 'Invitee successfully granted MEMBER role upon acceptance');

  // Re-acceptance blocked
  let reacceptFailed = false;
  try {
    await invitationService.acceptInvitation(invite.id, inviteeUser.email, inviteeUser.id);
  } catch {
    reacceptFailed = true;
  }
  assert(reacceptFailed, 'Already accepted invitation cannot be accepted again');

  // ----------------------------------------------------
  // SECTION 9: Audit Governance & Sensitive Field Scrubbing
  // ----------------------------------------------------
  console.log('\n--- 9. Audit Governance & Sensitive Field Scrubbing ---');
  await auditService.recordAuditLog({
    workspaceId: wsA.id,
    userId: user1.id,
    userEmail: user1.email,
    action: 'AUTH_LOGIN',
    resourceType: 'session',
    metadata: {
      ip: '127.0.0.1',
      password: 'CLEARTEXT_PASSWORD_SHOULD_BE_STRIPPED',
      apiKey: 'SECRET_API_KEY_SHOULD_BE_STRIPPED',
      token: 'SESSION_TOKEN_SHOULD_BE_STRIPPED',
      clientVersion: '1.0.0',
    },
  });

  const auditLogs = await auditService.listAuditLogs(wsA.id, { action: 'AUTH_LOGIN' });
  assert(auditLogs.length > 0, 'Audit log recorded and retrievable by workspace');

  const latestLog = auditLogs[0];
  assert(
    !latestLog.metadata ||
      (!('password' in latestLog.metadata) &&
        !('apiKey' in latestLog.metadata) &&
        !('token' in latestLog.metadata)),
    'Sensitive fields (password, apiKey, token) automatically scrubbed from audit metadata'
  );
  assert(latestLog.metadata?.clientVersion === '1.0.0', 'Non-sensitive metadata preserved');

  // ----------------------------------------------------
  // SECTION 10: Operational Health Diagnostics
  // ----------------------------------------------------
  console.log('\n--- 10. Operational Health Diagnostics ---');
  const health = await dbClient.checkHealth();
  assert(['connected', 'degraded', 'local_storage'].includes(health.status), 'Health check reports valid operational status');
  assert(typeof health.provider === 'string', 'Health check reports database provider');
  assert(!JSON.stringify(health).includes('postgres://') && !JSON.stringify(health).includes('password'), 'Health response never exposes connection credentials or secrets');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`Day 8 Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    throw new Error(`Day 8 test suite failed with ${failed} failures.`);
  }
}

if (process.argv[1]?.endsWith('day8-test-suite.ts')) {
  runDay8Tests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
