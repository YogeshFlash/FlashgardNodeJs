import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CutPatternsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma as any).cutPattern.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        canPrintNCut: data.canPrintNCut ?? false,
        canDecalCut: data.canDecalCut ?? false,
        cutFor: data.cutFor ?? 0,
        legacyId: data.legacyId,
        sortOrder: isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder),
      },
    });
  }

  async findAll(search?: string, includeDeleted?: boolean) {
    const filters: any[] = [];
    if (search) filters.push({ OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] });
    if (!includeDeleted) filters.push({ isDeleted: false });

    return (this.prisma as any).cutPattern.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await (this.prisma as any).cutPattern.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException(`CutPattern with ID ${id} not found`);
    return item;
  }

  async update(id: string, data: any) {
    return (this.prisma as any).cutPattern.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        canPrintNCut: data.canPrintNCut,
        canDecalCut: data.canDecalCut,
        cutFor: data.cutFor,
        legacyId: data.legacyId,
        sortOrder: data.sortOrder !== undefined ? (isNaN(parseInt(data.sortOrder)) ? 0 : parseInt(data.sortOrder)) : undefined,
      },
    });
  }

  async remove(id: string) {
    return (this.prisma as any).cutPattern.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string) {
    return (this.prisma as any).cutPattern.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new Error('Only Super Admins can permanently delete cut patterns.');
    }
    return (this.prisma as any).cutPattern.delete({ where: { id } });
  }
}
