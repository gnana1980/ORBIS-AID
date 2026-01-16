import { Controller, Get, Param } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Plans Controller
 * Public endpoints to view available plans
 */
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  /**
   * Get all active plans
   * GET /plans
   * Public endpoint - anyone can view plans
   */
  @Public()
  @Get()
  async findAll() {
    return this.plansService.findAll();
  }

  /**
   * Get plan by ID
   * GET /plans/:id
   */
  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }
}