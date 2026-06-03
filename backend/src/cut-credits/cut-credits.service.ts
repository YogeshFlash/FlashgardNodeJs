import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditStatus, CreditPlanType, TransferStatus, TransactionType } from '@prisma/client';
import { resolveTransferPath } from '../utils/hierarchy.util';
import { decryptLicenseKey } from '../utils/encryption';

@Injectable()
export class CutCreditsService {
  constructor(private prisma: PrismaService) {}

  private generateHierarchicalKey(type: string, batchCode: string, sequence: number): string {
    const typeCode = type.substring(0, 3).toUpperCase();
    const batchSuffix = batchCode.split('-').pop() || '000';
    const seqStr = sequence.toString().padStart(4, '0');
    return `${typeCode}-${batchSuffix}-${seqStr}`;
  }

  async issueCutCredits(data: {
    targetOrgId: string;
    planType: CreditPlanType;
    totalCount: number;
    creditsPerKey?: number;
    validityDays?: number;
    userId: string;
    tenantId?: string;
    licenseId: string;
  }) {
    if (!data.licenseId) throw new BadRequestException('Credits must be linked to a machine license');

    const targetOrg = await (this.prisma.organization as any).findUnique({
      where: { id: data.targetOrgId }
    });

    if (!targetOrg) throw new NotFoundException('Target organization not found');

    const existingCount = await (this.prisma.cutCredit as any).count({
      where: { ownerId: data.targetOrgId, batch: { planType: data.planType } }
    });

    const startDate = new Date();
    const expiryDate = data.validityDays ? new Date(startDate.getTime() + data.validityDays * 24 * 60 * 60 * 1000) : null;

    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
    const orgPart = targetOrg.name.substring(0, 3).toUpperCase();
    const batchCode = `CB-${dateStr}-${orgPart}-${Date.now().toString().slice(-6)}`;

    const credits = Array.from({ length: data.totalCount }).map((_, index) => ({
      key: this.generateHierarchicalKey(data.planType, batchCode, existingCount + index + 1),
      ownerId: data.targetOrgId,
      remainingCredits: data.planType === CreditPlanType.USAGE ? data.creditsPerKey : null,
      status: CreditStatus.AVAILABLE,
      startDate,
      expiryDate,
      tenantId: data.tenantId || data.targetOrgId,
      licenseId: data.licenseId || null,
    }));

    return this.prisma.$transaction(async (tx) => {
      const batch = await (tx as any).cutCreditBatch.create({
        data: {
          batchCode,
          planType: data.planType,
          totalCount: data.totalCount,
          creditsPerKey: data.creditsPerKey,
          validityDays: data.validityDays,
          createdBy: data.userId,
          tenantId: data.tenantId || data.targetOrgId,
          credits: { create: credits },
        },
        include: { credits: true },
      });
      return batch;
    });
  }

