import {
  Injectable,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  async getDescendantOrgIds(rootOrgId: string): Promise<string[]> {
    if (!rootOrgId) return [];
    
    const allOrgIds = new Set<string>();
    allOrgIds.add(rootOrgId);
    
    let currentLevelIds = [rootOrgId];
    
    while (currentLevelIds.length > 0) {
      const children = await this.prisma.organization.findMany({
        where: { parentId: { in: currentLevelIds } },
        select: { id: true },
      });
      
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) break;
      
      childIds.forEach(id => allOrgIds.add(id));
      currentLevelIds = childIds;
    }
    
    return Array.from(allOrgIds);
  }

  
  async canAccessOrg(user: any, targetOrgId: string): Promise<boolean> {
    if (user.isSuperAdmin) return true;
    if (!user.organizationId) return false;
    if (user.organizationId === targetOrgId) return true;
    
    let currentOrgId: string | null = targetOrgId;
    while (currentOrgId) {
      const parentOrg: any = await this.prisma.organization.findUnique({
        where: { id: currentOrgId },
        select: { parentId: true }
      });
      if (!parentOrg || !parentOrg.parentId) return false;
      if (parentOrg.parentId === user.organizationId) return true;
      currentOrgId = parentOrg.parentId;
    }
    return false;
  }

  async getAllowedOrgIds(user: any): Promise<string[] | null> {
    if (user.isSuperAdmin) return null; // null means all access
    if (!user.organizationId) return []; // No org access
    return this.getDescendantOrgIds(user.organizationId);
  }

  async create(data: any, currentUser: any) {
    try {
      const { name, organizationTypeId, isActive, parentId } = data;
      this.logger.log(`Creating org: name=${name}, typeId=${organizationTypeId} by user=${currentUser.email}`);
      
      const allowedOrgIds = await this.getAllowedOrgIds(currentUser);

      // Enforce hierarchy for non-super-admins:
      // - Cannot create a root org (parentId null/undefined).
      // - Can only create under their org tree (default parent to their org).
      // - Cannot create internal org types.
      let effectiveParentId: string | null = parentId ?? null;
      if (allowedOrgIds !== null) {
        // Fetch organization type to check for 'parent' restriction if needed
        const orgType = await this.prisma.organizationType.findUnique({ where: { id: organizationTypeId } });
        if (orgType?.name === 'parent') {
          throw new ForbiddenException('You do not have permission to create parent organizations.');
        }

        if (!currentUser.organizationId) {
          throw new ForbiddenException('You do not have an organization assigned.');
        }

        if (!effectiveParentId) {
          effectiveParentId = currentUser.organizationId;
        }

        if (!effectiveParentId || !allowedOrgIds.includes(effectiveParentId)) {
          throw new ForbiddenException('You do not have permission to create an organization under the specified parent.');
        }
      }
      
      const result = await this.prisma.organization.create({
        data: { name, organizationTypeId, isActive: isActive ?? true, parentId: effectiveParentId },
      });
      this.logger.log(`Created org id=${result.id}`);
      return result;
    } catch (e: any) {
      this.logger.error(`Create org failed: ${e.message}`, e.stack);
      if (e instanceof HttpException) throw e;
      throw new InternalServerErrorException(e.message);
    }
  }

  async findAll(search?: string, currentUser?: any, includeDeleted?: boolean) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    
    const whereClause: any = {};
    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }
    
    if (allowedOrgIds !== null) {
      whereClause.id = { in: allowedOrgIds };
    }

    // Always return all orgs including deleted (UI handles visual distinction)

    return this.prisma.organization.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { organizationType: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(id)) {
      throw new InternalServerErrorException('You do not have permission to access this organization.');
    }

    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        organizationType: true,
        contacts: true,
        users: { include: { role: true } },
        userOrganizations: {
          include: {
            user: true
          }
        },
        addresses: true,
        roles: true,
      },
    });
  }

  async update(id: string, data: any, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(id)) {
       throw new InternalServerErrorException('You do not have permission to update this organization.');
    }

    const { name, organizationTypeId, isActive, parentId } = data;
    
    // Non-super-admins cannot move an org to the root.
    if (allowedOrgIds !== null && parentId === null) {
      throw new ForbiddenException('You do not have permission to move an organization to the root level.');
    }

    if (allowedOrgIds !== null && parentId && !allowedOrgIds.includes(parentId)) {
      throw new InternalServerErrorException('You do not have permission to move to the specified parent organization.');
    }

    return this.prisma.organization.update({
      where: { id },
      data: { name, organizationTypeId, isActive, parentId: parentId ? parentId : null },
    });
  }

  async remove(id: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && !allowedOrgIds.includes(id)) {
       throw new InternalServerErrorException('You do not have permission to delete this organization.');
    }
    return this.prisma.organization.update({ 
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }
}
