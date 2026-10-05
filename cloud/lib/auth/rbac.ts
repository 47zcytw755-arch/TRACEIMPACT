import { WorkspaceRole } from '@/types';

export type PermissionAction =
  | 'manage_workspace'
  | 'manage_members'
  | 'manage_datasets'
  | 'upload_dataset'
  | 'delete_dataset'
  | 'export_data'
  | 'execute_ai_chat'
  | 'view_audit_logs'
  | 'view_datasets'
  | 'view_dashboard';

const ROLE_PERMISSIONS: Record<WorkspaceRole, Set<PermissionAction>> = {
  owner: new Set([
    'manage_workspace',
    'manage_members',
    'manage_datasets',
    'upload_dataset',
    'delete_dataset',
    'export_data',
    'execute_ai_chat',
    'view_audit_logs',
    'view_datasets',
    'view_dashboard',
  ]),
  admin: new Set([
    'manage_members',
    'manage_datasets',
    'upload_dataset',
    'delete_dataset',
    'export_data',
    'execute_ai_chat',
    'view_audit_logs',
    'view_datasets',
    'view_dashboard',
  ]),
  member: new Set([
    'manage_datasets',
    'upload_dataset',
    'export_data',
    'execute_ai_chat',
    'view_datasets',
    'view_dashboard',
  ]),
  viewer: new Set([
    'view_datasets',
    'view_dashboard',
    'execute_ai_chat',
  ]),
};

/**
 * Checks if a given workspace role is permitted to perform a specified action.
 */
export function hasPermission(role: WorkspaceRole | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(action) : false;
}

/**
 * Asserts that the role has the permission, throwing a descriptive error if denied.
 */
export function assertPermission(role: WorkspaceRole | null | undefined, action: PermissionAction): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: Role "${role || 'unauthorized'}" does not possess permission for "${action}".`);
  }
}
