import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { decryptLicenseKey, encryptLicenseKey } from '../utils/encryption';
import { Prisma } from '@prisma/client';

@Injectable()
export class MachineCutsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async validateCut(data: { licenseKey: string; organizationId: string; modelId: string; userId: string; appUniqueId?: string }) {
    const { licenseKey, organizationId, modelId, userId, appUniqueId } = data;

    if (!organizationId) throw new BadRequestException('Organization ID is required');

    // 1. Verify License
    let license = null;
    if (licenseKey) {
      const encryptedKey = encryptLicenseKey(licenseKey);
      license = await this.prisma.orgLicense.findUnique({
        where: { key: encryptedKey },
        include: { tenant: true }
      });
      if (!license) throw new BadRequestException('Invalid license key');
      if (license.status !== 'ACTIVE') throw new BadRequestException('License is not active');
      if (license.tenantId !== organizationId) throw new BadRequestException('License does not belong to this organization');
    }

    // 2. Check Wallet Balance
    const wallet = await this.prisma.entityWallet.findFirst({
      where: { tenantId: organizationId }
    });

    if (!wallet) throw new BadRequestException('Wallet not found for this organization');

    // Determine if the org has an unlimited/lifetime plan currently active
    // For simplicity, we check if they have enough balance or if they have an active non-USAGE plan
    const activeUnlimited = await this.prisma.cutCredit.findFirst({
      where: {
        tenantId: organizationId,
        planType: { in: ['UNLIMITED', 'LIFETIME'] },
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ]
      }
    });

    if (!activeUnlimited && wallet.balance <= 0) {
      throw new BadRequestException('Insufficient credits');
    }

    // 3. Issue short-lived cut token (e.g. valid for 15 mins)
    const payload = {
      sub: 'cut_token',
      organizationId,
      licenseId: license?.id,
      modelId,
      userId,
      appUniqueId,
      hasUnlimited: !!activeUnlimited
    };

    const cutToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return {
      valid: true,
      cutToken,
      balance: wallet.balance,
      hasUnlimited: !!activeUnlimited
    };
  }

  async logCut(data: {
    cutToken: string;
    plotterId?: string;
    qrCode?: string;
    instruction?: string;
    latitude?: number;
    longitude?: number;
    isPositiveCut?: boolean;
    reviews?: string;
    userId: string;
  }) {
    let payload;
    try {
      payload = this.jwtService.verify(data.cutToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired cut token');
    }

    if (payload.sub !== 'cut_token') {
      throw new UnauthorizedException('Invalid token type');
    }

    const { organizationId, licenseId, modelId, appUniqueId, hasUnlimited } = payload;
    const isPositiveCut = data.isPositiveCut !== false; // defaults to true

    return this.prisma.$transaction(async (tx) => {
      // 1. Create MachineCutLog
      const cutLog = await tx.machineCutLog.create({
        data: {
          appUniqueId,
          licenseId,
          modelId,
          organizationId,
          userId: payload.userId, // The user who validated
          qrCode: data.qrCode,
          instruction: data.instruction,
          plotterId: data.plotterId,
          latitude: data.latitude,
          longitude: data.longitude,
          isPositiveCut,
          reviews: data.reviews,
        }
      });

      // 2. Deduct Credit (only if Positive Cut and NO unlimited plan)
      if (isPositiveCut && !hasUnlimited) {
        const wallet = await tx.entityWallet.findFirst({
          where: { tenantId: organizationId }
        });

        if (!wallet || wallet.balance <= 0) {
          throw new BadRequestException('Insufficient credits to complete cut logging');
        }

        // Deduct 1 from balance and add 1 to usedCredits
        await tx.entityWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: 1 },
            usedCredits: { increment: 1 }
          }
        });

        // Add to CreditTransaction
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            amount: 1,
            type: 'DEBIT',
            source: 'MACHINE_CUT',
            notes: `Machine cut for model ${modelId || 'Unknown'}`,
            tenantId: organizationId
          }
        });
      }

      return cutLog;
    });
  }

  async getLogs(params: {
    orgId?: string;
    licenseId?: string;
    skip: number;
    take: number;
    search?: string;
    isPositiveCut?: boolean;
    isSuperAdmin?: boolean;
    categoryName?: string;
  }) {
    const { orgId, licenseId, skip, take, search, isPositiveCut, isSuperAdmin, categoryName } = params;
    const where: any = {};

    if (!isSuperAdmin) {
      if (orgId) {
        const orgIds = await this.getDescendantOrgIds(orgId);
        where.organizationId = { in: orgIds };
      }
    } else if (orgId) {
      const orgIds = await this.getDescendantOrgIds(orgId);
      where.organizationId = { in: orgIds };
    }

    if (licenseId) {
      where.licenseId = licenseId;
    }

    if (isPositiveCut !== undefined) {
      where.isPositiveCut = isPositiveCut;
    }

    if (categoryName) {
      where.model = {
        category: {
          OR: [
            { name: categoryName },
            { parent: { name: categoryName } }
          ]
        }
      };
    }

    if (search) {
      where.OR = [
        { plotterId: { contains: search, mode: 'insensitive' } },
        { qrCode: { contains: search, mode: 'insensitive' } },
        { appUniqueId: { contains: search, mode: 'insensitive' } },
        {
          license: {
            key: { contains: search, mode: 'insensitive' }
          }
        },
        {
          model: {
            name: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.machineCutLog.findMany({
        where,
        select: {
          id: true,
          appUniqueId: true,
          plotterId: true,
          qrCode: true,
          isPositiveCut: true,
          createdAt: true,
          latitude: true,
          longitude: true,
          brandName: true,
          modelName: true,
          patternName: true,
          reviews: true,
          license: {
            select: {
              id: true,
              key: true,
              batch: {
                select: {
                  licenseType: true
                }
              }
            }
          },
          model: {
            select: {
              id: true,
              name: true,
              brand: {
                select: {
                  name: true
                }
              },
              category: {
                select: {
                  id: true,
                  name: true,
                  parent: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          },
          modelCutFile: {
            select: {
              id: true,
              cutPattern: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              parent: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.machineCutLog.count({ where })
    ]);

    const plotters = await (this.prisma as any).plotterMaster.findMany({
      select: { legacyId: true, plotterName: true }
    });
    const plotterMap = new Map<string, string>();
    plotters.forEach((p: any) => {
      if (p.legacyId) {
        plotterMap.set(p.legacyId.toLowerCase(), p.plotterName || p.legacyId);
      }
    });

    const decryptedItems = items.map((item: any) => {
      if (item.license && item.license.key) {
        try {
          item.license.key = decryptLicenseKey(item.license.key);
        } catch (e) {
          // Keep original key if decryption fails
        }
      }
      if (item.plotterId) {
        const lowerId = item.plotterId.toLowerCase();
        item.plotterId = plotterMap.get(lowerId) || item.plotterId;
      }
      return item;
    });

    return { items: decryptedItems, total };
  }

  async getReportsStats(params: { orgId?: string; isSuperAdmin?: boolean; range?: number }) {
    const { orgId, isSuperAdmin, range = 6 } = params;
    const rangeInt = range === 12 ? 12 : 6;
    const targetOrgId = isSuperAdmin ? orgId : orgId;

    const whereLicense: any = {};
    const whereCuts: any = {};
    const whereWallet: any = {};

    const orgIds = targetOrgId ? await this.getDescendantOrgIds(targetOrgId) : [];

    if (targetOrgId) {
      whereLicense.tenantId = { in: orgIds };
      whereCuts.organizationId = { in: orgIds };
      whereWallet.tenantId = { in: orgIds };
    }

    // 1. Total Cuts
    const totalCuts = await this.prisma.machineCutLog.count({
      where: whereCuts
    });

    // 2. Active Licenses count
    const activeLicenses = await this.prisma.orgLicense.count({
      where: {
        ...whereLicense,
        status: 'ACTIVE'
      }
    });

    // 3. Distributed Credits (Sum of wallet balances)
    const walletSum = await this.prisma.entityWallet.aggregate({
      where: whereWallet,
      _sum: {
        balance: true
      }
    });
    const distributedCredits = walletSum._sum.balance || 0;

    // 4. Cuts Trend (dynamic 6 or 12 months)
    const cutsTrendRaw = targetOrgId
      ? (rangeInt === 12
          ? await this.prisma.$queryRaw<any[]>`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM') AS month_key,
                COUNT(*)::integer AS value
              FROM machine_cut_logs
              WHERE created_at >= NOW() - INTERVAL '12 months'
                AND organization_id = ANY(${orgIds}::uuid[])
              GROUP BY TO_CHAR(created_at, 'YYYY-MM')
              ORDER BY month_key ASC
            `
          : await this.prisma.$queryRaw<any[]>`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM') AS month_key,
                COUNT(*)::integer AS value
              FROM machine_cut_logs
              WHERE created_at >= NOW() - INTERVAL '6 months'
                AND organization_id = ANY(${orgIds}::uuid[])
              GROUP BY TO_CHAR(created_at, 'YYYY-MM')
              ORDER BY month_key ASC
            `)
      : (rangeInt === 12
          ? await this.prisma.$queryRaw<any[]>`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM') AS month_key,
                COUNT(*)::integer AS value
              FROM machine_cut_logs
              WHERE created_at >= NOW() - INTERVAL '12 months'
              GROUP BY TO_CHAR(created_at, 'YYYY-MM')
              ORDER BY month_key ASC
            `
          : await this.prisma.$queryRaw<any[]>`
              SELECT 
                TO_CHAR(created_at, 'YYYY-MM') AS month_key,
                COUNT(*)::integer AS value
              FROM machine_cut_logs
              WHERE created_at >= NOW() - INTERVAL '6 months'
              GROUP BY TO_CHAR(created_at, 'YYYY-MM')
              ORDER BY month_key ASC
            `);

    const trendMap = new Map<string, number>();
    for (const row of cutsTrendRaw) {
      trendMap.set(row.month_key, row.value);
    }

    const cutsTrend = [];
    const now = new Date();
    for (let i = rangeInt - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const monthName = d.toLocaleString('default', { month: 'short' });
      cutsTrend.push({
        month: monthName,
        value: trendMap.get(monthKey) || 0
      });
    }

    // 5. License Distribution
    const licenseCounts = targetOrgId
      ? await this.prisma.$queryRaw<any[]>`
          SELECT b.license_type AS type, COUNT(l.id)::integer AS count
          FROM org_licenses l
          JOIN org_license_batches b ON l.batch_id = b.id
          WHERE l.status = 'ACTIVE' AND l.tenant_id = ANY(${orgIds}::uuid[])
          GROUP BY b.license_type
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT b.license_type AS type, COUNT(l.id)::integer AS count
          FROM org_licenses l
          JOIN org_license_batches b ON l.batch_id = b.id
          WHERE l.status = 'ACTIVE'
          GROUP BY b.license_type
        `;

    return {
      totalCuts,
      activeLicenses,
      distributedCredits,
      systemUptime: '99.98%',
      cutsTrend,
      licenseDistribution: licenseCounts.map((item) => ({
        type: item.type,
        count: item.count
      }))
    };
  }

  async getReport(params: {
    orgId?: string;
    isSuperAdmin?: boolean;
    startDate?: string;
    endDate?: string;
    search?: string;
    skip: number;
    take: number;
  }) {
    const { orgId, isSuperAdmin, startDate, endDate, search, skip, take } = params;
    const where: any = {};

    if (!isSuperAdmin && orgId) {
      const orgIds = await this.getDescendantOrgIds(orgId);
      where.organizationId = { in: orgIds };
    } else if (orgId) {
      const orgIds = await this.getDescendantOrgIds(orgId);
      where.organizationId = { in: orgIds };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    if (search) {
      where.OR = [
        { plotterId: { contains: search, mode: 'insensitive' } },
        { qrCode: { contains: search, mode: 'insensitive' } },
        {
          model: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          model: {
            brand: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.machineCutLog.findMany({
        where,
        include: {
          model: {
            include: {
              brand: true,
              category: {
                include: {
                  parent: true
                }
              }
            }
          },
          organization: {
            include: {
              parent: true
            }
          },
          user: true,
          license: {
            include: {
              batch: true
            }
          },
          modelCutFile: {
            include: {
              cutPattern: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.machineCutLog.count({ where })
    ]);

    const qrCodeStrings = Array.from(new Set(items.map(item => item.qrCode).filter(Boolean))) as string[];
    const qrCodeMap = new Map<string, any>();
    const materialMap = new Map<string, any>();

    if (qrCodeStrings.length > 0) {
      const qrCodes = await this.prisma.qRCode.findMany({
        where: {
          sequenceNumber: { in: qrCodeStrings }
        },
        include: {
          filmType: {
            include: {
              parent: true
            }
          }
        }
      });
      for (const qr of qrCodes) {
        if (qr.sequenceNumber) {
          qrCodeMap.set(qr.sequenceNumber, qr);
        }
      }

      const filmTypeNames = Array.from(new Set(qrCodes.map(qr => qr.filmType?.name).filter(Boolean))) as string[];
      if (filmTypeNames.length > 0) {
        const materials = await this.prisma.material.findMany({
          where: {
            name: { in: filmTypeNames }
          },
          include: {
            filmCategory: true
          }
        });
        for (const m of materials) {
          materialMap.set(m.name.toLowerCase(), m);
        }
      }
    }

    const plotters = await (this.prisma as any).plotterMaster.findMany({
      select: { legacyId: true, plotterName: true }
    });
    const plotterMap = new Map<string, string>();
    plotters.forEach((p: any) => {
      if (p.legacyId) {
        plotterMap.set(p.legacyId.toLowerCase(), p.plotterName || p.legacyId);
      }
    });

    const formatted = items.map((item: any) => {
      let decryptedKey = 'N/A';
      if (item.license?.key) {
        try {
          decryptedKey = decryptLicenseKey(item.license.key);
        } catch (e) {
          decryptedKey = item.license.key;
        }
      }

      const qrDetails = item.qrCode ? qrCodeMap.get(item.qrCode) : null;
      let filmCategory = 'N/A';
      let productName = 'N/A';

      if (qrDetails?.filmType) {
        const matchedMaterial = materialMap.get(qrDetails.filmType.name.toLowerCase());
        if (matchedMaterial) {
          productName = matchedMaterial.name;
          filmCategory = matchedMaterial.filmCategory?.name || 'N/A';
        } else {
          if (qrDetails.filmType.parent) {
            filmCategory = qrDetails.filmType.parent.name;
            productName = qrDetails.filmType.name;
          } else {
            filmCategory = qrDetails.filmType.name;
            productName = qrDetails.filmType.name;
          }
        }
      }

      if (filmCategory === 'N/A' || productName === 'N/A') {
        const patternLower = (item.modelCutFile?.cutPattern?.name || item.patternName || item.instruction || '').toLowerCase();
        
        // Determine if it matches Clear Film criteria
        const isClearFilm = (patternLower.includes('front') || 
                             patternLower.includes('screen') || 
                             patternLower.includes('protector') || 
                             patternLower.includes('cf') || 
                             patternLower.includes('clear') ||
                             patternLower.includes('igold') ||
                             patternLower.includes('titan') ||
                             patternLower.includes('shield')) && 
                            // Make sure full/wrap back protector/skins don't get matched here
                            !patternLower.includes('back skin full') && 
                            !patternLower.includes('back protector full') &&
                            !patternLower.includes('full wrap') &&
                            !patternLower.includes('back protector with corner');

        if (isClearFilm) {
          filmCategory = 'Clear Film';
          productName = 'Clear Film';
        } else {
          filmCategory = 'Canvas 3D';
          productName = 'Canvas Alpha';
        }
      }

      return {
        id: item.id,
        brandCategory: (item.model?.category?.parent?.name && item.model?.category?.parent?.name !== 'Main Model') ? item.model?.category?.parent?.name : (item.model?.category?.name || 'N/A'),
        brand: item.model?.brand?.name || 'N/A',
        model: item.model?.name || 'N/A',
        dealer: item.organization?.name || 'N/A',
        licenseKey: decryptedKey,
        licenseRefName: item.license?.referenceName || item.license?.licenseName || item.license?.machineId || item.license?.macAddress || item.license?.deviceHash || 'N/A',
        categoryName: item.model?.category?.name || 'N/A',
        filmCategory,
        productName,
        cutType: item.modelCutFile?.cutPattern?.name || item.patternName || item.instruction || 'N/A',
        plotter: item.plotterId ? (plotterMap.get(item.plotterId.toLowerCase()) || item.plotterId) : 'N/A',
        updatedDate: item.createdAt,
        parentDealer: item.organization?.parent?.name || 'N/A',
        promoterName: item.user ? `${item.user.firstName} ${item.user.lastName}`.trim() || item.user.email : 'N/A',
        cutQRCode: item.qrCode || 'N/A',
        cutStatus: item.isPositiveCut ? 'Success' : 'Failed',
        cutReview: item.reviews || 'N/A'
      };
    });

    return { items: formatted, total };
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


