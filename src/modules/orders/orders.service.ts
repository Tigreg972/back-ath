import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,

    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async createFromCart(userId: number, createOrderDto: CreateOrderDto) {
    const cartItems = await this.cartItemsRepository.find({
      where: { userId },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    let total = 0;

    for (const cartItem of cartItems) {
      if (!cartItem.product) {
        throw new BadRequestException('Produit introuvable dans le panier');
      }

      if (cartItem.quantity > cartItem.product.stock) {
        throw new BadRequestException(
          `Stock insuffisant pour ${cartItem.product.name}`,
        );
      }

      total += Number(cartItem.product.price) * cartItem.quantity;
    }

    const order = this.ordersRepository.create({
      userId,
      total,
      status: OrderStatus.PAID,
      billingAddress: createOrderDto.billingAddress,
      paymentMethod: createOrderDto.paymentMethod,
    });

    const savedOrder = await this.ordersRepository.save(order);

    const orderItems = cartItems.map((cartItem) =>
      this.orderItemsRepository.create({
        order: savedOrder,
        product: cartItem.product,
        productId: cartItem.product.id,
        productName: cartItem.product.name,
        unitPrice: Number(cartItem.product.price),
        quantity: cartItem.quantity,
        total: Number(cartItem.product.price) * cartItem.quantity,
      }),
    );

    await this.orderItemsRepository.save(orderItems);

    for (const cartItem of cartItems) {
      const product = await this.productsRepository.findOne({
        where: { id: cartItem.productId },
      });

      if (product) {
        product.stock = product.stock - cartItem.quantity;
        await this.productsRepository.save(product);
      }
    }

    await this.cartItemsRepository.delete({ userId });

    return this.findOne(userId, savedOrder.id);
  }

  async findMyOrders(userId: number) {
    return this.ordersRepository.find({
      where: { userId },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(userId: number, orderId: number) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }

  async findAllForAdmin() {
    return this.ordersRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }
}