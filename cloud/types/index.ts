export type SupportedFileType = 'csv' | 'xlsx' | 'json' | 'txt';

export type ColumnInferredType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'null';

export interface DatasetFile {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: SupportedFileType;
  storageKey?: string;
  lastModified?: number;
}

export interface ColumnProfile {
  id?: string;
  name: string;
  inferredType: ColumnInferredType;
  isNullable: boolean;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  uniquenessPercentage: number;
  sampleValues: string[];
  minValue?: string | number | null;
  maxValue?: string | number | null;
  typeBreakdown: Record<ColumnInferredType, number>;
}

export type DataQualityIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DataQualityIssueType =
  | 'missing_values'
  | 'duplicate_rows'
  | 'type_mismatch'
  | 'inconsistent_casing'
  | 'identifier_duplicate'
  | 'range_outlier'
  | 'empty_dataset';

export interface DataQualityIssue {
  id: string;
  columnName?: string;
  severity: DataQualityIssueSeverity;
  issueType: DataQualityIssueType;
  description: string;
  affectedRowsCount: number;
  suggestedRemediation?: string;
}

export interface QualityScoreBreakdown {
  baseScore: number;
  missingPenalty: number;
  duplicatePenalty: number;
  typeMismatchPenalty: number;
  consistencyPenalty: number;
  finalScore: number;
}

export interface DatasetProfilingResult {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  totalMissingCells: number;
  missingCellPercentage: number;
  duplicateRowCount: number;
  duplicateRowPercentage: number;
  qualityIssues: DataQualityIssue[];
  qualityScore: number;
  scoreBreakdown: QualityScoreBreakdown;
  parsedAt: string;
  processingDurationMs: number;
}

export type DatasetProcessingStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export interface DatasetRecord {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: DatasetProcessingStatus;
  rowCount: number;
  columnCount: number;
  qualityScore: number | null;
  createdAt: string;
  updatedAt: string;
  file: {
    id: string;
    originalName: string;
    extension: SupportedFileType;
    sizeBytes: number;
    mimeType: string;
    storageKey: string;
  };
  columns?: ColumnProfile[];
  qualityIssues?: DataQualityIssue[];
  previewRows?: Record<string, unknown>[];
  profilingSummary?: DatasetProfilingResult;
  errorMessage?: string;
}

// -------------------------------------------------------------
// DAY 5 — IDENTITY, WORKSPACES, RBAC, INVITATIONS & AUDIT TYPES
// -------------------------------------------------------------

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  tier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  displayName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceInvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  invitedByEmail: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export type AuditLogAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_SIGNUP'
  | 'WORKSPACE_CREATED'
  | 'MEMBER_INVITED'
  | 'MEMBER_ACCEPTED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'DATASET_CREATED'
  | 'DATASET_DELETED'
  | 'DATASET_EXPORTED'
  | 'AI_QUERY_EXECUTED';

export interface AuditLogRecord {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  action: AuditLogAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  datasetCount: number;
  totalRowsAnalyzed: number;
  dataQualityScore: number | null;
  questionsAnswered: number;
}

export interface DatasetSummary {
  id: string;
  name: string;
  fileType: SupportedFileType;
  fileSizeBytes: number;
  rowCount: number;
  columnCount: number;
  qualityScore: number | null;
  createdAt: string;
  status: DatasetProcessingStatus;
  originalFilename: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sqlQuery?: string;
  chartSuggestion?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
}
