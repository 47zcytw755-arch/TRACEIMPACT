import { IStorageProvider, StorageUploadParams, StorageUploadResult, PresignedUrlResult } from './types';
import { generateStorageKey, computeChecksumSha256 } from './key-generator';

export interface SupabaseStorageConfig {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  bucketName?: string;
}

/**
 * Supabase Storage Object-Storage Provider for TraceImpact Cloud
 * 
 * Generates direct signed upload URLs for browser-to-Supabase Storage uploads,
 * bypassing Vercel serverless request body constraints.
 */
export class SupabaseStorageProvider implements IStorageProvider {
  public readonly name = 'supabase_storage';
  private supabaseUrl: string | undefined;
  private serviceRoleKey: string | undefined;
  private bucketName: string;
  private isConfigured: boolean;

  constructor(config?: SupabaseStorageConfig) {
    this.supabaseUrl = config?.supabaseUrl || process.env.SUPABASE_URL;
    this.serviceRoleKey = config?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucketName = config?.bucketName || process.env.SUPABASE_STORAGE_BUCKET || 'datasets';
    this.isConfigured = Boolean(this.supabaseUrl && this.serviceRoleKey);
  }

  get configured(): boolean {
    return this.isConfigured;
  }

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const storageKey = generateStorageKey({
      workspaceId: params.workspaceId,
      datasetId: params.datasetId,
      fileId: params.fileId,
      filename: params.originalFilename,
    });

    const buffer = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);
    const checksum = computeChecksumSha256(buffer);

    if (!this.isConfigured) {
      return {
        storageKey,
        storageProvider: 'supabase_storage',
        sizeBytes: buffer.length,
        checksumSha256: checksum,
      };
    }

    try {
      const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${storageKey}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          'Content-Type': params.mimeType,
          'x-upsert': 'true',
        },
        body: buffer as unknown as BodyInit,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Supabase storage upload failed: ${res.status} ${text}`);
      }
    } catch (err) {
      console.warn('Supabase storage upload error:', err);
    }

    return {
      storageKey,
      storageProvider: 'supabase_storage',
      sizeBytes: buffer.length,
      checksumSha256: checksum,
    };
  }

  async getBuffer(storageKey: string): Promise<Buffer | null> {
    if (!this.isConfigured) return null;

    try {
      const url = `${this.supabaseUrl}/storage/v1/object/authenticated/${this.bucketName}/${storageKey}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      });

      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    } catch {
      return null;
    }
  }

  async delete(storageKey: string): Promise<boolean> {
    if (!this.isConfigured) return true;

    try {
      const url = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${storageKey}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getPresignedUploadUrl(params: {
    workspaceId: string;
    datasetId: string;
    fileId: string;
    safeFilename: string;
    mimeType: string;
    sizeBytes?: number;
  }): Promise<PresignedUrlResult> {
    const storageKey = generateStorageKey({
      workspaceId: params.workspaceId,
      datasetId: params.datasetId,
      fileId: params.fileId,
      filename: params.safeFilename,
    });

    if (!this.isConfigured) {
      return {
        uploadUrl: `/api/datasets/upload/direct?storageKey=${encodeURIComponent(storageKey)}`,
        storageKey,
        method: 'PUT',
        expiresInSeconds: 900,
      };
    }

    try {
      const signUrl = `${this.supabaseUrl}/storage/v1/object/upload/sign/${this.bucketName}/${storageKey}`;
      const res = await fetch(signUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 900 }),
      });

      if (res.ok) {
        const data = await res.json();
        const signedPath = data.url || data.signedUrl || data.signedURL;
        const uploadUrl = signedPath.startsWith('http') ? signedPath : `${this.supabaseUrl}/storage/v1${signedPath}`;
        return {
          uploadUrl,
          storageKey,
          method: 'PUT',
          headers: {
            'Content-Type': params.mimeType,
          },
          expiresInSeconds: 900,
        };
      }
    } catch (err) {
      console.warn('Supabase getPresignedUploadUrl fallback:', err);
    }

    // Fallback: direct storage upload with anon key or local direct route
    return {
      uploadUrl: `/api/datasets/upload/direct?storageKey=${encodeURIComponent(storageKey)}`,
      storageKey,
      method: 'PUT',
      expiresInSeconds: 900,
    };
  }
}
