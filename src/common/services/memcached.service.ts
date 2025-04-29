// src/common/services/memcached.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Memcached from 'memcached';

@Injectable()
export class MemcachedService implements OnModuleInit, OnModuleDestroy {
  private client: Memcached;

  constructor(private configService: ConfigService) { }

  onModuleInit() {
    const host = this.configService.get('MEMCACHED_HOST');
    const port = this.configService.get('MEMCACHED_PORT');
    this.client = new Memcached(`${host}:${port}`);
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
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }

  async flush(): Promise<boolean> {
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
}
