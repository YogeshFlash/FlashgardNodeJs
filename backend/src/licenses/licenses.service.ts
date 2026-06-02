import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgLicenseStatus, OrgLicenseType, TransferStatus } from '@prisma/client';
import { encryptLicenseKey, decryptLicenseKey } from '../utils/encryption';

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  private generateProfessionalKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, I, 1, 0 to avoid confusion
    const segment = () => Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    return `${segment()}-${segment()}-${segment()}-${segment()}-${segment()}`;
  }

  async issueOrgLicense(data: {
    targetOrgId: string;
    licenseType: OrgLicenseType;
    totalCount: number;
    validityDays?: number;
    userId: string;
    tenantId?: string;
  }) {
    const targetOrg = await (this.prisma.organization as any).findUnique({
      where: { id: data.targetOrgId }
    });

    if (!targetOrg) throw new NotFoundException('Target organization not found');

    const existingCount = await (this.prisma.orgLicense as any).count({
      where: { ownerId: data.targetOrgId, batch: { licenseType: data.licenseType } }
    });

    const startDate = new Date();
    const expiryDate = data.validityDays ? new Date(startDate.getTime() + data.validityDays * 24 * 60 * 60 * 1000) : null;

    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
    const orgPart = targetOrg.name.substring(0, 3).toUpperCase();
    const batchCode = `LB-${dateStr}-${orgPart}-${Date.now().toString().slice(-6)}`;

    const licenses = Array.from({ length: data.totalCount }).map((_, index) => ({
      key: encryptLicenseKey(this.generateProfessionalKey()),
      ownerId: data.targetOrgId,
      status: OrgLicenseStatus.AVAILABLE,
      startDate,
      expiryDate,
      tenantId: data.tenantId || data.targetOrgId,
    }));

    return this.prisma.$transaction(async (tx) => {
      const batch = await (tx as any).orgLicenseBatch.create({
        data: {
          batchCode,
          licenseType: data.licenseType,
          totalCount: data.totalCount,
          createdBy: data.userId,
          tenantId: data.tenantId || data.targetOrgId,
          licenses: { create: licenses },
        },
        include: { licenses: true },
      });
      if (batch && batch.licenses) {
        batch.licenses = batch.licenses.map((l: any) => ({
          ...l,
          key: decryptLicenseKey(l.key),
        }));
      }
      return batch;
    });
  }

  async dispatch(data: { licenseIds: string[], fromOrgId: string, toOrgId: string, userId: string, tenantId?: string, isSuperAdmin?: boolean }) {
    console.log(`[LicensesService] Dispatching ${data.licenseIds.length} licenses. From: ${data.fromOrgId}, To: ${data.toOrgId}`);
    
    const where: any = { id: { in: data.licenseIds }, status: OrgLicenseStatus.AVAILABLE };
    if (!data.isSuperAdmin) {
      where.ownerId = data.fromOrgId;
    }

    const licenses = await (this.prisma.orgLicense as any).findMany({ where });

    console.log(`[LicensesService] Found ${licenses.length} available licenses to dispatch.`);

    if (licenses.length !== data.licenseIds.length) {
      throw new BadRequestException(`Some licenses are unavailable. Expected ${data.licenseIds.length}, found ${licenses.length}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Use the actual current owner of the first license for the transfer if fromOrgId was not set (Super Admin)
      const effectiveFromOrgId = data.fromOrgId || licenses[0].ownerId;

      const transfer = await (tx as any).licensingTransfer.create({
        data: {
          fromOrgId: effectiveFromOrgId,
          toOrgId: data.toOrgId,
          status: TransferStatus.COMPLETED,
          resolvedAt: new Date(),
          resolvedBy: data.userId,
          tenantId: data.tenantId || effectiveFromOrgId,
          items: { create: data.licenseIds.map((id: any) => ({ licenseId: id })) }
        }
      });

      await (tx as any).orgLicense.updateMany({
        where: { id: { in: data.licenseIds } },
        data: { 
          status: OrgLicenseStatus.AVAILABLE,
          ownerId: data.toOrgId,
          tenantId: data.toOrgId
        }
      });

      return transfer;
    });
  }

  async acceptTransfer(transferId: string, userId: string) {
    const transfer = await (this.prisma.licensingTransfer as any).findUnique({
      where: { id: transferId },
      include: { items: true }
    });
    if (!transfer || transfer.status !== TransferStatus.PENDING) throw new BadRequestException('Transfer not pending');
    const licenseIds = transfer.items.filter((i: any) => i.licenseId).map((i: any) => i.licenseId);

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).orgLicense.updateMany({
        where: { id: { in: licenseIds } },
        data: { ownerId: transfer.toOrgId, status: OrgLicenseStatus.AVAILABLE, tenantId: transfer.toOrgId }
      });
      return (tx as any).licensingTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.COMPLETED, resolvedAt: new Date(), resolvedBy: userId }
      });
    });
  }

  async rejectTransfer(transferId: string, userId: string) {
    const transfer = await (this.prisma.licensingTransfer as any).findUnique({
      where: { id: transferId },
      include: { items: true }
    });
    if (!transfer || transfer.status !== TransferStatus.PENDING) throw new BadRequestException('Transfer not pending');
    const licenseIds = transfer.items.filter((i: any) => i.licenseId).map((i: any) => i.licenseId);

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).orgLicense.updateMany({
        where: { id: { in: licenseIds } },
        data: { status: OrgLicenseStatus.AVAILABLE }
      });
      return (tx as any).licensingTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.REJECTED, resolvedAt: new Date(), resolvedBy: userId }
      });
    });
  }

  async recallTransfer(transferId: string, userId: string) {
    const transfer = await (this.prisma.licensingTransfer as any).findUnique({
      where: { id: transferId },
      include: { items: true }
    });
    if (!transfer || transfer.status !== TransferStatus.PENDING) throw new BadRequestException('Transfer not pending');
    const licenseIds = transfer.items.filter((i: any) => i.licenseId).map((i: any) => i.licenseId);

    return this.prisma.$transaction(async (tx) => {
      await (tx as any).orgLicense.updateMany({
        where: { id: { in: licenseIds } },
        data: { status: OrgLicenseStatus.AVAILABLE }
      });
      return (tx as any).licensingTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.RECALLED, resolvedAt: new Date(), resolvedBy: userId }
      });
    });
  }

  async activate(data: { key: string, userId: string, fingerprint?: any, geo?: any }) {
    const encryptedKey = encryptLicenseKey(data.key);
    const license = await (this.prisma.orgLicense as any).findUnique({
      where: { key: encryptedKey },
      include: { batch: true }
    });
    if (!license) throw new NotFoundException('License not found');
    if (license.status !== OrgLicenseStatus.AVAILABLE) throw new BadRequestException(`License status is ${license.status}`);

    if (license.deviceHash && data.fingerprint && license.deviceHash !== data.fingerprint.deviceHash) {
      await (this.prisma.securityAlert as any).create({
        data: {
          licenseId: license.id,
          attemptedFingerprint: data.fingerprint,
          storedFingerprint: { deviceHash: license.deviceHash, macAddress: license.macAddress },
          ipAddress: data.geo?.ip,
          tenantId: license.tenantId
        }
      });
      throw new BadRequestException('Machine fingerprint mismatch!');
    }

    const updated = await (this.prisma.orgLicense as any).update({
      where: { id: license.id },
      data: {
        status: OrgLicenseStatus.ACTIVE,
        activatedAt: new Date(),
        macAddress: data.fingerprint?.macAddress,
        deviceHash: data.fingerprint?.deviceHash,
        geoCity: data.geo?.city,
        geoCountry: data.geo?.country
      }
    });
    return { ...updated, key: decryptLicenseKey(updated.key) };
  }

  async getMyInventory(orgId: string, isSuperAdmin = false, skip?: number, take?: number, search?: string) {
    const where: any = isSuperAdmin ? {} : { ownerId: orgId };

    if (search) {
      where.OR = [
        { owner: { name: { contains: search, mode: 'insensitive' } } },
        { batch: { batchCode: { contains: search, mode: 'insensitive' } } },
        { batch: { licenseType: { contains: search, mode: 'insensitive' } } },
        { status: { equals: search.toUpperCase() as any } },
      ].filter(Boolean);
    }

    if (skip !== undefined || take !== undefined) {
      const [items, total] = await Promise.all([
        (this.prisma.orgLicense as any).findMany({
          where,
          include: { 
            batch: true,
            owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          skip: skip ? parseInt(skip as any) : undefined,
          take: take ? parseInt(take as any) : undefined,
        }),
        (this.prisma.orgLicense as any).count({ where })
      ]);
      return {
        data: items.map((l: any) => ({ ...l, key: decryptLicenseKey(l.key) })),
        total
      };
    }

    const licenses = await (this.prisma.orgLicense as any).findMany({
      where,
      include: { 
        batch: true,
        owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
    });
    return licenses.map((l: any) => ({ ...l, key: decryptLicenseKey(l.key) }));
  }

  async getTransfers(orgId: string, isSuperAdmin = false) {
    console.log(`[Licenses] getTransfers: orgId=${orgId}, isSuperAdmin=${isSuperAdmin}`);
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
    return (this.prisma.orgLicenseBatch as any).findMany({
      include: { _count: { select: { licenses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBatchDetails(id: string) {
    const batch = await (this.prisma.orgLicenseBatch as any).findUnique({
      where: { id },
      include: { licenses: { include: { owner: true } } }
    });
    if (batch && batch.licenses) {
      batch.licenses = batch.licenses.map((l: any) => ({
        ...l,
        key: decryptLicenseKey(l.key)
      }));
    }
    return batch;
  }
  async updateStatus(id: string, status: OrgLicenseStatus, userId: string) {
    const license = await (this.prisma.orgLicense as any).findUnique({ where: { id } });
    if (!license) throw new NotFoundException('License not found');
    
    // Allow toggle between AVAILABLE, ACTIVE, SUSPENDED, REVOKED
    // If it was ACTIVE and being suspended, we can just change the status.
    // If it was SUSPENDED and being activated again, we revert to ACTIVE.
    
    const updated = await (this.prisma.orgLicense as any).update({
      where: { id },
      data: { status }
    });
    
    return { ...updated, key: decryptLicenseKey(updated.key) };
  }
}
