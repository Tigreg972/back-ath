import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async searchProducts(query: SearchProductsDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 12, 1), 50);
    const skip = (page - 1) * limit;

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (query.search) {
      const search = query.search.trim();

      qb.andWhere(
        new Brackets((qbWhere) => {
          qbWhere
            .where('product.name = :exact', { exact: search })
            .orWhere('product.name LIKE :startsWith', {
              startsWith: `${search}%`,
            })
            .orWhere('product.name LIKE :contains', {
              contains: `%${search}%`,
            })
            .orWhere('product.description LIKE :contains', {
              contains: `%${search}%`,
            })
            .orWhere('product.technicalDetails LIKE :contains', {
              contains: `%${search}%`,
            });
        }),
      );

      qb.addSelect(
        `
        CASE
          WHEN product.name = :exact THEN 1
          WHEN product.name LIKE :startsWith THEN 2
          WHEN product.name LIKE :contains THEN 3
          WHEN product.description LIKE :contains THEN 4
          ELSE 5
        END
        `,
        'searchRank',
      );

      qb.setParameters({
        exact: search,
        startsWith: `${search}%`,
        contains: `%${search}%`,
      });

      qb.orderBy('searchRank', 'ASC');
    }

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }

    if (query.minPrice) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: Number(query.minPrice),
      });
    }

    if (query.maxPrice) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: Number(query.maxPrice),
      });
    }

    if (query.availableOnly === 'true') {
      qb.andWhere('product.stock > 0');
    }

    const sortOrder =
      query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (query.sortBy === 'price') {
      qb.addOrderBy('product.price', sortOrder);
    } else if (query.sortBy === 'newest') {
      qb.addOrderBy('product.createdAt', sortOrder);
    } else if (query.sortBy === 'availability') {
      qb.addOrderBy('product.stock', sortOrder);
    } else {
      qb.addOrderBy('product.priority', 'DESC');
      qb.addOrderBy('product.stock', 'DESC');
      qb.addOrderBy('product.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(search?: string, categoryId?: number): Promise<Product[]> {
    const result = await this.searchProducts({
      search,
      categoryId: categoryId ? String(categoryId) : undefined,
      limit: '50',
    });

    return result.items;
  }

  async findFeatured(): Promise<Product[]> {
    return this.productsRepository.find({
      where: {
        isActive: true,
        isFeatured: true,
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
      take: 8,
    });
  }

  async findAllForAdmin(): Promise<Product[]> {
    return this.productsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const category = await this.categoriesRepository.findOne({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    const product = this.productsRepository.create({
      ...createProductDto,
      category,
    });

    return this.productsRepository.save(product);
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Catégorie introuvable');
      }

      product.category = category;
    }

    Object.assign(product, updateProductDto);

    return this.productsRepository.save(product);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);

    await this.productsRepository.remove(product);

    return {
      message: 'Produit supprimé avec succès',
    };
  }
}