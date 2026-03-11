import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService
  ) {}

  async create(data: any, currentUser?: any) {
    const { name, description, isSystemRole, organizationId, permissionIds } = data;
    
    // Validate system role creation against organization
    if (isSystemRole && (!currentUser || !currentUser.isSuperAdmin)) {
      throw new BadRequestException('Only Super Admins can create system roles.');
    }
    if (isSystemRole && organizationId) {
      throw new BadRequestException('System roles cannot belong to an organization');
    }

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null) {
      if (!isSystemRole && !organizationId) {
         throw new BadRequestException('Organization must be specified for non-system roles.');
      }
      if (organizationId && !allowedOrgIds.includes(organizationId)) {
        throw new InternalServerErrorException('Permission denied.');
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        description,
        isSystemRole: isSystemRole ?? false,
        organizationId: organizationId ? organizationId : null,
        permissions: permissionIds ? {
          create: permissionIds.map((id: string) => ({ permissionId: id }))
        } : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
    return role;
  }

  async findAll(currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    
    let isInternal = false;
    if (currentUser?.organizationId) {
      const userOrg = await this.prisma.organization.findUnique({ where: { id: currentUser.organizationId } });
      isInternal = userOrg?.type === 'internal';
    } else if (currentUser?.isSuperAdmin) {
      isInternal = true;
    }

    let whereClause: any = {};
    if (allowedOrgIds !== null) {
       whereClause.OR = [
         { organizationId: { in: allowedOrgIds } }
       ];
       if (isInternal) {
         whereClause.OR.push({ isSystemRole: true });
       }
    }

    return this.prisma.role.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        organization: true,
        permissions: { include: { permission: true } },
      },
      orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        organization: true,
        permissions: { include: { permission: true } },
      },
    });

    if (!role) return null;

    if (allowedOrgIds !== null) {
      if (!role.isSystemRole && role.organizationId && !allowedOrgIds.includes(role.organizationId)) {
         throw new InternalServerErrorException('Permission denied.');
      }
    }

    return role;
  }

  async update(id: string, data: any, currentUser?: any) {
    const { name, description, permissionIds } = data;
    
    // Validate permission
    const existingRole = await this.prisma.role.findUnique({ where: { id } });
    if (!existingRole) throw new BadRequestException('Role not found.');

    if (existingRole.isSystemRole && (!currentUser || !currentUser.isSuperAdmin)) {
      throw new BadRequestException('Only Super Admins can modify system roles.');
    }

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null) {
      if (!existingRole.isSystemRole && existingRole.organizationId && !allowedOrgIds.includes(existingRole.organizationId)) {
         throw new InternalServerErrorException('Permission denied.');
      }
    }

    // If permissionIds is provided, we need to replace existing permissions
    if (permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    }

    return this.prisma.role.update({ 
      where: { id }, 
      data: { 
        name, 
        description,
        ...(permissionIds !== undefined && {
          permissions: {
            create: permissionIds.map((pid: number) => ({ permissionId: pid }))
          }
        })
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async remove(id: string, currentUser?: any) {
    const existingRole = await this.prisma.role.findUnique({ where: { id } });
    if (!existingRole) return null;

    if (existingRole.isSystemRole && (!currentUser || !currentUser.isSuperAdmin)) {
      throw new BadRequestException('Only Super Admins can delete system roles.');
    }

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null) {
      if (!existingRole.isSystemRole && existingRole.organizationId && !allowedOrgIds.includes(existingRole.organizationId)) {
         throw new InternalServerErrorException('Permission denied.');
      }
    }

    return this.prisma.role.delete({ where: { id } });
  }
}
