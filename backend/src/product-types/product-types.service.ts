import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Auto-calculate legacyId if not provided
    let legacyId = data.legacyId;
    if (!legacyId) {
      const max = await this.prisma.productType.aggregate({
        _max: { legacyId: true }
      });
      legacyId = (max._max.legacyId || 0) + 1;
    }

    return this.prisma.productType.create({
      data: {
        name: data.name,
        slug,
        legacyId,
        isActive: data.isActive ?? true,
        isDeleted: data.isDeleted ?? false,
      }
    });
  }

  async findAll(search?: string, includeDeleted = false) {
    return this.prisma.productType.findMany({
      where: {
        AND: [
          search ? { name: { contains: search, mode: 'insensitive' } } : {},
          !includeDeleted ? { isDeleted: false } : {}
        ]
      },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.productType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`ProductType with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const updateData: any = { ...data };
    if (updateData.name && !updateData.slug) {
      updateData.slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    return this.prisma.productType.update({
      where: { id },
      data: updateData
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productType.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    await this.findOne(id);
    return this.prisma.productType.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string) {
    await this.findOne(id);
    return this.prisma.productType.delete({ where: { id } });
  }
}
