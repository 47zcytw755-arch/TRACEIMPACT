import crypto from 'crypto';
import { IStorageProvider, StorageUploadParams, StorageUploadResult, PresignedUrlResult } from './types';
import { generateStorageKey, computeChecksumSha256 } from './key-generator';

export interface R2Config {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  endpoint?: string;
}

/**
 * Cloudflare R2 / S3-compatible Object-Storage Provider
 * 
 * Supports direct browser-to-R2 presigned PUT uploads using AWS SigV4,
 * bypassing Vercel serverless request limits for files 200MB+.
 */
export class R2StorageProvider implements IStorageProvider {
  public readonly name = 'cloudflare_r2';
  private config: R2Config;
  private isConfigured: boolean;

  constructor(config?: R2Config) {
    this.config = {
      accountId: config?.accountId || process.env.R2_ACCOUNT_ID,
      accessKeyId: config?.accessKeyId || process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY,
      bucketName: config?.bucketName || process.env.R2_BUCKET_NAME,
      endpoint:
        config?.endpoint ||
        (process.env.R2_ACCOUNT_ID
          ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
          : undefined),
    };

    this.isConfigured = Boolean(
      this.config.accessKeyId &&
        this.config.secretAccessKey &&
        this.config.bucketName
    );
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

    const buffer = Buffer.isBuffer(params.buffer)
      ? params.buffer
      : Buffer.from(params.buffer);

    const checksum = computeChecksumSha256(buffer);

    if (!this.isConfigured) {
      return {
        storageKey,
        storageProvider: 'cloudflare_r2',
        sizeBytes: buffer.length,
        checksumSha256: checksum,
      };
    }

    try {
      const presigned = await this.getPresignedUploadUrl({
        workspaceId: params.workspaceId,
        datasetId: params.datasetId,
        fileId: params.fileId,
        safeFilename: params.originalFilename,
        mimeType: params.mimeType,
      });

      await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': params.mimeType,
          ...presigned.headers,
        },
        body: buffer as unknown as BodyInit,
      });
    } catch (err) {
      console.warn('R2 upload error:', err);
    }

    return {
      storageKey,
      storageProvider: 'cloudflare_r2',
      sizeBytes: buffer.length,
      checksumSha256: checksum,
    };
  }

  async getBuffer(storageKey: string): Promise<Buffer | null> {
    if (!this.isConfigured) return null;

    try {
      const endpoint = this.config.endpoint || `https://${this.config.accountId}.r2.cloudflarestorage.com`;
      const url = `${endpoint}/${this.config.bucketName}/${storageKey}`;
      
      const presignedGet = this.generateSigV4Url('GET', storageKey, 300);
      const res = await fetch(presignedGet || url);
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
      const presignedDel = this.generateSigV4Url('DELETE', storageKey, 300);
      if (presignedDel) {
        const res = await fetch(presignedDel, { method: 'DELETE' });
        return res.ok;
      }
      return true;
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

    const signedUrl = this.generateSigV4Url('PUT', storageKey, 900, params.mimeType);
    if (signedUrl) {
      return {
        uploadUrl: signedUrl,
        storageKey,
        method: 'PUT',
        headers: {
          'Content-Type': params.mimeType,
        },
        expiresInSeconds: 900,
      };
    }

    return {
      uploadUrl: `/api/datasets/upload/direct?storageKey=${encodeURIComponent(storageKey)}`,
      storageKey,
      method: 'PUT',
      expiresInSeconds: 900,
    };
  }

  private generateSigV4Url(
    method: 'GET' | 'PUT' | 'DELETE',
    storageKey: string,
    expiresInSeconds: number,
    mimeType?: string
  ): string | null {
    try {
      const { accessKeyId, secretAccessKey, bucketName, accountId } = this.config;
      if (!accessKeyId || !secretAccessKey || !bucketName || !accountId) return null;

      const host = `${bucketName}.${accountId}.r2.cloudflarestorage.com`;
      const region = 'auto';
      const service = 's3';

      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateStamp = amzDate.substring(0, 8);

      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const signedHeaders = mimeType ? 'content-type;host' : 'host';

      const canonicalUri = `/${encodeURIComponent(storageKey).replace(/%2F/g, '/')}`;

      const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expiresInSeconds),
        'X-Amz-SignedHeaders': signedHeaders,
      };

      const canonicalQuery = Object.keys(queryParams)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

      const canonicalHeaders = mimeType
        ? `content-type:${mimeType}\nhost:${host}\n`
        : `host:${host}\n`;

      const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        'UNSIGNED-PAYLOAD',
      ].join('\n');

      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n');

      // Compute signing key
      const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
      const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

      const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

      return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
    } catch (err) {
      console.warn('Failed to generate SigV4 URL:', err);
      return null;
    }
  }
}

