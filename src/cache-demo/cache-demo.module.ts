// src/cache-demo/cache-demo.module.ts
import { Module } from '@nestjs/common';
import { CacheDemoController } from './cache-demo.controller';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [ProductsModule, CategoriesModule],
  controllers: [CacheDemoController],
})
export class CacheDemoModule {}
