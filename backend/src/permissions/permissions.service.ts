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
      { action: 'inventory:read', description: 'View stock and batches (Full Access)' },
      { action: 'inventory:write', description: 'Manage film inventory (Full Access)' },
      { action: 'inventory_inward:read', description: 'View Inward Receipts tab' },
      { action: 'inventory_inward:write', description: 'Manage Inward Receipts' },
      { action: 'inventory_batches:read', description: 'View Stock Batches tab' },
      { action: 'inventory_batches:write', description: 'Manage Stock Batches' },
      { action: 'inventory_workorders:read', description: 'View Work Orders tab' },
      { action: 'inventory_workorders:write', description: 'Manage Work Orders' },
      { action: 'inventory_packaged:read', description: 'View Packaged Stock tab' },
      { action: 'inventory_packaged:write', description: 'Manage Packaged Stock' },
      { action: 'inventory_dispatch:read', description: 'View Dispatch Orders tab' },
      { action: 'inventory_dispatch:write', description: 'Manage Dispatch Orders' },
      { action: 'inventory_filmtypes:read', description: 'View Flash Products & Categories tab' },
      { action: 'inventory_filmtypes:write', description: 'Manage Flash Products & Categories' },
      // Navigation Permissions
      { action: 'nav:dashboard', description: 'Show Dashboard in sidebar' },
      { action: 'nav:organizations', description: 'Show Organizations in sidebar' },
      { action: 'nav:reports', description: 'Show System Reports in sidebar' },
      { action: 'nav:models', description: 'Show Models & Cut Patterns in sidebar' },
      { action: 'nav:inventory', description: 'Show Inventory Management in sidebar' },
      { action: 'nav:licenses', description: 'Show Licenses in sidebar' },
      { action: 'nav:migration', description: 'Show Data Migration in sidebar' },
      { action: 'nav:mobile-home', description: 'Show Mobile Home config in sidebar' },
      { action: 'nav:settings', description: 'Show Settings & Roles in sidebar' },
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
