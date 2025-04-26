// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemcachedService } from '../common/services/memcached.service';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private memcachedService: MemcachedService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    await this.productsRepository.save(product);

    // Invalidate cache
    await this.memcachedService.del('products_all');
    await this.memcachedService.del(
      `products_by_category_${product.categoryId}`,
    );

    return product;
  }

  async findAll(): Promise<Product[]> {
    // Try to get from cache first
    const cachedProducts =
      await this.memcachedService.get<Product[]>('products_all');
    if (cachedProducts) {
      console.log('Retrieved products from cache');
      return cachedProducts;
    }

    // If not in cache, get from database
    console.log('Retrieving products from database');
    const products = await this.productsRepository.find({
      relations: ['category'],
    });

    // Store in cache for future requests (TTL: 1 hour)
    await this.memcachedService.set('products_all', products, 3600);

    return products;
  }

  async findByCategory(categoryId: number): Promise<Product[]> {
    // Try to get from cache first
    const cacheKey = `products_by_category_${categoryId}`;
    const cachedProducts = await this.memcachedService.get<Product[]>(cacheKey);
    if (cachedProducts) {
      console.log(`Retrieved products for category ${categoryId} from cache`);
      return cachedProducts;
    }

    // If not in cache, get from database
    console.log(`Retrieving products for category ${categoryId} from database`);
    const products = await this.productsRepository.find({
      where: { categoryId },
      relations: ['category'],
    });

    // Store in cache for future requests (TTL: 1 hour)
    await this.memcachedService.set(cacheKey, products, 3600);

    return products;
  }

  async findOne(id: number): Promise<Product> {
    // Try to get from cache first
    const cacheKey = `product_${id}`;
    const cachedProduct = await this.memcachedService.get<Product>(cacheKey);
    if (cachedProduct) {
      console.log(`Retrieved product ${id} from cache`);
      return cachedProduct;
    }

    // If not in cache, get from database
    console.log(`Retrieving product ${id} from database`);
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Store in cache for future requests (TTL: 1 hour)
    await this.memcachedService.set(cacheKey, product, 3600);

    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    const oldCategoryId = product.categoryId;

    this.productsRepository.merge(product, updateProductDto);
    await this.productsRepository.save(product);

    // Invalidate cache
    const cacheKey = `product_${id}`;
    await this.memcachedService.del(cacheKey);
    await this.memcachedService.del('products_all');
    await this.memcachedService.del(`products_by_category_${oldCategoryId}`);

    if (oldCategoryId !== product.categoryId) {
      await this.memcachedService.del(
        `products_by_category_${product.categoryId}`,
      );
    }

    return product;
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);

    // Invalidate cache
    const cacheKey = `product_${id}`;
    await this.memcachedService.del(cacheKey);
    await this.memcachedService.del('products_all');
    await this.memcachedService.del(
      `products_by_category_${product.categoryId}`,
    );
  }
}
