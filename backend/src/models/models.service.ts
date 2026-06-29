import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma.model as any).create({
      data: {
        name: data.name,
        brandId: data.brandId,
        categoryId: data.categoryId,
        iconUrl: data.iconUrl,
        imageUrl: data.imageUrl,
        sortOrder: isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder),
      },
    });
  }

  async getActiveCombinations() {
    return (this.prisma.model as any).findMany({
      where: { isDeleted: false },
      select: { categoryId: true, brandId: true },
      distinct: ['categoryId', 'brandId'],
    });
  }

  async findAll(brandId?: string, categoryId?: string, search?: string, includeDeleted?: boolean, skip?: number, take?: number) {
    const whereClause: any = {};
    const filters: any[] = [];
    if (brandId) filters.push({ brandId });
    if (categoryId) filters.push({ categoryId });
    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (!includeDeleted) filters.push({ isDeleted: false });
    
    if (filters.length > 0) {
      whereClause.AND = filters;
    }

    const [items, total] = await Promise.all([
      (this.prisma.model as any).findMany({
        where: whereClause,
        include: {
          brand: true,
          category: true,
          cutFiles: {
            select: {
              id: true,
              modelId: true,
              cutPatternId: true,
              createdAt: true,
              designFilePath: true,
              cutPattern: true,
            }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      }),
      (this.prisma.model as any).count({ where: whereClause })
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    const item = await (this.prisma.model as any).findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        cutFiles: {
          include: {
            cutPattern: true,
          }
        }
      },
    });
    if (!item) throw new NotFoundException(`Model with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    const existing = await (this.prisma.model as any).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Model with ID ${id} not found`);

    return (this.prisma.model as any).update({
      where: { id },
      data: {
        name: data.name,
        brandId: data.brandId === '' ? null : data.brandId,
        categoryId: data.categoryId,
        iconUrl: data.iconUrl,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder !== undefined ? (isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder)) : undefined,
      },
    });
  }

  async remove(id: string) {
    const existing = await (this.prisma.model as any).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Model with ID ${id} not found`);

    return (this.prisma.model as any).update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    const existing = await (this.prisma.model as any).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Model with ID ${id} not found`);

    return (this.prisma.model as any).update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new Error('Only Super Admins can permanently delete models.');
    }
    const existing = await (this.prisma.model as any).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Model with ID ${id} not found`);

    return (this.prisma.model as any).delete({ where: { id } });
  }
}
