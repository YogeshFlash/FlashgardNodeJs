import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeDeleted?: boolean) {
    const defaultPerms = [
      { action: 'contacts:read', description: 'View organization contacts' },
      { action: 'contacts:write', description: 'Create/Edit organization contacts' },
      { action: 'contacts:delete', description: 'Delete organization contacts' },
      { action: 'addresses:read', description: 'View organization addresses' },
      { action: 'addresses:write', description: 'Create/Edit organization addresses' },
      { action: 'addresses:delete', description: 'Delete organization addresses' },
    ];

    for (const p of defaultPerms) {
      await this.prisma.permission.upsert({
        where: { action: p.action },
        update: {},
        create: p,
      }).catch(() => {});
    }

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
