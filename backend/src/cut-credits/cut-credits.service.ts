import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditPlanType, TransactionType } from '@prisma/client';

@Injectable()
export class CutCreditsService {
  constructor(private prisma: PrismaService) {}

  async issueCutCredits(data: {
    targetOrgId: string;
    planType: CreditPlanType;
    credits?: number;
    validityDays?: number;
    userId: string;
    tenantId?: string;
    licenseId?: string;
    isOffer?: boolean;
    notes?: string;
  }) {
    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: data.targetOrgId }
    });

    if (!targetOrg) throw new NotFoundException('Target organization not found');

    if (targetOrg.parentId !== null && data.planType === CreditPlanType.USAGE && !data.isOffer) {
      throw new BadRequestException('Usage credits can only be minted directly to Top Level organizations. For child organizations, please transfer credits from a parent.');
    }

    return this.prisma.$transaction(async (tx) => {
      const grant = await (tx as any).cutCredit.create({
        data: {
          planType: data.planType,
          credits: data.planType === CreditPlanType.USAGE ? data.credits : null,
          validityDays: data.planType === CreditPlanType.UNLIMITED ? data.validityDays : null,
          ownerId: data.targetOrgId,
          tenantId: data.tenantId || data.targetOrgId,
          licenseId: data.licenseId || null,
          isOffer: data.isOffer || false,
          notes: data.notes || null,
        }
      });

      let wallet = await (tx as any).entityWallet.findUnique({ where: { orgId: data.targetOrgId } });
      if (!wallet) {
        wallet = await (tx as any).entityWallet.create({
          data: {
            orgId: data.targetOrgId,
            tenantId: data.tenantId || data.targetOrgId,
            balance: 0,
            totalCredits: 0
          }
        });
      }

      if (data.planType === CreditPlanType.USAGE && data.credits) {
        await (tx as any).entityWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: data.credits },
            totalCredits: { increment: data.credits },
            lastRechargedAt: new Date()
          }
        });

        await (tx as any).creditTransaction.create({
          data: {
            walletId: wallet.id,
            amount: data.credits,
            type: TransactionType.CREDIT,
            source: grant.id,
            tenantId: data.tenantId || data.targetOrgId,
            isOffer: data.isOffer || false,
            notes: data.notes || null,
          }
        });
      }

      return grant;
    });
  }

  async dispatch(data: { amount: number, fromOrgId: string, toOrgId: string, userId: string, tenantId?: string, isSuperAdmin?: boolean }) {
    if (data.amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      let fromWallet = await (tx as any).entityWallet.findUnique({ where: { orgId: data.fromOrgId } });
      if (!fromWallet || fromWallet.balance < data.amount) {
        throw new BadRequestException('Insufficient credits to dispatch.');
      }

      // Check unassigned credits (credits assigned to a license cannot be transferred)
      const unassignedCredits = await (tx as any).cutCredit.aggregate({
        where: { ownerId: data.fromOrgId, planType: CreditPlanType.USAGE, licenseId: null },
        _sum: { credits: true }
      });
      const availableToTransfer = unassignedCredits._sum.credits || 0;

      if (availableToTransfer < data.amount) {
        throw new BadRequestException('Insufficient unassigned credits to dispatch. Credits assigned to a license cannot be transferred.');
      }

      // Deduct from wallet
      await (tx as any).entityWallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: data.amount } }
      });
      await (tx as any).creditTransaction.create({
        data: {
          walletId: fromWallet.id,
          amount: -data.amount,
          type: TransactionType.DEBIT,
          tenantId: data.tenantId || data.fromOrgId
        }
      });

      // Deduct from unassigned CutCredit rows
      let remainingToDeduct = data.amount;
      const usageCredits = await (tx as any).cutCredit.findMany({
        where: { ownerId: data.fromOrgId, planType: CreditPlanType.USAGE, credits: { gt: 0 }, licenseId: null },
        orderBy: { createdAt: 'asc' }
      });
      for (const uc of usageCredits) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(uc.credits, remainingToDeduct);
        await (tx as any).cutCredit.update({
          where: { id: uc.id },
          data: { credits: { decrement: deduct } }
        });
        remainingToDeduct -= deduct;
      }

      // Add to target wallet
      let toWallet = await (tx as any).entityWallet.findFirst({ where: { OR: [{ orgId: data.toOrgId }, { tenantId: data.toOrgId }] } });
      if (!toWallet) {
        toWallet = await (tx as any).entityWallet.create({
          data: {
            orgId: data.toOrgId, // Legacy fallback
            tenantId: data.toOrgId, // This is the actual relation to Organization
            balance: 0,
            totalCredits: 0
          }
        });
      }

      await (tx as any).entityWallet.update({
        where: { id: toWallet.id },
        data: {
          balance: { increment: data.amount },
          totalCredits: { increment: data.amount },
          lastRechargedAt: new Date()
        }
      });

      await (tx as any).creditTransaction.create({
        data: {
          walletId: toWallet.id,
          amount: data.amount,
          type: TransactionType.CREDIT,
          tenantId: data.tenantId || data.fromOrgId
        }
      });

      // Create a CutCredit row for the recipient
      await (tx as any).cutCredit.create({
        data: {
          planType: CreditPlanType.USAGE,
          credits: data.amount,
          ownerId: data.toOrgId,
          tenantId: data.tenantId || data.fromOrgId,
        }
      });

      return toWallet;
    });
  }

  private async getDescendantOrgIds(rootOrgId: string): Promise<string[]> {
    if (!rootOrgId) return [];
    const allOrgIds = new Set<string>([rootOrgId]);
    let currentLevelIds = [rootOrgId];
    while (currentLevelIds.length > 0) {
      const children = await this.prisma.organization.findMany({
        where: { parentId: { in: currentLevelIds } },
        select: { id: true },
      });
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) break;
      childIds.forEach(id => allOrgIds.add(id));
      currentLevelIds = childIds;
    }
    return Array.from(allOrgIds);
  }

  async getMyInventory(orgId: string, isSuperAdmin = false, skip?: number, take?: number, search?: string, planType?: string) {
    const where: any = {};
    if (!isSuperAdmin) {
      const allowedOrgIds = await this.getDescendantOrgIds(orgId);
      where.ownerId = { in: allowedOrgIds };
    }

    if (search) {
      where.owner = { name: { contains: search, mode: 'insensitive' } };
    }

    if (planType) {
      where.planType = planType;
    }

    if (skip !== undefined || take !== undefined) {
      const [items, total] = await Promise.all([
        (this.prisma.cutCredit as any).findMany({
          where,
          include: { 
            owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } },
            tenant: { select: { name: true } },
            license: { select: { key: true, batch: { select: { licenseType: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          skip: skip ? parseInt(skip as any) : undefined,
          take: take ? parseInt(take as any) : undefined,
        }),
        (this.prisma.cutCredit as any).count({ where })
      ]);
      return { data: items, total };
    }

    return (this.prisma.cutCredit as any).findMany({
      where,
      include: { 
        owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } },
        tenant: { select: { name: true } },
        license: { select: { key: true, batch: { select: { licenseType: true } } } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransfers(orgId: string, isSuperAdmin = false) {
    const where: any = {};
    if (!isSuperAdmin) {
      where.OR = [
        { wallet: { tenantId: orgId } },
        { tenantId: orgId }
      ];
    }
    return (this.prisma.creditTransaction as any).findMany({
      where,
      include: { 
        wallet: { include: { tenant: { select: { name: true } } } },
        tenant: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getWallet(machineId: string) {
    return (this.prisma.entityWallet as any).findUnique({
      where: { machineId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } }
    });
  }
}
