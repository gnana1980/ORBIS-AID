import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Plans Service
 * Manages subscription plans
 */
@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all active plans
   */
  async findAll() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get plan by ID
   */
  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  /**
   * Get plan by name
   */
  async findByName(name: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { name },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }
}