import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlottersService {
  constructor(private prisma: PrismaService) {}

  async findAllMasters() {
    return this.prisma.plotterMaster.findMany({
      orderBy: { plotterName: 'asc' },
    });
  }

  async create(data: any, currentUser: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can log plotter procurements.');
    }

    const { purchaseOrderNumber, supplierId, plotterMasterId, serialNumbers, notes } = data;

    if (!supplierId || !plotterMasterId || !serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      throw new BadRequestException('Supplier, plotter model master, and a list of serial numbers are required.');
    }

    const supplier = await this.prisma.organization.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier Organization with ID ${supplierId} not found.`);
    }

    const plotterMaster = await this.prisma.plotterMaster.findUnique({
      where: { id: plotterMasterId },
    });
    if (!plotterMaster) {
      throw new NotFoundException(`Plotter model with ID ${plotterMasterId} not found.`);
    }

    const modelName = plotterMaster.plotterName || 'Unknown Model';
    const createdPlotters: any[] = [];

    // Run in transaction to ensure consistency
    await this.prisma.$transaction(async (tx) => {
      for (const serial of serialNumbers) {
        const trimmedSerial = serial.trim();
        if (!trimmedSerial) continue;

        // Check if serial already exists
        const existing = await tx.plotter.findUnique({
          where: { serialNumber: trimmedSerial },
        });
        if (existing) {
          throw new BadRequestException(`Plotter with serial number ${trimmedSerial} already exists.`);
        }

        const plotter = await tx.plotter.create({
          data: {
            serialNumber: trimmedSerial,
            plotterMasterId,
            modelName,
            status: 'ORDERED',
            purchaseOrderNumber,
            supplierId,
            notes,
          },
        });

        // Log assignment/creation
        await tx.plotterAssignmentLog.create({
          data: {
            plotterId: plotter.id,
            action: 'CREATE_PO',
            performedById: currentUser.id,
            notes: `Procurement logged. PO: ${purchaseOrderNumber || 'N/A'}. Model: ${modelName}. ${notes || ''}`,
          },
        });

        createdPlotters.push(plotter);
      }
    });

    return createdPlotters;
  }

  async findAll(query: any, currentUser: any) {
    const { search, status, supplierId, currentOwnerId, currentLicenseId } = query;
    const filters: any[] = [];

    if (search) {
      filters.push({
        OR: [
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { modelName: { contains: search, mode: 'insensitive' } },
          { purchaseOrderNumber: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (status) {
      filters.push({ status });
    }

    if (supplierId) {
      filters.push({ supplierId });
    }

    if (currentOwnerId) {
      filters.push({ currentOwnerId });
    }

    if (currentLicenseId) {
      filters.push({ currentLicenseId });
    }

    // Role-based visibility logic
    if (!currentUser.isSuperAdmin) {
      // Non-superadmins should only see plotters distributed to their own organization (or children)
      const userOrgIds = currentUser.organizationId ? [currentUser.organizationId] : [];
      if (userOrgIds.length > 0) {
        filters.push({
          OR: [
            { currentOwnerId: { in: userOrgIds } },
            { supplierId: { in: userOrgIds } },
          ],
        });
      } else {
        return [];
      }
    }

    return this.prisma.plotter.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: {
        plotterMaster: true,
        supplier: { select: { id: true, name: true } },
        currentOwner: { select: { id: true, name: true } },
        currentLicense: { select: { id: true, key: true, licenseName: true } },
        testedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: any) {
    const plotter = await this.prisma.plotter.findUnique({
      where: { id },
      include: {
        plotterMaster: true,
        supplier: { select: { id: true, name: true } },
        currentOwner: { select: { id: true, name: true } },
        currentLicense: { select: { id: true, key: true, licenseName: true } },
        testedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!plotter) {
      throw new NotFoundException(`Plotter with ID ${id} not found.`);
    }

    // Auth check
    if (!currentUser.isSuperAdmin) {
      if (
        plotter.currentOwnerId !== currentUser.organizationId &&
        plotter.supplierId !== currentUser.organizationId
      ) {
        throw new ForbiddenException('You do not have access to view this plotter.');
      }
    }

    return plotter;
  }

  async updateQA(id: string, data: any, currentUser: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can log QA test results.');
    }

    const { status, notes } = data;
    if (status !== 'TESTED_OK' && status !== 'TEST_FAILED') {
      throw new BadRequestException('Status must be TESTED_OK or TEST_FAILED.');
    }

    const plotter = await this.findOne(id, currentUser);

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.plotter.update({
        where: { id },
        data: {
          status,
          testedById: currentUser.id,
          testedAt: new Date(),
          notes: notes || plotter.notes,
        },
      });

      await tx.plotterAssignmentLog.create({
        data: {
          plotterId: id,
          action: 'QA_TEST',
          performedById: currentUser.id,
          notes: `QA test complete. Result: ${status}. Notes: ${notes || 'None'}`,
        },
      });

      return p;
    });

    return updated;
  }

  async distribute(id: string, data: any, currentUser: any) {
    const { toOwnerId, notes } = data;
    if (!toOwnerId) {
      throw new BadRequestException('Recipient Organization ID (toOwnerId) is required.');
    }

    const plotter = await this.findOne(id, currentUser);

    if (plotter.status !== 'TESTED_OK' && plotter.status !== 'DISTRIBUTED') {
      throw new BadRequestException('Only plotters that passed QA (TESTED_OK) or are already distributed can be transferred.');
    }

    const targetOrg = await this.prisma.organization.findUnique({
      where: { id: toOwnerId },
    });
    if (!targetOrg) {
      throw new NotFoundException(`Organization with ID ${toOwnerId} not found.`);
    }

    // Auth check: non-superadmins can only distribute if they currently own it
    if (!currentUser.isSuperAdmin) {
      if (plotter.currentOwnerId !== currentUser.organizationId) {
        throw new ForbiddenException('You can only distribute plotters owned by your organization.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.plotter.update({
        where: { id },
        data: {
          status: 'DISTRIBUTED',
          currentOwnerId: toOwnerId,
        },
      });

      await tx.plotterAssignmentLog.create({
        data: {
          plotterId: id,
          action: 'DISTRIBUTE',
          fromOwnerId: plotter.currentOwnerId || plotter.supplierId,
          toOwnerId: toOwnerId,
          performedById: currentUser.id,
          notes: notes || 'Distributed to partner organization.',
        },
      });

      return p;
    });

    return updated;
  }

  async assignLicense(id: string, data: any, currentUser: any) {
    const { licenseId, notes } = data;
    const plotter = await this.findOne(id, currentUser);

    // If unassigning
    if (!licenseId) {
      if (!plotter.currentLicenseId) {
        return plotter; // Already unassigned
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const p = await tx.plotter.update({
          where: { id },
          data: {
            status: 'DISTRIBUTED',
            currentLicenseId: null,
          },
        });

        await tx.plotterAssignmentLog.create({
          data: {
            plotterId: id,
            action: 'REASSIGN_LICENSE', // or UNASSIGN
            fromLicenseId: plotter.currentLicenseId,
            performedById: currentUser.id,
            notes: notes || 'Unassigned from license.',
          },
        });

        return p;
      });

      return updated;
    }

    // Check license
    const license = await this.prisma.orgLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException(`License with ID ${licenseId} not found.`);
    }

    // Owner check: License must belong to the organization that currently owns the plotter
    if (plotter.currentOwnerId && license.ownerId !== plotter.currentOwnerId) {
      throw new BadRequestException('The target license does not belong to the organization owning this plotter.');
    }

    // Auth check: user must belong to plotter's owner organization or be super admin
    if (!currentUser.isSuperAdmin) {
      if (plotter.currentOwnerId !== currentUser.organizationId) {
        throw new ForbiddenException('You do not have permission to assign this plotter.');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // First unassign this license from any other plotter (if any) to keep it 1-to-1 conceptually
      await tx.plotter.updateMany({
        where: { currentLicenseId: licenseId },
        data: { currentLicenseId: null, status: 'DISTRIBUTED' },
      });

      const isReassignment = !!plotter.currentLicenseId;

      const p = await tx.plotter.update({
        where: { id },
        data: {
          status: 'ASSIGNED',
          currentLicenseId: licenseId,
        },
      });

      await tx.plotterAssignmentLog.create({
        data: {
          plotterId: id,
          action: isReassignment ? 'REASSIGN_LICENSE' : 'ASSIGN_LICENSE',
          fromLicenseId: plotter.currentLicenseId || null,
          toLicenseId: licenseId,
          performedById: currentUser.id,
          notes: notes || (isReassignment ? 'Reassigned to new license.' : 'Assigned to license.'),
        },
      });

      return p;
    });

    return updated;
  }

  async getLogs(id: string, currentUser: any) {
    // Check if plotter exists and user has access
    await this.findOne(id, currentUser);

    return this.prisma.plotterAssignmentLog.findMany({
      where: { plotterId: id },
      include: {
        fromOwner: { select: { id: true, name: true } },
        toOwner: { select: { id: true, name: true } },
        fromLicense: { select: { id: true, key: true, licenseName: true } },
        toLicense: { select: { id: true, key: true, licenseName: true } },
        performedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decommission(id: string, data: any, currentUser: any) {
    const { notes } = data;
    const plotter = await this.findOne(id, currentUser);

    // Auth check
    if (!currentUser.isSuperAdmin && plotter.currentOwnerId !== currentUser.organizationId) {
      throw new ForbiddenException('You do not have permission to decommission this plotter.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.plotter.update({
        where: { id },
        data: {
          status: 'DECOMMISSIONED',
          currentLicenseId: null, // Clear active license
        },
      });

      await tx.plotterAssignmentLog.create({
        data: {
          plotterId: id,
          action: 'DECOMMISSION',
          fromLicenseId: plotter.currentLicenseId || null,
          performedById: currentUser.id,
          notes: notes || 'Decommissioned / Retired.',
        },
      });

      return p;
    });

    return updated;
  }
}
