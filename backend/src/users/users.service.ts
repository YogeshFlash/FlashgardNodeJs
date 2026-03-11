import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService
  ) {}

  async create(data: any, currentUser?: any) {
    const { firstName, lastName, email, password, organizationId, roleId, isActive, isSuperAdmin } = data;
    
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

    // In production, hash the password before storing
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        organizationId: organizationId ? organizationId : null,
        roleId: roleId ? roleId : null,
        isActive: isActive ?? true,
        isSuperAdmin: (currentUser?.isSuperAdmin && isSuperAdmin) || false,
      },
      include: { organization: true, role: true },
    });
  }

  async findAll(search?: string, currentUser?: any) {
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
      whereClause.organizationId = { in: allowedOrgIds };
      whereClause.isSuperAdmin = false; // Non-super-admins cannot see super admins
    }

    return this.prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { organization: true, role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { organization: true, role: true },
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
    const { firstName, lastName, email, organizationId, roleId, isActive, isSuperAdmin } = data;
    
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

    const updateData: any = {
      firstName,
      lastName,
      email,
      organizationId: organizationId ? organizationId : null,
      roleId: roleId ? roleId : null,
      isActive,
    };
    
    // Only conditionally update if current user is super admin
    if (currentUser?.isSuperAdmin && isSuperAdmin !== undefined) {
      updateData.isSuperAdmin = isSuperAdmin;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { organization: true, role: true },
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

    return this.prisma.user.delete({ where: { id } });
  }
}
