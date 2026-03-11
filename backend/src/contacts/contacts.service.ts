import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService
  ) {}

  async create(data: any, currentUser?: any) {
    const { firstName, lastName, email, phone, jobTitle, isPrimary, organizationId } = data;
    
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null) {
      if (!organizationId) throw new InternalServerErrorException('Organization must be specified.');
      if (!allowedOrgIds.includes(organizationId)) {
        throw new InternalServerErrorException('Permission denied.');
      }
    }

    return this.prisma.contact.create({
      data: { firstName, lastName, email, phone, jobTitle, isPrimary, organizationId: organizationId ? organizationId : null },
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

    return this.prisma.contact.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: { organization: true },
      orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, currentUser?: any) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: { organization: true },
    });
    
    if (!contact) return null;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && contact.organizationId && !allowedOrgIds.includes(contact.organizationId)) {
       throw new InternalServerErrorException('Permission denied.');
    }

    return contact;
  }

  async update(id: string, data: any, currentUser?: any) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) return null;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && contact.organizationId && !allowedOrgIds.includes(contact.organizationId)) {
       throw new InternalServerErrorException('Permission denied.');
    }

    const { firstName, lastName, email, phone, jobTitle, isPrimary } = data;
    return this.prisma.contact.update({ where: { id }, data: { firstName, lastName, email, phone, jobTitle, isPrimary } });
  }

  async remove(id: string, currentUser?: any) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) return null;

    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;
    if (allowedOrgIds !== null && contact.organizationId && !allowedOrgIds.includes(contact.organizationId)) {
       throw new InternalServerErrorException('Permission denied.');
    }

    return this.prisma.contact.delete({ where: { id } });
  }
}
