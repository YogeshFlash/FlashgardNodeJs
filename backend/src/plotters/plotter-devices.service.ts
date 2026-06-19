import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlotterDevicesService {
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
}
