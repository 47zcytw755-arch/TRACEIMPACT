import fs from 'fs';
import path from 'path';
import os from 'os';

interface ChunkUploadSession {
  uploadId: string;
  filename: string;
  fileSizeBytes?: number;
  totalChunks: number;
  chunks: Map<number, Buffer>;
  diskDir?: string;
  createdAt: number;
  lastActiveAt: number;
}

class ChunkStoreManager {
  private sessions = new Map<string, ChunkUploadSession>();
  private readonly SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private baseTempDir: string;

  constructor() {
    try {
      this.baseTempDir = path.join(os.tmpdir(), 'traceimpact_chunks');
      if (!fs.existsSync(this.baseTempDir)) {
        fs.mkdirSync(this.baseTempDir, { recursive: true });
      }
    } catch {
      this.baseTempDir = '';
    }

    // Periodic cleanup of stale sessions every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupStaleSessions(), 5 * 60 * 1000).unref?.();
    }
  }

  public saveChunk(params: {
    uploadId: string;
    filename: string;
    chunkIndex: number;
    totalChunks: number;
    chunkBuffer: Buffer;
    fileSizeBytes?: number;
  }): {
    isComplete: boolean;
    fullBuffer?: Buffer;
    uploadedChunksCount: number;
    totalChunks: number;
  } {
    const { uploadId, filename, chunkIndex, totalChunks, chunkBuffer, fileSizeBytes } = params;
    const now = Date.now();

    let session = this.sessions.get(uploadId);
    if (!session) {
      let sessionDiskDir: string | undefined;
      if (this.baseTempDir) {
        try {
          sessionDiskDir = path.join(this.baseTempDir, uploadId.replace(/[^a-zA-Z0-9_-]/g, ''));
          if (!fs.existsSync(/*turbopackIgnore: true*/ sessionDiskDir)) {
            fs.mkdirSync(sessionDiskDir, { recursive: true });
          }
        } catch {
          sessionDiskDir = undefined;
        }
      }

      session = {
        uploadId,
        filename,
        fileSizeBytes,
        totalChunks,
        chunks: new Map<number, Buffer>(),
        diskDir: sessionDiskDir,
        createdAt: now,
        lastActiveAt: now,
      };
      this.sessions.set(uploadId, session);
    }

    session.lastActiveAt = now;

    // Persist chunk to disk if available to minimize memory footprint
    if (session.diskDir) {
      try {
        const chunkPath = path.join(session.diskDir, `chunk_${chunkIndex}.bin`);
        fs.writeFileSync(chunkPath, chunkBuffer);
        session.chunks.set(chunkIndex, Buffer.alloc(0)); // Record presence
      } catch {
        session.chunks.set(chunkIndex, chunkBuffer);
      }
    } else {
      session.chunks.set(chunkIndex, chunkBuffer);
    }

    const uploadedChunksCount = session.chunks.size;
    const isComplete = uploadedChunksCount === totalChunks;

    if (isComplete) {
      // Reassemble all chunks in numerical order
      const orderedBuffers: Buffer[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (session.diskDir) {
          try {
            const chunkPath = path.join(session.diskDir, `chunk_${i}.bin`);
            if (fs.existsSync(chunkPath)) {
              orderedBuffers.push(fs.readFileSync(chunkPath));
              continue;
            }
          } catch {
            // fallback to in-memory chunk
          }
        }

        const chunk = session.chunks.get(i);
        if (!chunk || chunk.length === 0) {
          if (session.diskDir) {
            const chunkPath = path.join(session.diskDir, `chunk_${i}.bin`);
            if (fs.existsSync(chunkPath)) {
              orderedBuffers.push(fs.readFileSync(chunkPath));
              continue;
            }
          }
          throw new Error(`Missing chunk index ${i} for upload session ${uploadId}`);
        }
        orderedBuffers.push(chunk);
      }

      const fullBuffer = Buffer.concat(orderedBuffers);

      // Clean up session and temp files
      if (session.diskDir) {
        try {
          fs.rmSync(session.diskDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
      this.sessions.delete(uploadId);

      return {
        isComplete: true,
        fullBuffer,
        uploadedChunksCount: totalChunks,
        totalChunks,
      };
    }

    return {
      isComplete: false,
      uploadedChunksCount,
      totalChunks,
    };
  }

  public abortSession(uploadId: string): void {
    const session = this.sessions.get(uploadId);
    if (session?.diskDir) {
      try {
        fs.rmSync(session.diskDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    this.sessions.delete(uploadId);
  }

  private cleanupStaleSessions(): void {
    const now = Date.now();
    for (const [uploadId, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > this.SESSION_TTL_MS) {
        if (session.diskDir) {
          try {
            fs.rmSync(session.diskDir, { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
        this.sessions.delete(uploadId);
      }
    }
  }
}

export const chunkStore = new ChunkStoreManager();
