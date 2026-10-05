import crypto from 'crypto';
import { UserProfile } from '@/types';
import { persistentStore } from '@/lib/db/persistent-store';

export interface UserAccount extends UserProfile {
  passwordHash: string;
  salt: string;
}

export interface SessionTokenPayload {
  userId: string;
  email: string;
  displayName: string;
  createdAt: number;
  expiresAt: number;
}

class AuthService {
  constructor() {
    this.seedDefaultUsers();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(password).digest('hex');
  }

  private seedDefaultUsers() {
    const users = persistentStore.getCollection<UserAccount>('users');
    const demoId = 'usr_demo_01';

    if (!users[demoId]) {
      const salt = 'demo_salt_traceimpact';
      const hash = this.hashPassword('Password123!', salt);

      const demoUser: UserAccount = {
        id: demoId,
        email: 'demo@traceimpact.com',
        displayName: 'Demo User',
        passwordHash: hash,
        salt,
        createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      };

      persistentStore.setItem('users', demoId, demoUser);
      persistentStore.setUserEmailIndex(demoUser.email, demoId);
    }
  }

  async signup(email: string, password: string, displayName?: string): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Valid email address is required.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const emailIndex = persistentStore.getUsersByEmail();
    if (emailIndex[cleanEmail]) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const user: UserAccount = {
      id: userId,
      email: cleanEmail,
      displayName: displayName?.trim() || cleanEmail.split('@')[0],
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    persistentStore.setItem('users', userId, user);
    persistentStore.setUserEmailIndex(cleanEmail, userId);

    const token = await this.createSession(userId);
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const emailIndex = persistentStore.getUsersByEmail();
    const userId = emailIndex[cleanEmail];

    if (!userId) {
      throw new Error('Invalid email or password.');
    }

    const users = persistentStore.getCollection<UserAccount>('users');
    const user = users[userId];
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const computedHash = this.hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const token = await this.createSession(userId);
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async createSession(userId: string): Promise<string> {
    const users = persistentStore.getCollection<UserAccount>('users');
    const user = users[userId];
    if (!user) throw new Error('User does not exist.');

    const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const sessionPayload: SessionTokenPayload = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: now,
      expiresAt,
    };

    persistentStore.setItem('sessions', token, sessionPayload);
    return token;
  }

  async validateSessionToken(token: string | null | undefined): Promise<UserProfile | null> {
    if (!token) return null;
    const sessions = persistentStore.getCollection<SessionTokenPayload>('sessions');
    const session = sessions[token];
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      persistentStore.deleteItem('sessions', token);
      return null;
    }

    const users = persistentStore.getCollection<UserAccount>('users');
    const user = users[session.userId];
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }

  async revokeSession(token: string): Promise<void> {
    persistentStore.deleteItem('sessions', token);
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const users = persistentStore.getCollection<UserAccount>('users');
    const user = users[userId];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const emailIndex = persistentStore.getUsersByEmail();
    const userId = emailIndex[email.trim().toLowerCase()];
    if (!userId) return null;
    return this.getUserById(userId);
  }
}

export const authService = new AuthService();
