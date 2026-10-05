import { IStorageProvider, StorageUploadParams, StorageUploadResult } from './types';
import { generateStorageKey, computeChecksumSha256 } from './key-generator';

/**
 * In-memory / local storage provider for development, testing, and fallback.
 */
export class LocalStorageProvider implements IStorageProvider {
  public readonly name = 'local_fs';
  private storageMap = new Map<string, Buffer>();

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const storageKey = generateStorageKey({
      workspaceId: params.workspaceId,
      datasetId: params.datasetId,
      fileId: params.fileId,
      filename: params.originalFilename,
    });

    const buffer = Buffer.isBuffer(params.buffer)
      ? params.buffer
      : Buffer.from(params.buffer);

    this.storageMap.set(storageKey, buffer);

    const checksum = computeChecksumSha256(buffer);

    return {
      storageKey,
      storageProvider: 'local_fs',
      sizeBytes: buffer.length,
      checksumSha256: checksum,
    };
  }

  async getBuffer(storageKey: string): Promise<Buffer | null> {
    return this.storageMap.get(storageKey) || null;
  }

  async delete(storageKey: string): Promise<boolean> {
    return this.storageMap.delete(storageKey);
  }

  async getPresignedUploadUrl(params: {
    workspaceId: string;
    datasetId: string;
    fileId: string;
    safeFilename: string;
    mimeType: string;
    sizeBytes?: number;
  }): Promise<{ uploadUrl: string; storageKey: string; method: 'PUT'; expiresInSeconds: number }> {
    const storageKey = generateStorageKey({
      workspaceId: params.workspaceId,
      datasetId: params.datasetId,
      fileId: params.fileId,
      filename: params.safeFilename,
    });

    // In local mode, route through local direct stream upload endpoint
    return {
      uploadUrl: `/api/datasets/upload/direct?storageKey=${encodeURIComponent(storageKey)}`,
      storageKey,
      method: 'PUT',
      expiresInSeconds: 900,
    };
  }
}
