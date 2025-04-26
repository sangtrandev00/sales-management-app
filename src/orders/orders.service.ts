// src/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private productsService: ProductsService,
    private connection: Connection,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Create transaction
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create order
      const order = this.ordersRepository.create({
        customerName: createOrderDto.customerName,
        customerEmail: createOrderDto.customerEmail,
        customerPhone: createOrderDto.customerPhone,
        shippingAddress: createOrderDto.shippingAddress,
        status: 'pending',
        totalAmount: 0,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items and calculate total
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const item of createOrderDto.orderItems) {
        const product = await this.productsService.findOne(item.productId);

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for product: ${product.name}`,
          );
        }

        const orderItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });

        orderItems.push(orderItem);
        totalAmount += product.price * item.quantity;

        // Update product stock
        product.stock -= item.quantity;
        await queryRunner.manager.save(product);
      }

      // Save order items
      await queryRunner.manager.save(orderItems);

      // Update order total
      savedOrder.totalAmount = totalAmount;
      await queryRunner.manager.save(savedOrder);

      await queryRunner.commitTransaction();

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['orderItems', 'orderItems.product'],
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['orderItems', 'orderItems.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);

    if (updateOrderDto.customerName)
      order.customerName = updateOrderDto.customerName;
    if (updateOrderDto.customerEmail)
      order.customerEmail = updateOrderDto.customerEmail;
    if (updateOrderDto.customerPhone)
      order.customerPhone = updateOrderDto.customerPhone;
    if (updateOrderDto.shippingAddress)
      order.shippingAddress = updateOrderDto.shippingAddress;

    await this.ordersRepository.save(order);
    return this.findOne(id);
  }

  async updateStatus(id: number, status: string): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    await this.ordersRepository.save(order);
    return order;
  }
}
