import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MobileHomeService {
  constructor(private prisma: PrismaService) {}

  // Consumed by the mobile app (fetches all sections)
  async getMobileContent() {
    const promotions = await this.prisma.mobilePromotion.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const actions = await this.prisma.mobileQuickAction.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const infocards = await this.prisma.mobileInfoCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      promotions,
      actions,
      infocards,
    };
  }

  // --- Promotions CRUD ---
  async getPromotions() {
    return this.prisma.mobilePromotion.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPromotion(data: any) {
    return this.prisma.mobilePromotion.create({ data });
  }

  async updatePromotion(id: string, data: any) {
    return this.prisma.mobilePromotion.update({
      where: { id },
      data,
    });
  }

  async deletePromotion(id: string) {
    return this.prisma.mobilePromotion.delete({ where: { id } });
  }

  // --- Quick Actions CRUD ---
  async getActions() {
    return this.prisma.mobileQuickAction.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createAction(data: any) {
    return this.prisma.mobileQuickAction.create({ data });
  }

  async updateAction(id: string, data: any) {
    return this.prisma.mobileQuickAction.update({
      where: { id },
      data,
    });
  }

  async deleteAction(id: string) {
    return this.prisma.mobileQuickAction.delete({ where: { id } });
  }

  // --- Info Cards CRUD ---
  async getInfoCards() {
    return this.prisma.mobileInfoCard.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createInfoCard(data: any) {
    return this.prisma.mobileInfoCard.create({ data });
  }

  async updateInfoCard(id: string, data: any) {
    return this.prisma.mobileInfoCard.update({
      where: { id },
      data,
    });
  }

  async deleteInfoCard(id: string) {
    return this.prisma.mobileInfoCard.delete({ where: { id } });
  }
}
