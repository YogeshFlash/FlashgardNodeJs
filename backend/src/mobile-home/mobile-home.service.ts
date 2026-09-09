import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MobileHomeService {
  constructor(private prisma: PrismaService) {}

  // In-memory caches to prevent heavy repetitive database queries
  private staticCache: {
    promotions: any[];
    actions: any[];
    infocards: any[];
    expiry: number;
  } | null = null;

  private globalTopCutsCache: {
    data: any[];
    expiry: number;
  } | null = null;

  private invalidateStaticCache() {
    this.staticCache = null;
  }

  // Get static sections (promotions, quick actions, infocards) with 5-min caching
  private async getStaticSections() {
    const now = Date.now();
    if (this.staticCache && this.staticCache.expiry > now) {
      return this.staticCache;
    }

    const [promotions, actions, infocards] = await Promise.all([
      this.prisma.mobilePromotion.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.mobileQuickAction.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.mobileInfoCard.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    this.staticCache = {
      promotions,
      actions,
      infocards,
      expiry: now + 5 * 60 * 1000, // 5 minutes
    };

    return this.staticCache;
  }

  // Get global top cuts with 15-min in-memory cache (prevents full-table groupBy scans)
  private async getGlobalTopCuts(): Promise<any[]> {
    const now = Date.now();
    if (this.globalTopCutsCache && this.globalTopCutsCache.expiry > now) {
      return this.globalTopCutsCache.data;
    }

    try {
      // Look at recent 30 days to avoid full table scans across millions of old logs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const grouped = await this.prisma.machineCutLog.groupBy({
        by: ['modelId'],
        where: {
          modelId: { not: null },
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { modelId: true },
        orderBy: { _count: { modelId: 'desc' } },
        take: 10,
      });

      let result: any[] = [];

      if (grouped.length > 0) {
        const modelIds = grouped.map(g => g.modelId).filter((id): id is string => id !== null);
        const models = await this.prisma.model.findMany({
          where: { id: { in: modelIds } },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            brand: { select: { name: true } },
          },
        });

        result = grouped
          .map(g => ({
            cutCount: g._count.modelId,
            model: models.find(m => m.id === g.modelId),
          }))
          .filter(item => item.model != null);
      }

      // Fallback to active models if no recent cut logs
      if (result.length < 5) {
        const popularModels = await this.prisma.model.findMany({
          where: { isActive: true },
          take: 10,
          select: {
            id: true,
            name: true,
            imageUrl: true,
            brand: { select: { name: true } },
          },
        });

        const existingIds = new Set(result.map(r => r.model.id));
        for (const m of popularModels) {
          if (!existingIds.has(m.id)) {
            result.push({ cutCount: 1, model: m });
            if (result.length >= 10) break;
          }
        }
      }

      this.globalTopCutsCache = { data: result, expiry: now + 15 * 60 * 1000 };
      return result;
    } catch (e) {
      return [];
    }
  }

  // Fast retrieval of unique recent cuts using indexed queries
  private async getRecentCuts(orgId?: string): Promise<any[]> {
    const select = {
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
    };

    // Stage 1: Org recent cuts (uses indexed [organizationId, createdAt(sort: Desc)])
    const logs = await this.prisma.machineCutLog.findMany({
      where: orgId ? { organizationId: orgId } : {},
      orderBy: { createdAt: 'desc' },
      take: 30,
      select,
    });

    const uniqueCuts: any[] = [];
    const seenModelIds = new Set<string>();

    for (const log of logs) {
      if (log.model?.id) {
        if (!seenModelIds.has(log.model.id)) {
          seenModelIds.add(log.model.id);
          uniqueCuts.push(log);
          if (uniqueCuts.length >= 10) break;
        }
      }
    }

    // If org has fewer than 5 cuts, supplement with global system cuts (uses indexed [createdAt(sort: Desc)])
    if (uniqueCuts.length < 5 && orgId) {
      const globalLogs = await this.prisma.machineCutLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select,
      });

      for (const log of globalLogs) {
        if (log.model?.id && !seenModelIds.has(log.model.id)) {
          seenModelIds.add(log.model.id);
          uniqueCuts.push(log);
          if (uniqueCuts.length >= 10) break;
        }
      }
    }

    return uniqueCuts;
  }

  // Fast retrieval of top cuts (in-memory aggregation of recent logs + global cache fallback)
  private async getTopCuts(orgId?: string): Promise<any[]> {
    const globalTop = await this.getGlobalTopCuts();
    if (!orgId) return globalTop;

    // Fast indexed query: look at last 50 cuts for this org
    const orgLogs = await this.prisma.machineCutLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        modelId: true,
        model: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            brand: { select: { name: true } },
          },
        },
      },
    });

    if (orgLogs.length === 0) return globalTop;

    // Count in-memory (0.01ms vs seconds in DB)
    const counts: Record<string, { count: number; model: any }> = {};
    for (const log of orgLogs) {
      if (log.modelId && log.model) {
        if (!counts[log.modelId]) {
          counts[log.modelId] = { count: 0, model: log.model };
        }
        counts[log.modelId].count += 1;
      }
    }

    const orgTop = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({ cutCount: item.count, model: item.model }));

    // If org has fewer than 5 top cuts, merge with global top cuts
    if (orgTop.length < 5) {
      const existingIds = new Set(orgTop.map(t => t.model.id));
      for (const g of globalTop) {
        if (!existingIds.has(g.model.id)) {
          orgTop.push(g);
          if (orgTop.length >= 10) break;
        }
      }
    }

    return orgTop;
  }

  // Optimized Mobile App Content Endpoint
  async getMobileContent(user: any) {
    const orgId = user?.organizationId;
    const now = new Date();

    // Execute static content, cuts, wallet, and unlimited plan all in parallel
    const [staticData, recentCuts, topCuts, wallet, activeUnlimited] = await Promise.all([
      this.getStaticSections(),
      this.getRecentCuts(orgId),
      this.getTopCuts(orgId),
      orgId
        ? this.prisma.entityWallet.findFirst({
            where: { tenantId: orgId },
            select: { balance: true },
          })
        : null,
      orgId
        ? this.prisma.cutCredit.findFirst({
            where: {
              tenantId: orgId,
              planType: { in: ['UNLIMITED', 'LIFETIME'] },
              startDate: { lte: now },
              OR: [{ endDate: { gte: now } }, { endDate: null }],
            },
            select: { planType: true, endDate: true },
          })
        : null,
    ]);

    return {
      promotions: staticData.promotions,
      actions: staticData.actions,
      infocards: staticData.infocards,
      recentCuts,
      topCuts,
      wallet: wallet
        ? {
            balance: wallet.balance,
            hasUnlimited: !!activeUnlimited,
            unlimitedPlanType: activeUnlimited?.planType ?? null,
            unlimitedEndDate: activeUnlimited?.endDate ?? null,
          }
        : null,
    };
  }

  // --- Promotions CRUD ---
  async getPromotions() {
    return this.prisma.mobilePromotion.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPromotion(data: any) {
    this.invalidateStaticCache();
    return this.prisma.mobilePromotion.create({ data });
  }

  async updatePromotion(id: string, data: any) {
    this.invalidateStaticCache();
    return this.prisma.mobilePromotion.update({
      where: { id },
      data,
    });
  }

  async deletePromotion(id: string) {
    this.invalidateStaticCache();
    return this.prisma.mobilePromotion.delete({ where: { id } });
  }

  // --- Quick Actions CRUD ---
  async getActions() {
    return this.prisma.mobileQuickAction.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createAction(data: any) {
    this.invalidateStaticCache();
    return this.prisma.mobileQuickAction.create({ data });
  }

  async updateAction(id: string, data: any) {
    this.invalidateStaticCache();
    return this.prisma.mobileQuickAction.update({
      where: { id },
      data,
    });
  }

  async deleteAction(id: string) {
    this.invalidateStaticCache();
    return this.prisma.mobileQuickAction.delete({ where: { id } });
  }

  // --- Info Cards CRUD ---
  async getInfoCards() {
    return this.prisma.mobileInfoCard.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createInfoCard(data: any) {
    this.invalidateStaticCache();
    return this.prisma.mobileInfoCard.create({ data });
  }

  async updateInfoCard(id: string, data: any) {
    this.invalidateStaticCache();
    return this.prisma.mobileInfoCard.update({
      where: { id },
      data,
    });
  }

  async deleteInfoCard(id: string) {
    this.invalidateStaticCache();
    return this.prisma.mobileInfoCard.delete({ where: { id } });
  }
}
