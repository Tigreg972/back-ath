import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';

type CatalogImage = {
  id: string;
  url: string;
  imageUrl: string;
  alt: string;
  altText: string;
  displayOrder: number;
};

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private normalizeImageUrl(url?: string) {
    if (!url) return '';

    if (url.startsWith('http')) {
      return url;
    }

    return url;
  }

  private mapCategory(category: Category) {
    return {
      id: category.id,
      name: category.name,
      slug: String(category.id),
      description: category.description || '',
      imageUrl: this.normalizeImageUrl(category.imageUrl),
      displayOrder: category.priority ?? 0,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private mapProduct(product: Product) {
    const imageUrl = this.normalizeImageUrl(product.imageUrl);

    const images: CatalogImage[] = [];

    if (imageUrl) {
      images.push({
        id: `${product.id}-main`,
        url: imageUrl,
        imageUrl,
        alt: product.name,
        altText: product.name,
        displayOrder: 0,
      });
    }

    if (Array.isArray(product.images)) {
      product.images.forEach((img, index) => {
        images.push({
          id: `${product.id}-${index + 1}`,
          url: img,
          imageUrl: img,
          alt: product.name,
          altText: product.name,
          displayOrder: index + 1,
        });
      });
    }

    return {
      id: product.id,
      sku: `ALT-${product.id}`,
      name: product.name,
      slug: String(product.id),
      shortDescription: product.description?.slice(0, 120) || '',
      description: product.description || '',
      techSpecs: product.technicalDetails || '',
      priceCents: Math.round(Number(product.price) * 100),
      stock: product.stock ?? 0,
      priority: product.priority ?? 0,
      isActive: product.isActive,
      categoryId: product.categoryId,
      category: product.category ? this.mapCategory(product.category) : null,
      images,
      imageUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async getHomeData() {
    const categories = await this.categoriesRepository.find({
      where: {
        isActive: true,
      },
      order: {
        priority: 'DESC',
        name: 'ASC',
      },
      take: 6,
    });

    const featured = await this.productsRepository.find({
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

    return {
      slides: [
        {
          id: 1,
          title: 'Althea Systems',
          subtitle: 'Matériel médical professionnel',
          imageUrl: '',
          ctaLabel: 'Voir le catalogue',
          ctaUrl: '/catalogue',
          displayOrder: 1,
          isActive: true,
        },
      ],
      homeText:
        'Découvrez notre catalogue de matériel médical professionnel pour cabinets et structures de santé.',
      categories: categories.map((category) => this.mapCategory(category)),
      featured: featured.map((product) => this.mapProduct(product)),
    };
  }

  async getCategories() {
    const categories = await this.categoriesRepository.find({
      where: {
        isActive: true,
      },
      order: {
        priority: 'DESC',
        name: 'ASC',
      },
    });

    return categories.map((category) => this.mapCategory(category));
  }

  async getCategoryBySlug(slug: string) {
    const id = Number(slug);

    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Catégorie introuvable');
    }

    return this.mapCategory(category);
  }

  async getProducts(query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(
      Math.max(Number(query.pageSize || query.limit) || 12, 1),
      50,
    );

    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (query.q || query.search) {
      const search = String(query.q || query.search).trim();

      qb.andWhere(
        new Brackets((qbWhere) => {
          qbWhere
            .where('product.name LIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('product.description LIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('product.technicalDetails LIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }

    if (query.category) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: Number(query.category),
      });
    }

    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }

    if (query.inStock === 'true' || query.inStock === true) {
      qb.andWhere('product.stock > 0');
    }

    if (query.minPriceCents) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: Number(query.minPriceCents) / 100,
      });
    }

    if (query.maxPriceCents) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: Number(query.maxPriceCents) / 100,
      });
    }

    if (query.sort === 'price_asc') {
      qb.orderBy('product.price', 'ASC');
    } else if (query.sort === 'price_desc') {
      qb.orderBy('product.price', 'DESC');
    } else {
      qb.orderBy('product.priority', 'DESC');
      qb.addOrderBy('product.stock', 'DESC');
      qb.addOrderBy('product.createdAt', 'DESC');
    }

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((product) => this.mapProduct(product)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProductBySlug(slug: string) {
    const id = Number(slug);

    const product = await this.productsRepository.findOne({
      where: {
        id,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return this.mapProduct(product);
  }
}