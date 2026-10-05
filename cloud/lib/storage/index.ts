import { IStorageProvider } from './types';
import { LocalStorageProvider } from './local-storage-provider';
import { R2StorageProvider } from './r2-storage-provider';
import { SupabaseStorageProvider } from './supabase-storage-provider';

let storageInstance: IStorageProvider | null = null;

/**
 * Storage provider factory.
 * Prioritizes configured Cloudflare R2 / S3 or Supabase Storage, falling back to LocalStorageProvider.
 */
export function getStorageProvider(): IStorageProvider {
  if (!storageInstance) {
    const r2 = new R2StorageProvider();
    if (r2.configured) {
      storageInstance = r2;
    } else {
      const supabase = new SupabaseStorageProvider();
      if (supabase.configured) {
        storageInstance = supabase;
      } else {
        storageInstance = new LocalStorageProvider();
      }
    }
  }
  return storageInstance;
}

export * from './types';
export * from './key-generator';
export * from './local-storage-provider';
export * from './r2-storage-provider';
export * from './supabase-storage-provider';

