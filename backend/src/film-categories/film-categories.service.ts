import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilmCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    let legacyId = data.legacyId;
    if (!legacyId) {
      const max = await this.prisma.filmCategory.aggregate({
        _max: { legacyId: true }
      });
      legacyId = (max._max.legacyId || 0) + 1;
    }

    return this.prisma.filmCategory.create({
      data: {
        name: data.name,
        materialCategoryId: data.materialCategoryId,
        legacyId,
        isActive: data.isActive ?? true,
      },
      include: { materialCategory: true }
    });
  }

  async findAll(search?: string) {
    return this.prisma.filmCategory.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
      include: { materialCategory: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.filmCategory.findUnique({ 
      where: { id },
      include: { materialCategory: true }
    });
    if (!item) throw new NotFoundException(`FilmCategory with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.filmCategory.update({
      where: { id },
      data,
      include: { materialCategory: true }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // FilmCategory doesn't have a soft-delete field, so we perform a hard delete or set isActive: false.
    // Let's toggle isActive: false.
    return this.prisma.filmCategory.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async purge(id: string) {
    await this.findOne(id);
    return this.prisma.filmCategory.delete({ where: { id } });
  }
}