  async dispatch(data: { creditIds: string[], fromOrgId: string, toOrgId: string, userId: string, tenantId?: string, isSuperAdmin?: boolean }) {
    console.log(`[CutCreditsService] Dispatching ${data.creditIds.length} credits. From: ${data.fromOrgId}, To: ${data.toOrgId}`);
    
    const where: any = { id: { in: data.creditIds }, status: CreditStatus.AVAILABLE };
    if (!data.isSuperAdmin) {
      where.ownerId = data.fromOrgId;
    }

    const credits = await (this.prisma.cutCredit as any).findMany({ where });

    console.log(`[CutCreditsService] Found ${credits.length} available credits to dispatch.`);

    if (credits.length !== data.creditIds.length) {
      throw new BadRequestException(`Some credits are unavailable. Expected ${data.creditIds.length}, found ${credits.length}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const effectiveFromOrgId = data.fromOrgId || credits[0].ownerId;

      const path = await resolveTransferPath(tx, effectiveFromOrgId, data.toOrgId);
      
      let finalTransfer = null;

      // Loop through the path and create sequential transfers
      for (let i = 0; i < path.length - 1; i++) {
        const fromId = path[i];
        const toId = path[i + 1];
        const isLast = i === path.length - 2;

        const transfer = await (tx as any).licensingTransfer.create({
          data: {
            fromOrgId: fromId,
            toOrgId: toId,
            status: isLast ? TransferStatus.PENDING : TransferStatus.COMPLETED,
            resolvedAt: isLast ? null : new Date(),
            resolvedBy: isLast ? null : data.userId,
            tenantId: data.tenantId || effectiveFromOrgId,
            items: { create: data.creditIds.map((id: any) => ({ creditId: id })) }
          }
        });

        if (isLast) {
          finalTransfer = transfer;
        }
      }
      await (tx as any).cutCredit.updateMany({
        where: { id: { in: data.creditIds } },
        data: { status: CreditStatus.IN_TRANSIT }
      });
      return finalTransfer;
    });
  }

  async acceptTransfer(transferId: string, userId: string) {
    const transfer = await (this.prisma.licensingTransfer as any).findUnique({
      where: { id: transferId },
      include: { items: true }
    });
    if (!transfer || transfer.status !== TransferStatus.PENDING) throw new BadRequestException('Transfer not pending');
    const creditIds = transfer.items.filter((i: any) => i.creditId).map((i: any) => i.creditId);

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).cutCredit.updateMany({
        where: { id: { in: creditIds } },
        data: { ownerId: transfer.toOrgId, status: CreditStatus.AVAILABLE, tenantId: transfer.toOrgId }
      });
      return (tx as any).licensingTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.COMPLETED, resolvedAt: new Date(), resolvedBy: userId }
      });
    });
  }

  async activate(data: { key: string, machineId: string, fingerprint: any, geo: any, userId: string }) {
    const credit = await (this.prisma.cutCredit as any).findUnique({
      where: { key: data.key },
      include: { batch: true }
    });

    if (!credit) throw new NotFoundException('Credit key not found.');
    if (credit.status !== CreditStatus.AVAILABLE) throw new BadRequestException(`Key status is ${credit.status}`);

    if (credit.deviceHash && credit.deviceHash !== data.fingerprint.deviceHash) {
      await (this.prisma.securityAlert as any).create({
        data: {
          creditId: credit.id,
          attemptedFingerprint: data.fingerprint,
          storedFingerprint: { deviceHash: credit.deviceHash, macAddress: credit.macAddress },
          ipAddress: data.geo.ip,
          tenantId: credit.tenantId
        }
      });
      throw new BadRequestException('Machine fingerprint mismatch!');
    }

    const creditsToDeposit = credit.remainingCredits || 0;

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).cutCredit.update({
        where: { id: credit.id },
        data: {
          status: CreditStatus.CONSUMED,
          activatedAt: new Date(),
          machineId: data.machineId,
          macAddress: data.fingerprint.macAddress,
          deviceHash: data.fingerprint.deviceHash,
          geoCity: data.geo.city,
          geoCountry: data.geo.country
        }
      });

      let wallet = await (tx as any).entityWallet.findUnique({ where: { machineId: data.machineId } });
      if (!wallet) {
        wallet = await (tx as any).entityWallet.create({
          data: {
            machineId: data.machineId,
            tenantId: credit.tenantId,
            balance: 0,
            totalCredits: 0
          }
        });
      }

      await (tx as any).entityWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: creditsToDeposit },
          totalCredits: { increment: creditsToDeposit },
          lastRechargedAt: new Date()
        }
      });

      await (tx as any).creditTransaction.create({
        data: {
          walletId: wallet.id,
          amount: creditsToDeposit,
          type: TransactionType.CREDIT,
          source: credit.id,
          tenantId: credit.tenantId
        }
      });

      return (tx as any).entityWallet.findUnique({ where: { id: wallet.id } });
    });
  }

  async getMyInventory(orgId: string, isSuperAdmin = false, skip?: number, take?: number, search?: string, batchId?: string) {
    const where: any = isSuperAdmin ? {} : { ownerId: orgId };

    if (batchId) {
      where.batchId = batchId;
    }

    if (search) {
      const searchFilter = {
        OR: [
          { owner: { name: { contains: search, mode: 'insensitive' } } },
          { batch: { batchCode: { contains: search, mode: 'insensitive' } } },
          { status: { equals: search.toUpperCase() as any } },
        ].filter(Boolean)
      };

      if (where.OR) {
        where.AND = [searchFilter];
      } else {
        Object.assign(where, searchFilter);
      }
    }

    if (skip !== undefined || take !== undefined) {
      const [items, total] = await Promise.all([
        (this.prisma.cutCredit as any).findMany({
          where,
          include: { 
            batch: true,
            owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } }
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
        batch: true,
        owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransfers(orgId: string, isSuperAdmin = false) {
    const where: any = isSuperAdmin ? {} : { OR: [ { fromOrgId: orgId }, { toOrgId: orgId } ] };
    const transfers = await (this.prisma.licensingTransfer as any).findMany({
      where,
      include: {
        fromOrg: { select: { name: true } },
        toOrg: { select: { name: true } },
        items: { include: { license: true, credit: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    for (const t of transfers) {
      if (t.items) {
        for (const item of t.items) {
          if (item.license && item.license.key) {
            item.license.key = decryptLicenseKey(item.license.key);
          }
        }
      }
    }
    return transfers;
  }

  async getBatches() {
    return (this.prisma.cutCreditBatch as any).findMany({
      include: { _count: { select: { credits: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWallet(machineId: string) {
    return (this.prisma.entityWallet as any).findUnique({
      where: { machineId },
      include: { transactions: { orderBy: { createdAt: 'desc' } } }
    });
  }
}
