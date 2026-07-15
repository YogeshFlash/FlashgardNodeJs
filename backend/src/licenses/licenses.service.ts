import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgLicenseStatus, OrgLicenseType, TransferStatus } from '@prisma/client';
import { encryptLicenseKey, decryptLicenseKey } from '../utils/encryption';
import { resolveTransferPath } from '../utils/hierarchy.util';

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
    
    const where: any = { 
      id: { in: data.licenseIds }, 
      status: OrgLicenseStatus.AVAILABLE,
      ownerId: data.fromOrgId 
    };

    const licenses = await (this.prisma.orgLicense as any).findMany({ where });

    console.log(`[LicensesService] Found ${licenses.length} available licenses to dispatch.`);

    if (licenses.length !== data.licenseIds.length) {
      throw new BadRequestException(`Some licenses are unavailable. Expected ${data.licenseIds.length}, found ${licenses.length}.`);
    }

    const owners = new Set(licenses.map((l: any) => l.ownerId));
    if (owners.size > 1) {
      throw new BadRequestException('Cannot dispatch licenses owned by multiple different organizations in a single transaction.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Use the actual current owner of the first license for the transfer if fromOrgId was not set (Super Admin)
      const effectiveFromOrgId = data.fromOrgId || licenses[0].ownerId;

      const path = await resolveTransferPath(tx, effectiveFromOrgId, data.toOrgId);
      
      let finalTransfer = null;

      // Loop through the path and create sequential transfers
      // path example: [RootId, MasterDistributorId, SubDistributorId, RetailerId]
      for (let i = 0; i < path.length - 1; i++) {
        const fromId = path[i];
        const toId = path[i + 1];

        const transfer = await (tx as any).licensingTransfer.create({
          data: {
            fromOrgId: fromId,
            toOrgId: toId,
            status: TransferStatus.COMPLETED,
            resolvedAt: new Date(),
            resolvedBy: data.userId,
            tenantId: data.tenantId || effectiveFromOrgId,
            items: { create: data.licenseIds.map((id: any) => ({ licenseId: id })) }
          }
        });

        // The last transfer is the one we return to the caller
        if (i === path.length - 2) {
          finalTransfer = transfer;
        }
      }

      await (tx as any).orgLicense.updateMany({
        where: { id: { in: data.licenseIds } },
        data: { 
          status: OrgLicenseStatus.AVAILABLE,
          ownerId: data.toOrgId,
          tenantId: data.toOrgId
        }
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

    if (updated.tenantId) {
      await this.ensureEntityWallet(updated.tenantId);
    }
    if (updated.ownerId && updated.ownerId !== updated.tenantId) {
      await this.ensureEntityWallet(updated.ownerId);
    }

    return { ...updated, key: decryptLicenseKey(updated.key) };
  }

  private async ensureEntityWallet(orgId: string) {
    if (!orgId) return;
    const wallet = await this.prisma.entityWallet.findFirst({
      where: {
        OR: [
          { orgId },
          { tenantId: orgId }
        ]
      }
    });

    if (!wallet) {
      await this.prisma.entityWallet.create({
        data: {
          orgId,
          tenantId: orgId,
          balance: 0,
          totalCredits: 0,
          usedCredits: 0
        }
      });
    }
  }

  async getMyInventory(orgId: string, isSuperAdmin = false, skip?: number, take?: number, search?: string, batchId?: string, status?: string, hideUnavailable?: boolean) {
    const where: any = {};
    
    if (hideUnavailable) {
      where.status = 'AVAILABLE';
      if (!isSuperAdmin) {
        where.ownerId = orgId;
      }
    } else if (!isSuperAdmin) {
      where.OR = [
        { ownerId: orgId },
        {
          transferItems: {
            some: {
              transfer: {
                fromOrgId: orgId
              }
            }
          }
        }
      ];
    }

    if (batchId) {
      where.batchId = batchId;
    }

    if (status && !hideUnavailable) {
      where.status = status;
    }

    if (search) {
      const searchFilter = {
        OR: [
          { owner: { name: { contains: search, mode: 'insensitive' } } },
          { batch: { batchCode: { contains: search, mode: 'insensitive' } } },
          { batch: { licenseType: { contains: search, mode: 'insensitive' } } },
          { status: { equals: search.toUpperCase() as any } },
        ].filter(Boolean)
      };
      
      if (isSuperAdmin) {
        Object.assign(where, searchFilter);
      } else {
        where.AND = [searchFilter];
      }
    }

    if (skip !== undefined || take !== undefined) {
      const [items, total] = await Promise.all([
        (this.prisma.orgLicense as any).findMany({
          where,
          include: { 
            batch: true,
            owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } },
            transferItems: {
              include: {
                transfer: {
                  include: {
                    fromOrg: { select: { name: true } }
                  }
                }
              },
              orderBy: { transfer: { resolvedAt: 'desc' } },
              take: 1
            }
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
        owner: { select: { id: true, name: true, organizationType: { select: { name: true } } } },
        transferItems: {
          include: {
            transfer: {
              include: {
                fromOrg: { select: { name: true } }
              }
            }
          },
          orderBy: { transfer: { resolvedAt: 'desc' } },
          take: 1
        }
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

  async getBatches(tenantId?: string, orgId?: string) {
    const where: any = tenantId ? { tenantId } : {};
    if (orgId) {
      where.licenses = {
        some: {
          OR: [
            { ownerId: orgId },
            {
              transferItems: {
                some: {
                  transfer: {
                    fromOrgId: orgId
                  }
                }
              }
            }
          ]
        }
      };
    }
    return (this.prisma.orgLicenseBatch as any).findMany({
      where,
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

  async getMasterQRs(params: {
    orgId?: string;
    isSuperAdmin?: boolean;
    skip: number;
    take: number;
    search?: string;
  }) {
    const { orgId, isSuperAdmin, skip, take, search } = params;
    const where: any = {};

    if (!isSuperAdmin && orgId) {
      const orgIds = await this.getDescendantOrgIds(orgId);
      where.dealerId = { in: orgIds };
    } else if (orgId) {
      const orgIds = await this.getDescendantOrgIds(orgId);
      where.dealerId = { in: orgIds };
    }

    if (search) {
      where.OR = [
        { masterQRCode: { contains: search, mode: 'insensitive' } },
        { masterProduct: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.dealerMasterQR.findMany({
        where,
        include: {
          dealer: true,
          owner: true,
          creator: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.dealerMasterQR.count({ where })
    ]);

    return { items, total };
  }

  private async getDescendantOrgIds(rootOrgId: string): Promise<string[]> {
    if (!rootOrgId) return [];
    const allOrgIds = new Set<string>();
    allOrgIds.add(rootOrgId);
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
}

