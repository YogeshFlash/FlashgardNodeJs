import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class AddressesService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService
  ) {}

  async create(data: any, currentUser?: any) {
    const { type, streetLine1, streetLine2, city, state, postalCode, country, isPrimary, organizationId } = data;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null) {
      if (!organizationId) throw new InternalServerErrorException('Organization must be specified.');
      if (!allowedOrgIds.includes(organizationId)) {
        throw new InternalServerErrorException('Permission denied.');
      }
    }

    return this.prisma.address.create({
      data: { type, streetLine1, streetLine2, city, state, postalCode, country, isPrimary, organizationId: organizationId ? organizationId : null },
      include: { organization: true },
    });
  }

  async findAll(organizationId?: string, currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    
    let whereClause: any = {};
    if (organizationId) {
      if (allowedOrgIds !== null && !allowedOrgIds.includes(organizationId)) {
         return []; // Return empty if asking for org they don't have access to
      }
      whereClause.organizationId = organizationId;
    } else if (allowedOrgIds !== null) {
      whereClause.organizationId = { in: allowedOrgIds };
    }

    return this.prisma.address.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { organization: true },
      orderBy: [{ isPrimary: 'desc' }, { type: 'asc' }],
    });
  }

  async findOne(id: string, currentUser?: any) {
    const address = await this.prisma.address.findUnique({
      where: { id },
      include: { organization: true },
    });
    
    if (!address) return null;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && address.organizationId && !allowedOrgIds.includes(address.organizationId)) {
       throw new InternalServerErrorException('Permission denied.');
    }

    return address;
  }

  async update(id: string, data: any, currentUser?: any) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) return null;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && address.organizationId && !allowedOrgIds.includes(address.organizationId)) {
       throw new InternalServerErrorException('Permission denied.');
    }

    const { type, streetLine1, streetLine2, city, state, postalCode, country, isPrimary } = data;
    return this.prisma.address.update({ where: { id }, data: { type, streetLine1, streetLine2, city, state, postalCode, country, isPrimary } });
  }

  async remove(id: string, currentUser?: any) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) return null;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && address.organizationId && !allowedOrgIds.includes(address.organizationId)) {
       throw new InternalServerErrorException('Permission denied.');
    }

    return this.prisma.address.delete({ where: { id } });
  }
}
