import { SupportedFileType } from '@/types';

export interface StorageUploadParams {
  workspaceId: string;
  datasetId: string;
  fileId: string;
  originalFilename: string;
  extension: SupportedFileType;
  mimeType: string;
  buffer: Buffer | Uint8Array;
}

export interface StorageUploadResult {
  storageKey: string;
  storageProvider: 'cloudflare_r2' | 'supabase_storage' | 'local_fs' | 'memory';
  sizeBytes: number;
  checksumSha256?: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  storageKey: string;
  method: 'PUT' | 'POST';
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  expiresInSeconds: number;
}

export interface IStorageProvider {
  name: string;
  upload(params: StorageUploadParams): Promise<StorageUploadResult>;
  getBuffer(storageKey: string): Promise<Buffer | null>;
  delete(storageKey: string): Promise<boolean>;
  getPresignedUploadUrl(params: {
    workspaceId: string;
    datasetId: string;
    fileId: string;
    safeFilename: string;
    mimeType: string;
    sizeBytes?: number;
  }): Promise<PresignedUrlResult>;
}

