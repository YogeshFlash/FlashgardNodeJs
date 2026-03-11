import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class AuditLogsService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService
  ) {}

  async findAll(currentUser?: any) {
    const allowedOrgIds = currentUser ? await this.orgsService.getAllowedOrgIds(currentUser) : null;

    let whereClause: any = {};
    if (allowedOrgIds !== null) {
      whereClause.user = { organizationId: { in: allowedOrgIds } };
    }

    return this.prisma.auditLog.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      take: 200, // Limit to recent 200 for performance
    });
  }

  createLog(data: any) {
    return this.prisma.auditLog.create({ data });
  }
}
