import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MemcachedService } from './memcached.service';
import { Session } from '../interfaces/session.interface';

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly SESSION_TTL = 3600; // 1 hour in seconds

  constructor(private readonly memcachedService: MemcachedService) {}

  /**
   * Create a new session for a user
   */
  async createSession(userId: number, email: string): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      userId,
      email,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    const key = this.getSessionKey(session.id);
    await this.memcachedService.set(key, session, this.SESSION_TTL);
    return session;
  }

  /**
   * Get a session by its ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const key = this.getSessionKey(sessionId);
    return this.memcachedService.get<Session>(key);
  }

  /**
   * Update session data and extend TTL
   */
  async updateSession(
    sessionId: string,
    data: Partial<Session>,
  ): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...data,
      lastActivity: new Date(),
    };

    const key = this.getSessionKey(sessionId);
    await this.memcachedService.set(key, updatedSession, this.SESSION_TTL);
    return updatedSession;
  }

  /**
   * Store additional data in the session
   */
  async setSessionData(
    sessionId: string,
    key: string,
    value: any,
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.data = session.data || {};
    session.data[key] = value;
    session.lastActivity = new Date();

    const sessionKey = this.getSessionKey(sessionId);
    return this.memcachedService.set(sessionKey, session, this.SESSION_TTL);
  }

  /**
   * Get additional data from the session
   */
  async getSessionData<T>(sessionId: string, key: string): Promise<T | null> {
    const session = await this.getSession(sessionId);
    if (!session || !session.data) {
      return null;
    }
    return session.data[key] as T;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const key = this.getSessionKey(sessionId);
    return this.memcachedService.del(key);
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.lastActivity = new Date();
    const key = this.getSessionKey(sessionId);
    return this.memcachedService.set(key, session, this.SESSION_TTL);
  }

  /**
   * Generate the session key for Memcached
   */
  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }
}
