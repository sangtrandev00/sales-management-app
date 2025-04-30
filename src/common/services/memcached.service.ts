// src/common/services/memcached.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Memcached from 'memcached';

@Injectable()
export class MemcachedService implements OnModuleInit, OnModuleDestroy {
  private client: Memcached;
  private trackedKeys: Set<string> = new Set<string>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get('MEMCACHED_HOST');
    const port = this.configService.get('MEMCACHED_PORT');
    this.client = new Memcached(`${host}:${port}`);
    // Load any previously saved keys from memcached
    this.loadTrackedKeys();
  }

  onModuleDestroy() {
    this.client.end();
  }

  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) return reject(err);
        if (!data) return resolve(null);
        try {
          resolve(JSON.parse(data.toString()) as T);
        } catch (e) {
          resolve(data as unknown as T);
        }
      });
    });
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    // Track this key
    this.trackedKeys.add(key);
    // Save the updated tracking list
    this.saveTrackedKeys();

    return new Promise((resolve, reject) => {
      this.client.set(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
        ttl,
        (err) => {
          if (err) return reject(err);
          resolve(true);
        },
      );
    });
  }

  async del(key: string): Promise<boolean> {
    // Remove from tracked keys
    this.trackedKeys.delete(key);
    this.saveTrackedKeys();

    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  async flush(): Promise<boolean> {
    // Clear tracked keys
    this.trackedKeys.clear();
    this.saveTrackedKeys();

    return new Promise((resolve, reject) => {
      this.client.flush((err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  async setSession<T>(
    key: string,
    value: T,
    ttl: number = 3600,
  ): Promise<boolean> {
    return this.set(key, value, ttl);
  }

  /**
   * Store a temporary token (e.g., password reset, email verification)
   */
  async setTemporaryToken<T>(
    key: string,
    value: T,
    ttl: number = 600,
  ): Promise<boolean> {
    // Default TTL: 10 minutes
    return this.set(key, value, ttl);
  }

  /**
   * Retrieve a temporary token
   */
  async getTemporaryToken<T>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  /**
   * Delete a temporary token (e.g., after use)
   */
  async deleteTemporaryToken(key: string): Promise<boolean> {
    return this.del(key);
  }

  /**
   * Get all keys stored in Memcached
   * This method relies on our key tracking mechanism since Memcached doesn't
   * provide a native way to list all keys.
   *
   * @returns Promise<string[]> - Array of keys
   */
  async getAllKeys(): Promise<string[]> {
    // Get tracked keys from our internal registry
    const keys = Array.from(this.trackedKeys);

    // Filter out keys that are no longer in memcached
    const result = [];

    for (const key of keys) {
      const exists = await this.keyExists(key);
      if (exists) {
        result.push(key);
      } else {
        // Clean up tracking for expired keys
        this.trackedKeys.delete(key);
      }
    }

    // Update our tracking list to remove any expired keys
    this.saveTrackedKeys();

    return result;
  }

  /**
   * Check if a key exists in Memcached
   * @param key The key to check
   * @returns Promise<boolean> - true if key exists
   */
  private async keyExists(key: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.client.get(key, (err, data) => {
        if (err || data === undefined) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Save the tracked keys list to memcached
   * This allows us to maintain our key registry across application restarts
   */
  private async saveTrackedKeys(): Promise<void> {
    const keys = Array.from(this.trackedKeys);
    await this.client.set(
      '__memcached_tracked_keys__',
      JSON.stringify(keys),
      0,
      () => {},
    );
  }

  /**
   * Load tracked keys from memcached
   */
  private async loadTrackedKeys(): Promise<void> {
    this.client.get('__memcached_tracked_keys__', (err, data) => {
      if (!err && data) {
        try {
          const keys = JSON.parse(data.toString());
          this.trackedKeys = new Set(keys);
        } catch (e) {
          console.error('Error loading tracked keys:', e);
        }
      }
    });
  }
}
