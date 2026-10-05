import fs from 'fs';
import path from 'path';

/**
 * Persistent Database Store for TraceImpact Cloud
 * 
 * Provides unified, durable multi-tenant storage for:
 * - users & profiles
 * - sessions & authentication tokens
 * - workspaces & memberships
 * - invitations & role delegations
 * - datasets & column schemas
 * - audit governance events
 * 
 * Automatically persists to durable disk storage (`.data/traceimpact_db.json`)
 * when running locally or in hybrid environments, ensuring data survives
 * server restarts, hot module reloads, and multi-instance test suites.
 */

export interface DatabaseState {
  users: Record<string, unknown>;
  usersByEmail: Record<string, string>;
  sessions: Record<string, unknown>;
  workspaces: Record<string, unknown>;
  members: Record<string, unknown>;
  invitations: Record<string, unknown>;
  datasets: Record<string, unknown>;
  auditLogs: unknown[];
  version: number;
  lastFlushedAt: string;
}

class PersistentDatabaseStore {
  private state: DatabaseState = {
    users: {},
    usersByEmail: {},
    sessions: {},
    workspaces: {},
    members: {},
    invitations: {},
    datasets: {},
    auditLogs: [],
    version: 1,
    lastFlushedAt: new Date().toISOString(),
  };

  private filePath: string;
  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Determine storage location safely (fallback to /tmp in serverless environments like Vercel)
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const baseDir = isServerless ? '/tmp' : process.cwd();
    const dataDir = path.resolve(baseDir, '.data');
    this.filePath = path.join(dataDir, 'traceimpact_db.json');
    this.loadFromDisk();
  }

  /**
   * Initializes and loads the persistent database from disk if available.
   */
  public loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          this.state = {
            users: parsed.users || {},
            usersByEmail: parsed.usersByEmail || {},
            sessions: parsed.sessions || {},
            workspaces: parsed.workspaces || {},
            members: parsed.members || {},
            invitations: parsed.invitations || {},
            datasets: parsed.datasets || {},
            auditLogs: parsed.auditLogs || [],
            version: parsed.version || 1,
            lastFlushedAt: parsed.lastFlushedAt || new Date().toISOString(),
          };
        }
      }
      this.isLoaded = true;
    } catch {
      // Fallback cleanly to in-memory state on read error (e.g. read-only serverless environment)
      this.isLoaded = true;
    }
  }

  /**
   * Flushes current in-memory snapshot to persistent disk storage.
   */
  public flushSync(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.state.lastFlushedAt = new Date().toISOString();
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // Fail silently if running in read-only environment like Vercel Lambda
    }
  }

  /**
   * Schedules a debounced disk flush.
   */
  public scheduleFlush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushSync();
      this.saveTimeout = null;
    }, 100);
  }

  // --- Collection Accessors ---

  public getCollection<T = unknown>(collection: keyof Omit<DatabaseState, 'auditLogs' | 'usersByEmail' | 'version' | 'lastFlushedAt'>): Record<string, T> {
    if (!this.isLoaded) this.loadFromDisk();
    return (this.state[collection] || {}) as Record<string, T>;
  }

  public getAuditLogs<T = unknown>(): T[] {
    if (!this.isLoaded) this.loadFromDisk();
    return (this.state.auditLogs || []) as T[];
  }

  public getUsersByEmail(): Record<string, string> {
    if (!this.isLoaded) this.loadFromDisk();
    return this.state.usersByEmail || {};
  }

  public setItem<T = unknown>(
    collection: keyof Omit<DatabaseState, 'auditLogs' | 'usersByEmail' | 'version' | 'lastFlushedAt'>,
    key: string,
    value: T
  ): void {
    if (!this.isLoaded) this.loadFromDisk();
    if (!this.state[collection]) {
      this.state[collection] = {};
    }
    (this.state[collection] as Record<string, T>)[key] = value;
    this.scheduleFlush();
  }

  public deleteItem(
    collection: keyof Omit<DatabaseState, 'auditLogs' | 'usersByEmail' | 'version' | 'lastFlushedAt'>,
    key: string
  ): boolean {
    if (!this.isLoaded) this.loadFromDisk();
    const col = this.state[collection] as Record<string, unknown> | undefined;
    if (col && key in col) {
      delete col[key];
      this.scheduleFlush();
      return true;
    }
    return false;
  }

  public setAuditLogs(logs: unknown[]): void {
    if (!this.isLoaded) this.loadFromDisk();
    this.state.auditLogs = logs;
    this.scheduleFlush();
  }

  public addAuditLog(entry: unknown): void {
    if (!this.isLoaded) this.loadFromDisk();
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 5000) {
      this.state.auditLogs.pop();
    }
    this.scheduleFlush();
  }

  public setUserEmailIndex(email: string, userId: string): void {
    if (!this.isLoaded) this.loadFromDisk();
    this.state.usersByEmail[email.toLowerCase()] = userId;
    this.scheduleFlush();
  }

  /**
   * Resets database state (used for test setup or clean purges).
   */
  public reset(): void {
    this.state = {
      users: {},
      usersByEmail: {},
      sessions: {},
      workspaces: {},
      members: {},
      invitations: {},
      datasets: {},
      auditLogs: [],
      version: 1,
      lastFlushedAt: new Date().toISOString(),
    };
    this.flushSync();
  }
}

// Global persistent database singleton
export const persistentStore = new PersistentDatabaseStore();
