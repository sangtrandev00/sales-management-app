// src/orders/entities/order.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customerName: string;

  @Column()
  customerEmail: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn()
  orderDate: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];
}
