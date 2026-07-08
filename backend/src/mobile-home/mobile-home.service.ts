import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MobileHomeService {
  constructor(private prisma: PrismaService) {}

  // Consumed by the mobile app (fetches all sections)
  async getMobileContent(user: any) {
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

    // Helper to fetch unique recent cuts with specific where condition
    const fetchRecentCutsWithWhere = async (whereCondition: any) => {
      const logs = await this.prisma.machineCutLog.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          brandName: true,
          modelName: true,
          patternName: true,
          createdAt: true,
          isPositiveCut: true,
          model: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
        take: 50,
      });

      const uniqueCuts = [];
      const seenModelIds = new Set<string>();
      for (const log of logs) {
        if (log.model && log.model.id) {
          if (!seenModelIds.has(log.model.id)) {
            seenModelIds.add(log.model.id);
            uniqueCuts.push(log);
            if (uniqueCuts.length >= 10) break;
          }
        }
      }
      return uniqueCuts;
    };

    // Helper to fetch top cuts with specific where condition
    const fetchTopCutsWithWhere = async (whereCondition: any) => {
      const groupedCuts = await this.prisma.machineCutLog.groupBy({
        by: ['modelId'],
        where: {
          ...whereCondition,
          modelId: { not: null },
        },
        _count: {
          modelId: true,
        },
        orderBy: {
          _count: {
            modelId: 'desc',
          },
        },
        take: 10,
      });

      if (groupedCuts.length === 0) return [];

      const modelIds = groupedCuts.map(g => g.modelId).filter((id): id is string => id !== null);
      const models = await this.prisma.model.findMany({
        where: {
          id: { in: modelIds },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          brand: {
            select: {
              name: true,
            },
          },
        },
      });

      return groupedCuts.map(g => {
        const modelObj = models.find(m => m.id === g.modelId);
        return {
          cutCount: g._count.modelId,
          model: modelObj,
        };
      }).filter(item => item.model != null);
    };

    let recentCuts: any[] = [];
    let topCuts: any[] = [];

    const orgId = user?.organizationId;

    if (orgId) {
      // Find the active license for this organization
      const activeLicense = await this.prisma.orgLicense.findFirst({
        where: {
          tenantId: orgId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      });

      // Stage 1: Org + License
      const whereStage1: any = { organizationId: orgId };
      if (activeLicense) {
        whereStage1.licenseId = activeLicense.id;
      }

      recentCuts = await fetchRecentCutsWithWhere(whereStage1);
      topCuts = await fetchTopCutsWithWhere(whereStage1);

      // Stage 2: Org Only (if less than 5 cuts found)
      if (recentCuts.length < 5 || topCuts.length < 5) {
        const whereStage2 = { organizationId: orgId };
        if (recentCuts.length < 5) {
          recentCuts = await fetchRecentCutsWithWhere(whereStage2);
        }
        if (topCuts.length < 5) {
          topCuts = await fetchTopCutsWithWhere(whereStage2);
        }
      }
    }

    // Stage 3: Global System Cuts fallback (if still less than 5 cuts found, or if no orgId is present)
    if (recentCuts.length < 5 || topCuts.length < 5) {
      if (recentCuts.length < 5) {
        recentCuts = await fetchRecentCutsWithWhere({});
      }
      if (topCuts.length < 5) {
        topCuts = await fetchTopCutsWithWhere({});
      }
    }

    // Fetch wallet info if user has an organizationId
    let wallet = null;
    let hasUnlimited = false;
    let unlimitedPlanType: string | null = null;
    let unlimitedEndDate: Date | null = null;

    if (orgId) {
      wallet = await this.prisma.entityWallet.findFirst({
        where: { tenantId: orgId },
        select: { balance: true }
      });

      const activeUnlimited = await this.prisma.cutCredit.findFirst({
        where: {
          tenantId: orgId,
          planType: { in: ['UNLIMITED', 'LIFETIME'] },
          startDate: { lte: new Date() },
          OR: [
            { endDate: { gte: new Date() } },
            { endDate: null }
          ]
        }
      });

      if (activeUnlimited) {
        hasUnlimited = true;
        unlimitedPlanType = activeUnlimited.planType;
        unlimitedEndDate = activeUnlimited.endDate;
      }
    }

    return {
      promotions,
      actions,
      infocards,
      recentCuts,
      topCuts,
      wallet: wallet ? { 
        balance: wallet.balance,
        hasUnlimited,
        unlimitedPlanType,
        unlimitedEndDate,
      } : null,
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
