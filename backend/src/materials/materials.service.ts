import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    let legacyId = data.legacyId;
    if (!legacyId) {
      const max = await this.prisma.material.aggregate({
        _max: { legacyId: true }
      });
      legacyId = (max._max.legacyId || 0) + 1;
    }

    return this.prisma.material.create({
      data: {
        name: data.name,
        thickness: data.thickness,
        layers: data.layers ?? 1,
        minSpeed: data.minSpeed,
        minForce: data.minForce,
        filmCategoryId: data.filmCategoryId,
        legacyId,
        isActive: data.isActive ?? true,
        isDeleted: data.isDeleted ?? false,
      },
      include: { filmCategory: true }
    });
  }

  async findAll(search?: string, includeDeleted = false) {
    return this.prisma.material.findMany({
      where: {
        AND: [
          search ? { name: { contains: search, mode: 'insensitive' } } : {},
          !includeDeleted ? { isDeleted: false } : {}
        ]
      },
      include: { filmCategory: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.material.findUnique({ 
      where: { id },
      include: { filmCategory: true }
    });
    if (!item) throw new NotFoundException(`Material with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.material.update({
      where: { id },
      data,
      include: { filmCategory: true }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.material.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.material.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string) {
    await this.findOne(id);
    return this.prisma.material.delete({ where: { id } });
  }
}
