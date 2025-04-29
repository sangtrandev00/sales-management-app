// src/cache-demo/cache-demo.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { MemcachedService } from '../common/services/memcached.service';
import { ProductsService } from '../products/products.service';

/**
 * Controller for demonstrating caching functionality
 * This controller provides endpoints to test and manage cache operations
 */
@Controller('cache-demo')
export class CacheDemoController {
  constructor(
    private memcachedService: MemcachedService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
  ) { }

  /**
   * Tests the performance difference between cached and uncached product queries
   * Makes two identical calls to fetch all products:
   * 1. First call: Likely hits the database (slower)
   * 2. Second call: Should hit the cache (faster)
   * @returns Object containing timing information and performance improvement percentage
   */
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

  /**
   * Tests the performance difference between cached and uncached category queries
   * Similar to productPerformanceTest but for categories
   * Makes two identical calls to fetch all categories:
   * 1. First call: Likely hits the database (slower)
   * 2. Second call: Should hit the cache (faster)
   * @returns Object containing timing information and performance improvement percentage
   */
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

  /**
   * Clears all cached data from Memcached
   * This endpoint is useful for testing or when you need to force a fresh data load
   * @returns Success message confirming cache flush
   */
  @Get('flush-cache')
  async flushCache() {
    await this.memcachedService.flush();
    return { message: 'Cache flushed successfully' };
  }

  /**
   * Retrieves the current state of the cache
   * Checks if specific keys (products_all and categories_all) are present in the cache
   * @returns Object containing cache status information and list of cached keys
   */
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

  /**
   * Sets a custom key-value pair in the cache
   * @param data Object containing:
   *   - key: The cache key to set
   *   - value: The value to cache
   *   - ttl: Time to live in seconds (optional, defaults to 3600 seconds / 1 hour)
   * @returns Success message with the cached key
   */
  @Post('set-custom-cache')
  async setCustomCache(
    @Body() data: { key: string; value: any; ttl?: number },
  ) {
    await this.memcachedService.set(data.key, data.value, data.ttl || 3600);
    return { message: `Cache set for key: ${data.key}` };
  }

  /**
   * Retrieves a value from the cache by its key
   * @param key The cache key to retrieve
   * @returns Object containing the key and its cached value, or a message if not found
   */
  @Get('get-custom-cache/:key')
  async getCustomCache(@Param('key') key: string) {
    const value = await this.memcachedService.get(key);
    if (value === null) {
      return { message: `No cache found for key: ${key}` };
    }
    return { key, value };
  }
}
