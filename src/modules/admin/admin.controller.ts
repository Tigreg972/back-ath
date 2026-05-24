import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { imageUploadOptions } from '../../common/uploads/image-upload.config';

import { AdminService } from './admin.service';

import { CategoriesService } from '../categories/categories.service';
import { CreateCategoryDto } from '../categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../categories/dto/update-category.dto';

import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';

import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  dashboard() {
    return this.adminService.getDashboardMessage();
  }

  @Get('users')
  findAllUsers() {
    return this.usersService.findAll();
  }

  @Get('orders')
  findAllOrders() {
    return this.ordersService.findAllForAdmin();
  }

  @Get('categories')
  findAllCategories() {
    return this.categoriesService.findAllForAdmin();
  }

  @Get('stats')
getDashboardStats() {
  return this.adminService.getDashboardStats();
}

  @Post('categories')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(Number(id), updateCategoryDto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.categoriesService.remove(Number(id));
  }

  @Post('categories/:id/image')
  @UseInterceptors(
    FileInterceptor('file', imageUploadOptions('categories')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadCategoryImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/categories/${file.filename}`;

    return this.categoriesService.update(Number(id), {
      imageUrl,
    });
  }

  @Get('products')
  findAllProducts() {
    return this.productsService.findAllForAdmin();
  }

  @Post('products')
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(Number(id), updateProductDto);
  }

  @Delete('products/:id')
  removeProduct(@Param('id') id: string) {
    return this.productsService.remove(Number(id));
  }

  @Post('products/:id/image')
  @UseInterceptors(
    FileInterceptor('file', imageUploadOptions('products')),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadProductImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/products/${file.filename}`;

    return this.productsService.update(Number(id), {
      imageUrl,
    });
  }
}