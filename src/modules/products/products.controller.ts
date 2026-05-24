import { Controller, Get, Param, Query } from '@nestjs/common';

import {
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { SearchProductsDto } from './dto/search-products.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiQuery({
    name: 'search',
    required: false,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
  })
  @ApiQuery({
    name: 'availableOnly',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price', 'newest', 'availability', 'priority'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
  })
  searchProducts(@Query() query: SearchProductsDto) {
    return this.productsService.searchProducts(query);
  }

  @Get('featured')
  findFeatured() {
    return this.productsService.findFeatured();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }
}