import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async getDashboardStats() {
    const totalUsers = await this.usersRepository.count();

    const totalProducts = await this.productsRepository.count();

    const totalOrders = await this.ordersRepository.count();

    const lowStockProducts = await this.productsRepository.count({
      where: {
        stock: 5,
      },
    });

    const orders = await this.ordersRepository.find();

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number(order.total);
    }, 0);

    const latestOrders = await this.ordersRepository.find({
      order: {
        createdAt: 'DESC',
      },
      take: 5,
    });

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      lowStockProducts,
      latestOrders,
    };
  }

  getDashboardMessage() {
    return {
      message: 'Backoffice Althea Systems',
      status: 'Admin API opérationnelle',
    };
  }
}