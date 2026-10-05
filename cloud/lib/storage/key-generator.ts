import crypto from 'crypto';

/**
 * Sanitize filename to prevent path traversal, null-byte injection, and invalid characters.
 */
export function sanitizeFilename(filename: string): string {
  // Strip null bytes and directory traversal patterns
  let safe = filename
    .replace(/\0/g, '')
    .replace(/\.\./g, '_')
    .replace(/[\/\\]/g, '_');

  // Strip leading/trailing dots or underscores
  safe = safe.replace(/^[\._]+/, '').trim();

  // Replace potentially dangerous/weird characters with underscores
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit filename length
  if (safe.length > 200) {
    const ext = safe.includes('.') ? safe.substring(safe.lastIndexOf('.')) : '';
    safe = safe.substring(0, 190) + ext;
  }

  return safe || 'dataset_file';
}

/**
 * Generate standard isolated storage key for raw files
 * Format: workspaces/{workspaceId}/datasets/{datasetId}/raw/{fileUuid}_{safeFilename}
 */
export function generateStorageKey(params: {
  workspaceId: string;
  datasetId: string;
  fileId?: string;
  filename: string;
}): string {
  const safeFilename = sanitizeFilename(params.filename);
  const fileId = params.fileId || crypto.randomUUID();
  return `workspaces/${params.workspaceId}/datasets/${params.datasetId}/raw/${fileId}_${safeFilename}`;
}

/**
 * Compute SHA256 checksum of file buffer
 */
export function computeChecksumSha256(buffer: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
