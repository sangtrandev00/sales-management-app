// src/cache-demo/cache-demo.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { MemcachedService } from '../common/services/memcached.service';
import { ProductsService } from '../products/products.service';

@Controller('cache-demo')
export class CacheDemoController {
  constructor(
    private memcachedService: MemcachedService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
  ) {}

  @Get('products/performance-test')
  async productPerformanceTest() {
    const startTime = Date.now();

    // First call will likely hit the database
    await this.productsService.findAll();
    const firstCallTime = Date.now() - startTime;

    // Second call should hit the cache
    const secondStartTime = Date.now();
    await this.productsService.findAll();
    const secondCallTime = Date.now() - secondStartTime;

    return {
      firstCallTime: `${firstCallTime}ms (likely from database)`,
      secondCallTime: `${secondCallTime}ms (likely from cache)`,
      improvement: `${Math.round(((firstCallTime - secondCallTime) / firstCallTime) * 100)}%`,
    };
  }

  @Get('categories/performance-test')
  async categoryPerformanceTest() {
    const startTime = Date.now();

    // First call will likely hit the database
    await this.categoriesService.findAll();
    const firstCallTime = Date.now() - startTime;

    // Second call should hit the cache
    const secondStartTime = Date.now();
    await this.categoriesService.findAll();
    const secondCallTime = Date.now() - secondStartTime;

    return {
      firstCallTime: `${firstCallTime}ms (likely from database)`,
      secondCallTime: `${secondCallTime}ms (likely from cache)`,
      improvement: `${Math.round(((firstCallTime - secondCallTime) / firstCallTime) * 100)}%`,
    };
  }

  @Get('flush-cache')
  async flushCache() {
    await this.memcachedService.flush();
    return { message: 'Cache flushed successfully' };
  }

  @Get('cache-stats')
  async getCacheStats() {
    // Try to get some cache keys to demonstrate what's in the cache
    const productsAll = await this.memcachedService.get('products_all');
    const categoriesAll = await this.memcachedService.get('categories_all');

    return {
      productsAllCached: productsAll !== null,
      categoriesAllCached: categoriesAll !== null,
      cachedKeys: [
        productsAll !== null ? 'products_all' : null,
        categoriesAll !== null ? 'categories_all' : null,
      ].filter(Boolean),
    };
  }

  @Post('set-custom-cache')
  async setCustomCache(
    @Body() data: { key: string; value: any; ttl?: number },
  ) {
    await this.memcachedService.set(data.key, data.value, data.ttl || 3600);
    return { message: `Cache set for key: ${data.key}` };
  }

  @Get('get-custom-cache/:key')
  async getCustomCache(@Param('key') key: string) {
    const value = await this.memcachedService.get(key);
    if (value === null) {
      return { message: `No cache found for key: ${key}` };
    }
    return { key, value };
  }
}
