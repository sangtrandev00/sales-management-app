// src/categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemcachedService } from '../common/services/memcached.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private memcachedService: MemcachedService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create(createCategoryDto);
    await this.categoriesRepository.save(category);
    // Invalidate cache after creating a new category
    await this.memcachedService.del('categories_all');
    return category;
  }

  async findAll(): Promise<Category[]> {
    // Try to get from cache first
    const cachedCategories =
      await this.memcachedService.get<Category[]>('categories_all');
    if (cachedCategories) {
      console.log('Retrieved categories from cache');
      return cachedCategories;
    }

    // If not in cache, get from database
    console.log('Retrieving categories from database');
    const categories = await this.categoriesRepository.find();

    // Store in cache for future requests (TTL: 1 hour)
    await this.memcachedService.set('categories_all', categories, 3600);

    return categories;
  }

  async findOne(id: number): Promise<Category> {
    // Try to get from cache first
    const cacheKey = `category_${id}`;
    const cachedCategory = await this.memcachedService.get<Category>(cacheKey);
    if (cachedCategory) {
      console.log(`Retrieved category ${id} from cache`);
      return cachedCategory;
    }

    // If not in cache, get from database
    console.log(`Retrieving category ${id} from database`);
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Store in cache for future requests (TTL: 1 hour)
    await this.memcachedService.set(cacheKey, category, 3600);

    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);
    this.categoriesRepository.merge(category, updateCategoryDto);
    await this.categoriesRepository.save(category);

    // Invalidate cache after update
    const cacheKey = `category_${id}`;
    await this.memcachedService.del(cacheKey);
    await this.memcachedService.del('categories_all');

    return category;
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepository.remove(category);

    // Invalidate cache after deletion
    const cacheKey = `category_${id}`;
    await this.memcachedService.del(cacheKey);
    await this.memcachedService.del('categories_all');
  }
}
