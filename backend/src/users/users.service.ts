import { Injectable, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService,
    private rolesService: RolesService
  ) {}

  async create(data: any, currentUser?: any) {
    const { firstName, lastName, email, password, organizationId, roleId, organizations, isActive, isSuperAdmin } = data;
    
    // Authorization Check for Role
    if (roleId) {
      const allowed = await this.rolesService.isRoleAllowed(roleId, currentUser);
      if (!allowed) {
        throw new ForbiddenException('You do not have permission to assign this restricted role.');
      }
    }
    
    // Authorization Check for Super Admin flag
    if (isSuperAdmin && (!currentUser || !currentUser.isSuperAdmin)) {
      throw new InternalServerErrorException('Only existing Super Admins can create new Super Admins.');
    }

    // Authorization Check for Organization
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null) {
      if (!organizationId) {
         throw new InternalServerErrorException('Organization must be specified.');
      }
      if (!allowedOrgIds.includes(organizationId)) {
        throw new InternalServerErrorException('You do not have permission to create a user in this organization.');
      }
    }

    let orgsCreatePayload: any[] = [];
    if (organizations && Array.isArray(organizations)) {
        orgsCreatePayload = organizations.map((org: any) => ({
            organizationId: org.organizationId,
            roleId: org.roleId,
            isPrimary: org.isPrimary || false
        }));
    } else if (organizationId && roleId) {
        orgsCreatePayload = [{ organizationId, roleId, isPrimary: true }];
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        organizationId: orgsCreatePayload.length > 0 ? orgsCreatePayload[0].organizationId : null,
        roleId: orgsCreatePayload.length > 0 ? orgsCreatePayload[0].roleId : null,
        isActive: isActive ?? true,
        isSuperAdmin: (currentUser?.isSuperAdmin && isSuperAdmin) || false,
        organizations: orgsCreatePayload.length > 0 ? {
          create: orgsCreatePayload
        } : undefined
      },
      include: { organization: true, role: true, organizations: { include: { organization: true, role: true } } },
    });
  }

  async findAll(search?: string, currentUser?: any, includeDeleted?: boolean, skip?: number, take?: number, filterOrgId?: string) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    
    let whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (allowedOrgIds !== null) {
      if (filterOrgId) {
        if (!allowedOrgIds.includes(filterOrgId)) {
          return (skip !== undefined || take !== undefined) ? { items: [], total: 0 } : [];
        }
        whereClause.organizations = { some: { organizationId: filterOrgId } };
      } else {
        whereClause.organizationId = { in: allowedOrgIds };
      }
      whereClause.isSuperAdmin = false; // Non-super-admins cannot see super admins
    } else if (filterOrgId) {
      // Super admin filtering by org
      whereClause.organizations = { some: { organizationId: filterOrgId } };
    }

    // Always return all users including deleted (UI handles visual distinction)

    if (skip !== undefined || take !== undefined) {
      const [items, total] = await Promise.all([
        this.prisma.user.findMany({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          include: { organization: true, role: true, organizations: { include: { organization: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          skip: skip ? Number(skip) : undefined,
          take: take ? Number(take) : undefined,
        }),
        this.prisma.user.count({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        }),
      ]);
      return { items, total };
    }

    return this.prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { organization: true, role: true, organizations: { include: { organization: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { organization: true, role: true, organizations: { include: { organization: true, role: true } } },
    });

    if (!user) return null;

    if (allowedOrgIds !== null) {
      if (user.isSuperAdmin) throw new InternalServerErrorException('Permission denied.');
      if (user.organizationId && !allowedOrgIds.includes(user.organizationId)) {
        throw new InternalServerErrorException('Permission denied.');
      }
    }

    return user;
  }

  async update(id: string, data: any, currentUser?: any) {
    const { firstName, lastName, email, organizationId, roleId, organizations, isActive, isSuperAdmin } = data;
    
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    
    // First, fetch the existing user to ensure they have permission to modify this specific user
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) throw new InternalServerErrorException('User not found.');

    if (allowedOrgIds !== null) {
       // Cannot modify super admins
       if (existingUser.isSuperAdmin) {
          throw new InternalServerErrorException('Permission denied to modify a Super Admin.');
       }
       // Cannot set super admin
       if (isSuperAdmin) {
          throw new InternalServerErrorException('Permission denied to set Super Admin status.');
       }
       // Cannot modify users outside their allowed orgs
       if (existingUser.organizationId && !allowedOrgIds.includes(existingUser.organizationId)) {
          throw new InternalServerErrorException('Permission denied to modify this user.');
       }
       // Cannot move user to an org outside their allowed orgs
       if (organizationId && !allowedOrgIds.includes(organizationId)) {
          throw new InternalServerErrorException('Permission denied to move user to specified organization.');
       }
    }

    // Authorization Check for Role
    if (roleId && roleId !== existingUser.roleId) {
      const allowed = await this.rolesService.isRoleAllowed(roleId, currentUser);
      if (!allowed) {
        throw new ForbiddenException('You do not have permission to assign this restricted role.');
      }
    }

    const updateData: any = {
      firstName,
      lastName,
      email,
      isActive,
    };
    
    // Handle specific single org updates (legacy) or full sync (new behavior)
    if (organizations && Array.isArray(organizations)) {
      const orgsCreatePayload = organizations.map((org: any) => ({
            organizationId: org.organizationId,
            roleId: org.roleId,
            isPrimary: org.isPrimary || false
      }));
      updateData.organizationId = orgsCreatePayload.length > 0 ? orgsCreatePayload[0].organizationId : null;
      updateData.roleId = orgsCreatePayload.length > 0 ? orgsCreatePayload[0].roleId : null;
      updateData.organizations = {
         deleteMany: {},
         create: orgsCreatePayload
      };
    } else if (organizationId) {
      updateData.organizationId = organizationId;
      updateData.roleId = roleId ? roleId : null;
      // We do not overwrite organizations array here unless fully supplied to prevent accidental wipes
    }
    
    // Only conditionally update if current user is super admin
    if (currentUser?.isSuperAdmin && isSuperAdmin !== undefined) {
      updateData.isSuperAdmin = isSuperAdmin;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { organization: true, role: true, organizations: { include: { organization: true, role: true } } },
    });
  }

  async remove(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    
    if (allowedOrgIds !== null) {
      const existingUser = await this.prisma.user.findUnique({ where: { id } });
      if (existingUser) {
        if (existingUser.isSuperAdmin) throw new InternalServerErrorException('Cannot delete Super Admin.');
        if (existingUser.organizationId && !allowedOrgIds.includes(existingUser.organizationId)) {
           throw new InternalServerErrorException('Permission denied.');
        }
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }

  async restore(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can restore users.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async purge(id: string, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      throw new ForbiddenException('Only Super Admins can permanently delete users.');
    }

    // Double check it is already soft-deleted
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user?.isDeleted) {
      throw new InternalServerErrorException('Only soft-deleted users can be permanently purged.');
    }

    return this.prisma.user.delete({
      where: { id }
    });
  }

  async getPermissions(id: string, currentUser?: any) {
    if (!currentUser?.organizationId) {
      throw new InternalServerErrorException('No organization context.');
    }

    // We fetch user permissions specific to the requested organization context
    return this.prisma.userPermission.findMany({
      where: {
        userId: id,
        organizationId: currentUser.organizationId
      },
      include: {
        permission: true
      }
    });
  }

  async updatePermissions(id: string, data: any, currentUser?: any) {
    if (!currentUser?.isSuperAdmin) {
      // The user specifically requested this to be restricted to Super/System Admins
      // assuming isSuperAdmin correlates to the platform admin capability.
      throw new ForbiddenException('Only Super Admins can modify individual permission overrides.');
    }

    if (!currentUser?.organizationId) {
      throw new InternalServerErrorException('No organization context.');
    }

    const { permissions } = data; // Array of { permissionId, effect, dataScope }

    // Use a transaction to safely overwrite permissions
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete existing overrides for this user specifically in this organization
      await tx.userPermission.deleteMany({
        where: {
           userId: id,
           organizationId: currentUser.organizationId
        }
      });

      // 2. Insert the new ones
      if (permissions && permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((p: any) => ({
             organizationId: currentUser.organizationId,
             userId: id,
             permissionId: p.permissionId,
             effect: p.effect,
             dataScope: p.effect === 'deny' ? null : p.dataScope,
             grantedById: currentUser.userId || currentUser.id || null
          }))
        });
      }

      return { success: true };
    });
  }
}
