// src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { MemcachedService } from './services/memcached.service';

@Global()
@Module({
  providers: [MemcachedService],
  exports: [MemcachedService],
})
export class CommonModule {}
