import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma as any).modelCategory.create({
      data: {
        name: data.name,
        parentId: data.parentId || null,
        iconUrl: data.iconUrl,
        imageUrl: data.imageUrl,
        isActive: data.isActive !== undefined ? !!data.isActive : true,
        sortOrder: isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder),
      },
    });
  }

  async findAll(parentId?: string, search?: string, includeDeleted?: boolean, onlyWithModels?: boolean) {
    const filters: any[] = [];
    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (!includeDeleted) filters.push({ isDeleted: false });
    if (parentId !== undefined) {
      filters.push({ parentId: parentId === 'null' ? null : parentId });
    }
    if (onlyWithModels) {
      filters.push({
        OR: [
          { models: { some: {} } },
          { children: { some: { models: { some: {} } } } },
          { children: { some: { children: { some: { models: { some: {} } } } } } }
        ]
      });
    }

    return (this.prisma as any).modelCategory.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: {
        parent: true,
        children: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await (this.prisma as any).modelCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        models: true,
      },
    });
    if (!item) throw new NotFoundException(`ModelCategory with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    return (this.prisma as any).modelCategory.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        iconUrl: data.iconUrl,
        imageUrl: data.imageUrl,
        isActive: data.isActive !== undefined ? !!data.isActive : undefined,
        sortOrder: data.sortOrder !== undefined ? (isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder)) : undefined,
      },
    });
  }

  async remove(id: string) {
    return (this.prisma as any).modelCategory.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    return (this.prisma as any).modelCategory.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new Error('Only Super Admins can permanently delete categories.');
    }
    return (this.prisma as any).modelCategory.delete({ where: { id } });
  }
}
