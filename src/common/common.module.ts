// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { MemcachedService } from './services/memcached.service';
import { SessionService } from './services/session.service';

@Global()
@Module({
  providers: [MemcachedService, SessionService],
  exports: [MemcachedService, SessionService],
})
export class CommonModule {}
