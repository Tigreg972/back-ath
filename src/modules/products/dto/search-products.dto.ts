import { IsBooleanString, IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export class SearchProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  categoryId?: string;

  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @IsOptional()
  @IsBooleanString()
  availableOnly?: string;

  @IsOptional()
  @IsIn(['price', 'newest', 'availability', 'priority'])
  sortBy?: 'price' | 'newest' | 'availability' | 'priority';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}