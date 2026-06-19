import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlottersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { legacySettings, ...plotterData } = data;

    const parsedPlotterData = {
      plotterName: plotterData.plotterName,
      cutPointX: plotterData.cutPointX !== undefined && plotterData.cutPointX !== null && plotterData.cutPointX !== '' ? parseFloat(plotterData.cutPointX) : null,
      cutPointY: plotterData.cutPointY !== undefined && plotterData.cutPointY !== null && plotterData.cutPointY !== '' ? parseFloat(plotterData.cutPointY) : null,
      manufacturer: plotterData.manufacturer,
      connectionType: plotterData.connectionType,
      description: plotterData.description,
      maxSpeed: plotterData.maxSpeed !== undefined && plotterData.maxSpeed !== null && plotterData.maxSpeed !== '' ? parseInt(plotterData.maxSpeed, 10) : null,
      maxForce: plotterData.maxForce !== undefined && plotterData.maxForce !== null && plotterData.maxForce !== '' ? parseInt(plotterData.maxForce, 10) : null,
      status: plotterData.status || 'ACTIVE',
    };

    const parsedLegacySettings = legacySettings ? {
      scaleX: legacySettings.scaleX !== undefined && legacySettings.scaleX !== null && legacySettings.scaleX !== '' ? parseFloat(legacySettings.scaleX) : null,
      scaleY: legacySettings.scaleY !== undefined && legacySettings.scaleY !== null && legacySettings.scaleY !== '' ? parseFloat(legacySettings.scaleY) : null,
      displayX: legacySettings.displayX !== undefined && legacySettings.displayX !== null && legacySettings.displayX !== '' ? parseFloat(legacySettings.displayX) : null,
      displayY: legacySettings.displayY !== undefined && legacySettings.displayY !== null && legacySettings.displayY !== '' ? parseFloat(legacySettings.displayY) : null,
      scale90X: legacySettings.scale90X !== undefined && legacySettings.scale90X !== null && legacySettings.scale90X !== '' ? parseFloat(legacySettings.scale90X) : null,
      scale90Y: legacySettings.scale90Y !== undefined && legacySettings.scale90Y !== null && legacySettings.scale90Y !== '' ? parseFloat(legacySettings.scale90Y) : null,
      display90X: legacySettings.display90X !== undefined && legacySettings.display90X !== null && legacySettings.display90X !== '' ? parseFloat(legacySettings.display90X) : null,
      display90Y: legacySettings.display90Y !== undefined && legacySettings.display90Y !== null && legacySettings.display90Y !== '' ? parseFloat(legacySettings.display90Y) : null,
      supportGpgl: !!legacySettings.supportGpgl,
      isRegistrationMarkSupport: !!legacySettings.isRegistrationMarkSupport,
      isMovable: !!legacySettings.isMovable,
      isLpgl: !!legacySettings.isLpgl,
      isActive: legacySettings.isActive !== undefined ? !!legacySettings.isActive : true,
      isDelete: !!legacySettings.isDelete,
      plotterType: legacySettings.plotterType,
      searchKeyword: legacySettings.searchKeyword,
      languageType: legacySettings.languageType,
      driverType: legacySettings.driverType,
      endPoint: legacySettings.endPoint,
      basePenUp: legacySettings.basePenUp !== undefined && legacySettings.basePenUp !== null && legacySettings.basePenUp !== '' ? parseInt(legacySettings.basePenUp, 10) : null,
      basePenDown: legacySettings.basePenDown !== undefined && legacySettings.basePenDown !== null && legacySettings.basePenDown !== '' ? parseInt(legacySettings.basePenDown, 10) : null,
      targetPenUp: legacySettings.targetPenUp !== undefined && legacySettings.targetPenUp !== null && legacySettings.targetPenUp !== '' ? parseInt(legacySettings.targetPenUp, 10) : null,
      targetPenDown: legacySettings.targetPenDown !== undefined && legacySettings.targetPenDown !== null && legacySettings.targetPenDown !== '' ? parseInt(legacySettings.targetPenDown, 10) : null,
      baseXYSeparator: legacySettings.baseXYSeparator,
      xySeparator: legacySettings.xySeparator,
      startString: legacySettings.startString,
      endString: legacySettings.endString,
      isAndroid: !!legacySettings.isAndroid,
    } : undefined;

    return (this.prisma as any).plotterMaster.create({
      data: {
        ...parsedPlotterData,
        legacySettings: parsedLegacySettings ? {
          create: parsedLegacySettings
        } : undefined
      },
      include: {
        legacySettings: true
      }
    });
  }

  async findAll(search?: string, page?: number, limit?: number) {
    const filters: any[] = [];
    if (search) {
      filters.push({
        OR: [
          { plotterName: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
          { connectionType: { contains: search, mode: 'insensitive' } },
          {
            legacySettings: {
              OR: [
                { plotterType: { contains: search, mode: 'insensitive' } },
                { searchKeyword: { contains: search, mode: 'insensitive' } },
              ]
            }
          }
        ]
      });
    }

    const whereClause = filters.length > 0 ? { AND: filters } : undefined;

    if (page !== undefined && limit !== undefined) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        (this.prisma as any).plotterMaster.findMany({
          where: whereClause,
          include: { legacySettings: true },
          orderBy: { plotterName: 'asc' },
          skip: Number(skip),
          take: Number(limit),
        }),
        (this.prisma as any).plotterMaster.count({
          where: whereClause,
        }),
      ]);
      return { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
    }

    return (this.prisma as any).plotterMaster.findMany({
      where: whereClause,
      include: { legacySettings: true },
      orderBy: { plotterName: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await (this.prisma as any).plotterMaster.findUnique({
      where: { id },
      include: { legacySettings: true }
    });
    if (!item) throw new NotFoundException(`Plotter with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    const { legacySettings, ...plotterData } = data;

    const parsedPlotterData = {
      plotterName: plotterData.plotterName,
      cutPointX: plotterData.cutPointX !== undefined && plotterData.cutPointX !== null && plotterData.cutPointX !== '' ? parseFloat(plotterData.cutPointX) : null,
      cutPointY: plotterData.cutPointY !== undefined && plotterData.cutPointY !== null && plotterData.cutPointY !== '' ? parseFloat(plotterData.cutPointY) : null,
      manufacturer: plotterData.manufacturer,
      connectionType: plotterData.connectionType,
      description: plotterData.description,
      maxSpeed: plotterData.maxSpeed !== undefined && plotterData.maxSpeed !== null && plotterData.maxSpeed !== '' ? parseInt(plotterData.maxSpeed, 10) : null,
      maxForce: plotterData.maxForce !== undefined && plotterData.maxForce !== null && plotterData.maxForce !== '' ? parseInt(plotterData.maxForce, 10) : null,
      status: plotterData.status,
    };

    const legacyUpdate: any = {};
    if (legacySettings) {
      const parsedLegacySettings = {
        scaleX: legacySettings.scaleX !== undefined && legacySettings.scaleX !== null && legacySettings.scaleX !== '' ? parseFloat(legacySettings.scaleX) : null,
        scaleY: legacySettings.scaleY !== undefined && legacySettings.scaleY !== null && legacySettings.scaleY !== '' ? parseFloat(legacySettings.scaleY) : null,
        displayX: legacySettings.displayX !== undefined && legacySettings.displayX !== null && legacySettings.displayX !== '' ? parseFloat(legacySettings.displayX) : null,
        displayY: legacySettings.displayY !== undefined && legacySettings.displayY !== null && legacySettings.displayY !== '' ? parseFloat(legacySettings.displayY) : null,
        scale90X: legacySettings.scale90X !== undefined && legacySettings.scale90X !== null && legacySettings.scale90X !== '' ? parseFloat(legacySettings.scale90X) : null,
        scale90Y: legacySettings.scale90Y !== undefined && legacySettings.scale90Y !== null && legacySettings.scale90Y !== '' ? parseFloat(legacySettings.scale90Y) : null,
        display90X: legacySettings.display90X !== undefined && legacySettings.display90X !== null && legacySettings.display90X !== '' ? parseFloat(legacySettings.display90X) : null,
        display90Y: legacySettings.display90Y !== undefined && legacySettings.display90Y !== null && legacySettings.display90Y !== '' ? parseFloat(legacySettings.display90Y) : null,
        supportGpgl: !!legacySettings.supportGpgl,
        isRegistrationMarkSupport: !!legacySettings.isRegistrationMarkSupport,
        isMovable: !!legacySettings.isMovable,
        isLpgl: !!legacySettings.isLpgl,
        isActive: legacySettings.isActive !== undefined ? !!legacySettings.isActive : true,
        isDelete: !!legacySettings.isDelete,
        plotterType: legacySettings.plotterType,
        searchKeyword: legacySettings.searchKeyword,
        languageType: legacySettings.languageType,
        driverType: legacySettings.driverType,
        endPoint: legacySettings.endPoint,
        basePenUp: legacySettings.basePenUp !== undefined && legacySettings.basePenUp !== null && legacySettings.basePenUp !== '' ? parseInt(legacySettings.basePenUp, 10) : null,
        basePenDown: legacySettings.basePenDown !== undefined && legacySettings.basePenDown !== null && legacySettings.basePenDown !== '' ? parseInt(legacySettings.basePenDown, 10) : null,
        targetPenUp: legacySettings.targetPenUp !== undefined && legacySettings.targetPenUp !== null && legacySettings.targetPenUp !== '' ? parseInt(legacySettings.targetPenUp, 10) : null,
        targetPenDown: legacySettings.targetPenDown !== undefined && legacySettings.targetPenDown !== null && legacySettings.targetPenDown !== '' ? parseInt(legacySettings.targetPenDown, 10) : null,
        baseXYSeparator: legacySettings.baseXYSeparator,
        xySeparator: legacySettings.xySeparator,
        startString: legacySettings.startString,
        endString: legacySettings.endString,
        isAndroid: !!legacySettings.isAndroid,
      };

      legacyUpdate.upsert = {
        create: parsedLegacySettings,
        update: parsedLegacySettings,
      };
    }

    return (this.prisma as any).plotterMaster.update({
      where: { id },
      data: {
        ...parsedPlotterData,
        legacySettings: legacySettings ? legacyUpdate : undefined,
      },
      include: {
        legacySettings: true
      }
    });
  }

  async remove(id: string) {
    return (this.prisma as any).plotterMaster.delete({
      where: { id }
    });
  }
}
