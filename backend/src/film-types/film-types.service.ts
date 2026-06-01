import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilmTypesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    try {
      return await (this.prisma.filmType as any).create({
        data: {
          name: data.name,
          description: data.description,
          parentId: data.parentId || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          thickness: data.thickness,
          layers: data.layers !== undefined ? parseInt(data.layers) : 1,
          minForce: data.minForce,
          minSpeed: data.minSpeed,
        },
      });
    } catch (err: any) {
      console.error('Error creating FilmType:', err);
      throw err;
    }
  }

  async findAll(search?: string, includeDeleted = true) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (!includeDeleted) {
      where.isDeleted = false;
    }
    return (this.prisma.filmType as any).findMany({
      where,
      include: {
        parent: true,
        children: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await (this.prisma.filmType as any).findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
    if (!item) throw new NotFoundException(`FilmType with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    return (this.prisma.filmType as any).update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        thickness: data.thickness !== undefined ? data.thickness : undefined,
        layers: data.layers !== undefined ? parseInt(data.layers) : undefined,
        minForce: data.minForce !== undefined ? data.minForce : undefined,
        minSpeed: data.minSpeed !== undefined ? data.minSpeed : undefined,
      },
    });
  }

  async remove(id: string) {
    return (this.prisma.filmType as any).update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    return (this.prisma.filmType as any).update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new Error('Only Super Admins can permanently delete materials.');
    }
    return (this.prisma.filmType as any).delete({ where: { id } });
  }
}

