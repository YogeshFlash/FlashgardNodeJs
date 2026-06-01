import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  findAll(includeDeleted?: boolean) {
    return this.prisma.permission.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      orderBy: { action: 'asc' },
    });
  }

  create(data: { action: string; description?: string }, currentUser?: any) {
    if (!currentUser || !currentUser.isSuperAdmin) throw new BadRequestException('Only Super Admins can manage permissions.');
    return this.prisma.permission.create({ data });
  }

  update(id: string, data: { action?: string; description?: string }, currentUser?: any) {
    if (!currentUser || !currentUser.isSuperAdmin) throw new BadRequestException('Only Super Admins can manage permissions.');
    return this.prisma.permission.update({ where: { id }, data });
  }

  remove(id: string, currentUser?: any) {
    if (!currentUser || !currentUser.isSuperAdmin) throw new BadRequestException('Only Super Admins can manage permissions.');
    return this.prisma.permission.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  restore(id: string, currentUser?: any) {
    if (!currentUser || !currentUser.isSuperAdmin) throw new BadRequestException('Only Super Admins can restore permissions.');
    return this.prisma.permission.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  purge(id: string, currentUser?: any) {
    if (!currentUser || !currentUser.isSuperAdmin) throw new BadRequestException('Only Super Admins can permanently delete permissions.');
    return this.prisma.permission.delete({
      where: { id }
    });
  }
}
