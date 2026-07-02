import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma.brand as any).create({
      data: {
        name: data.name,
        iconUrl: data.iconUrl,
        imageUrl: data.imageUrl,
        isActive: data.isActive !== undefined ? !!data.isActive : true,
        sortOrder: isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder),
      },
    });
  }

  async findAll(search?: string, includeDeleted?: boolean, categoryId?: string, onlyWithModels?: boolean) {
    const filters: any[] = [];
    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (!includeDeleted) filters.push({ isDeleted: false });
    
    if (categoryId) {
      filters.push({ models: { some: { categoryId: categoryId } } });
    } else if (onlyWithModels) {
      filters.push({ models: { some: {} } });
    }

    return (this.prisma.brand as any).findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await (this.prisma.brand as any).findUnique({
      where: { id },
      include: {
        models: {
          include: {
            category: true,
          }
        },
      },
    });
    if (!item) throw new NotFoundException(`Brand with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    return (this.prisma.brand as any).update({
      where: { id },
      data: {
        name: data.name,
        iconUrl: data.iconUrl,
        imageUrl: data.imageUrl,
        isActive: data.isActive !== undefined ? !!data.isActive : undefined,
        sortOrder: data.sortOrder !== undefined ? (isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder)) : undefined,
      },
    });
  }

  async remove(id: string) {
    return (this.prisma.brand as any).update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    return (this.prisma.brand as any).update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new Error('Only Super Admins can permanently delete brands.');
    }
    return (this.prisma.brand as any).delete({ where: { id } });
  }
}
