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
    const { name, description, isSystemRole, isRestricted, organizationId, permissionIds } = data;
    
    // Validate system role creation against organization
    if (isSystemRole && (!currentUser || !currentUser.isSuperAdmin)) {
      throw new BadRequestException('Only Super Admins can create system roles.');
    }

    if (isRestricted && (!currentUser || !currentUser.isSuperAdmin)) {
      const hasSystemAccess = (currentUser?.permissions || []).includes('roles:system_access');
      if (!hasSystemAccess) {
        throw new BadRequestException('You do not have permission to create restricted roles.');
      }
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
        isRestricted: isRestricted ?? false,
        organizationId: organizationId ? organizationId : null,
        permissions: permissionIds ? {
          create: permissionIds.map((id: string) => ({ permissionId: id }))
        } : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
    return role;
  }

  async findAll(currentUser?: any, includeDeleted?: boolean) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    const permissions = currentUser?.permissions || [];
    const hasSystemAccess = permissions.includes('roles:system_access') || currentUser?.isSuperAdmin;

    let whereClause: any = {};
    if (allowedOrgIds !== null) {
      whereClause.OR = [
        { organizationId: { in: allowedOrgIds } },
        { 
          isSystemRole: true,
          ...(hasSystemAccess ? {} : { isRestricted: false })
        }
      ];
    } else if (!hasSystemAccess) {
       whereClause.isRestricted = false;
    }

    // Always return all roles including deleted (UI handles visual distinction)

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
      
      const permissions = currentUser?.permissions || [];
      const hasSystemAccess = permissions.includes('roles:system_access') || currentUser?.isSuperAdmin;
      if (role.isRestricted && !hasSystemAccess) {
        throw new InternalServerErrorException('Permission denied.');
      }
    }

    return role;
  }

  async update(id: string, data: any, currentUser?: any) {
    const { name, description, isRestricted, permissionIds } = data;
    
    // Validate permission
    const existingRole = await this.prisma.role.findUnique({ where: { id } });
    if (!existingRole) throw new BadRequestException('Role not found.');

    const permissions = currentUser?.permissions || [];
    const hasSystemAccess = permissions.includes('roles:system_access') || currentUser?.isSuperAdmin;

    if (existingRole.isSystemRole && (!currentUser || !currentUser.isSuperAdmin)) {
      throw new BadRequestException('Only Super Admins can modify system roles.');
    }

    if ((existingRole.isRestricted || isRestricted) && !hasSystemAccess) {
      throw new BadRequestException('You do not have permission to manage restricted roles.');
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
        isRestricted,
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

    return this.prisma.role.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new BadRequestException('Only Super Admins can restore roles.');
    }

    return this.prisma.role.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new BadRequestException('Only Super Admins can permanently delete roles.');
    }

    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role?.isDeleted) {
      throw new BadRequestException('Only soft-deleted roles can be permanently purged.');
    }

    // RolePermission records will be deleted automatically if CASCADE is set, 
    // but Prisma doesn't always handle it if not defined in schema.
    // Let's manually delete them to be safe.
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });

    return this.prisma.role.delete({
      where: { id }
    });
  }


  async isRoleAllowed(roleId: string, currentUser: any): Promise<boolean> {
    if (!roleId) return true;
    if (currentUser?.isSuperAdmin) return true;

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return true;

    if (role.isRestricted) {
      const permissions = currentUser?.permissions || [];
      return permissions.includes('roles:system_access');
    }

    return true;
  }
}
