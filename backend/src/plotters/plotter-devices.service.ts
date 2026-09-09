import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptLicenseKey, decryptLicenseKey } from '../utils/encryption';
import { OrgLicenseStatus } from '@prisma/client';

@Injectable()
export class PlotterDevicesService {
  private readonly logger = new Logger(PlotterDevicesService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma as any).plotter.create({
      data: {
        name: data.name,
        serialNumber: data.serialNumber || null,
        licenseKey: data.licenseKey || null,
        macAddress: data.macAddress || null,
        plotterMasterId: data.plotterMasterId,
        organizationId: data.organizationId || null,
        status: data.status || 'ACTIVE',
        ipAddress: data.ipAddress || null,
        comPort: data.comPort || null,
        description: data.description || null,
      },
      include: {
        plotterMaster: true,
        organization: true,
      },
    });
  }

  async findAll(
    search?: string,
    plotterMasterId?: string,
    organizationId?: string,
    page?: number,
    limit?: number,
  ) {
    const filters: any[] = [];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { licenseKey: { contains: search, mode: 'insensitive' } },
          { macAddress: { contains: search, mode: 'insensitive' } },
          { ipAddress: { contains: search, mode: 'insensitive' } },
          { comPort: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { plotterMaster: { plotterName: { contains: search, mode: 'insensitive' } } },
          { organization: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (plotterMasterId) {
      filters.push({ plotterMasterId });
    }

    if (organizationId) {
      filters.push({ organizationId });
    }

    const whereClause = filters.length > 0 ? { AND: filters } : undefined;

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        (this.prisma as any).plotter.findMany({
          where: whereClause,
          include: {
            plotterMaster: true,
            organization: true,
          },
          orderBy: { name: 'asc' },
          skip: Number(skip),
          take: Number(limit),
        }),
        (this.prisma as any).plotter.count({
          where: whereClause,
        }),
      ]);

      return {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    }

    return (this.prisma as any).plotter.findMany({
      where: whereClause,
      include: {
        plotterMaster: true,
        organization: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await (this.prisma as any).plotter.findUnique({
      where: { id },
      include: {
        plotterMaster: true,
        organization: true,
      },
    });
    if (!item) throw new NotFoundException(`Plotter device with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    return (this.prisma as any).plotter.update({
      where: { id },
      data: {
        name: data.name,
        serialNumber: data.serialNumber !== undefined ? (data.serialNumber || null) : undefined,
        licenseKey: data.licenseKey !== undefined ? (data.licenseKey || null) : undefined,
        macAddress: data.macAddress !== undefined ? (data.macAddress || null) : undefined,
        plotterMasterId: data.plotterMasterId,
        organizationId: data.organizationId !== undefined ? (data.organizationId || null) : undefined,
        status: data.status,
        ipAddress: data.ipAddress !== undefined ? (data.ipAddress || null) : undefined,
        comPort: data.comPort !== undefined ? (data.comPort || null) : undefined,
        description: data.description !== undefined ? (data.description || null) : undefined,
      },
      include: {
        plotterMaster: true,
        organization: true,
      },
    });
  }

  async remove(id: string) {
    return (this.prisma as any).plotter.delete({
      where: { id },
    });
  }

  async checkOrRegister(data: { name: string; macAddress: string; organizationId: string }) {
    let plotter = await (this.prisma as any).plotter.findFirst({
      where: {
        macAddress: data.macAddress,
      },
      include: {
        plotterMaster: {
          include: {
            legacySettings: true,
          },
        },
      },
    });

    if (!plotter) {
      // Find matching PlotterMaster by name keyword
      let master = await (this.prisma as any).plotterMaster.findFirst({
        where: {
          OR: [
            { plotterName: { contains: data.name, mode: 'insensitive' } },
            { legacySettings: { searchKeyword: { contains: data.name, mode: 'insensitive' } } },
          ],
        },
        include: {
          legacySettings: true,
        },
      });

      if (!master) {
        // Create a new master profile automatically
        const isPortrait = data.name.toLowerCase().includes('portrait') || data.name.toLowerCase().includes('cameo');
        master = await (this.prisma as any).plotterMaster.create({
          data: {
            plotterName: data.name,
            manufacturer: isPortrait ? 'Silhouette' : 'Generic',
            connectionType: 'BLUETOOTH',
            status: 'ACTIVE',
            splitCommands: isPortrait,
            startString: isPortrait ? 'IN;PA;SP1;' : 'IN;PA;',
            endString: 'IN;PU0,0;\u0003',
            xySeparator: ',',
            mirrorX: isPortrait,
            mirrorY: false,
            legacySettings: {
              create: {
                scaleX: 1.0,
                scaleY: 1.0,
                plotterType: isPortrait ? 'Portrait' : 'Generic',
                searchKeyword: data.name,
                languageType: 'HPGL',
                isAndroid: true,
              },
            },
          },
          include: {
            legacySettings: true,
          },
        });
      }

      plotter = await (this.prisma as any).plotter.create({
        data: {
          name: data.name,
          macAddress: data.macAddress,
          plotterMasterId: master.id,
          organizationId: data.organizationId || null,
          status: 'ACTIVE',
        },
        include: {
          plotterMaster: {
            include: {
              legacySettings: true,
            },
          },
        },
      });
    }

    return plotter;
  }

  async bindDevice(data: {
    licenseKey: string;
    serialNumber?: string;
    macAddress?: string;
    deviceHash?: string;
    organizationId?: string;
  }) {
    const { licenseKey, serialNumber, macAddress, deviceHash, organizationId } = data;

    if (!licenseKey || !licenseKey.trim()) {
      throw new BadRequestException('License key is required for device binding');
    }

    const encryptedKey = encryptLicenseKey(licenseKey.trim());

    // 1. Look up License
    const license = await this.prisma.orgLicense.findFirst({
      where: {
        OR: [
          { key: encryptedKey },
          { key: licenseKey.trim() },
        ],
      },
      include: {
        tenant: true,
      },
    });

    if (!license) {
      throw new NotFoundException('License key not found');
    }

    if (license.status === OrgLicenseStatus.REVOKED) {
      throw new BadRequestException('This license has been revoked.');
    }

    // Check anti-piracy hardware locking
    if (license.deviceHash && deviceHash && license.deviceHash !== deviceHash) {
      this.logger.warn(`Hardware mismatch attempt for license ${license.id}. Stored: ${license.deviceHash}, Attempted: ${deviceHash}`);
      // Record security alert
      await (this.prisma as any).securityAlert.create({
        data: {
          licenseId: license.id,
          tenantId: license.tenantId,
          attemptedFingerprint: { deviceHash, macAddress, serialNumber },
          storedFingerprint: { deviceHash: license.deviceHash, macAddress: license.macAddress },
        },
      }).catch((e: any) => this.logger.error('Failed to log security alert', e));
    }

    const effectiveOrgId = organizationId || license.tenantId || license.ownerId;

    // 2. Activate License & Lock Hardware Fingerprint
    const updatedLicense = await this.prisma.orgLicense.update({
      where: { id: license.id },
      data: {
        status: OrgLicenseStatus.ACTIVE,
        activatedAt: license.activatedAt || new Date(),
        macAddress: macAddress || license.macAddress,
        deviceHash: deviceHash || license.deviceHash,
        machineId: serialNumber || macAddress || license.machineId,
      },
      include: {
        tenant: true,
      },
    });

    // 3. Update or link Plotter record if exists
    let plotter: any = null;
    if (serialNumber || effectiveOrgId) {
      plotter = await (this.prisma as any).plotter.findFirst({
        where: {
          OR: [
            serialNumber ? { serialNumber: serialNumber.trim() } : undefined,
            { licenseKey: encryptedKey },
            { licenseKey: licenseKey.trim() },
            effectiveOrgId ? { organizationId: effectiveOrgId } : undefined,
          ].filter(Boolean),
        },
        include: {
          plotterMaster: true,
        },
      });

      if (plotter) {
        plotter = await (this.prisma as any).plotter.update({
          where: { id: plotter.id },
          data: {
            macAddress: macAddress || plotter.macAddress,
            serialNumber: serialNumber || plotter.serialNumber,
            status: 'ACTIVE',
          },
          include: {
            plotterMaster: true,
          },
        });
      }
    }

    // 4. Ensure Wallet is Active
    if (effectiveOrgId) {
      const wallet = await this.prisma.entityWallet.findFirst({
        where: {
          OR: [
            { orgId: effectiveOrgId },
            { tenantId: effectiveOrgId },
          ],
        },
      });

      if (!wallet) {
        await this.prisma.entityWallet.create({
          data: {
            orgId: effectiveOrgId,
            tenantId: effectiveOrgId,
            balance: 50,
            totalCredits: 50,
            usedCredits: 0,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Plotter hardware successfully bound and activated',
      license: {
        id: updatedLicense.id,
        key: licenseKey.trim(),
        status: updatedLicense.status,
        organizationId: effectiveOrgId,
        activatedAt: updatedLicense.activatedAt,
      },
      plotter,
    };
  }
}

