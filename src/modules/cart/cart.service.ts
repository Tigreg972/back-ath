import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  private sanitizeCart(items: CartItem[]) {
    return items.map((item) => ({
      id: item.id,

      quantity: item.quantity,

      createdAt: item.createdAt,
      updatedAt: item.updatedAt,

      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        technicalDetails: item.product.technicalDetails,
        price: item.product.price,
        stock: item.product.stock,
        imageUrl: item.product.imageUrl,
        images: item.product.images,
        priority: item.product.priority,
        isActive: item.product.isActive,
        isFeatured: item.product.isFeatured,
        categoryId: item.product.categoryId,
      },
    }));
  }

  async getCart(userId: number) {
    const items = await this.cartItemsRepository.find({
      where: { userId },
      order: {
        createdAt: 'DESC',
      },
    });

    const total = items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return {
      items: this.sanitizeCart(items),
      total,
    };
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto) {
    const product = await this.productsRepository.findOne({
      where: {
        id: addToCartDto.productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    if (product.stock <= 0) {
      throw new BadRequestException('Produit en rupture de stock');
    }

    if (addToCartDto.quantity > product.stock) {
      throw new BadRequestException(
        'Quantité demandée supérieure au stock',
      );
    }

    const existingItem = await this.cartItemsRepository.findOne({
      where: {
        userId,
        productId: product.id,
      },
    });

    if (existingItem) {
      const newQuantity =
        existingItem.quantity + addToCartDto.quantity;

      if (newQuantity > product.stock) {
        throw new BadRequestException(
          'Quantité totale supérieure au stock',
        );
      }

      existingItem.quantity = newQuantity;

      await this.cartItemsRepository.save(existingItem);

      return this.getCart(userId);
    }

    const item = this.cartItemsRepository.create({
      userId,
      productId: product.id,
      quantity: addToCartDto.quantity,
    });

    await this.cartItemsRepository.save(item);

    return this.getCart(userId);
  }

  async updateItem(
    userId: number,
    itemId: number,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const item = await this.cartItemsRepository.findOne({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'Article du panier introuvable',
      );
    }

    if (updateCartItemDto.quantity > item.product.stock) {
      throw new BadRequestException(
        'Quantité supérieure au stock disponible',
      );
    }

    item.quantity = updateCartItemDto.quantity;

    await this.cartItemsRepository.save(item);

    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.cartItemsRepository.findOne({
      where: {
        id: itemId,
        userId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'Article du panier introuvable',
      );
    }

    await this.cartItemsRepository.remove(item);

    return this.getCart(userId);
  }

  async clearCart(userId: number) {
    await this.cartItemsRepository.delete({
      userId,
    });

    return {
      message: 'Panier vidé avec succès',
    };
  }
}