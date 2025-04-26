// src/categories/dto/create-category.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
