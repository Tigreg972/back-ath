import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order!: Order;

  @ManyToOne(() => Product, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  product?: Product;

  @Column({ nullable: true })
  productId?: number;

  @Column()
  productName!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice!: number;

  @Column()
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total!: number;
}