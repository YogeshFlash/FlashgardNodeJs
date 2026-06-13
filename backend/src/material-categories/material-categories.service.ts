import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    let legacyId = data.legacyId;
    if (!legacyId) {
      const max = await this.prisma.materialCategory.aggregate({
        _max: { legacyId: true }
      });
      legacyId = (max._max.legacyId || 0) + 1;
    }

    return this.prisma.materialCategory.create({
      data: {
        name: data.name,
        description: data.description,
        productTypeId: data.productTypeId,
        legacyId,
        isActive: data.isActive ?? true,
        isDeleted: data.isDeleted ?? false,
      },
      include: { productType: true }
    });
  }

  async findAll(search?: string, includeDeleted = false) {
    return this.prisma.materialCategory.findMany({
      where: {
        AND: [
          search ? { name: { contains: search, mode: 'insensitive' } } : {},
          !includeDeleted ? { isDeleted: false } : {}
        ]
      },
      include: { productType: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.materialCategory.findUnique({ 
      where: { id },
      include: { productType: true }
    });
    if (!item) throw new NotFoundException(`MaterialCategory with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.materialCategory.update({
      where: { id },
      data,
      include: { productType: true }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.materialCategory.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.materialCategory.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string) {
    await this.findOne(id);
    return this.prisma.materialCategory.delete({ where: { id } });
  }
}
