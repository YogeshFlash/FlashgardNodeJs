import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { OrganizationsService } from './organizations/organizations.service';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private orgsService: OrganizationsService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getDashboardStats(currentUser: any) {
    const allowedOrgIds = await this.orgsService.getAllowedOrgIds(currentUser);

    const whereOrg: any = { isDeleted: false };
    const whereUser: any = { isDeleted: false };

    if (allowedOrgIds !== null) {
      whereOrg.id = { in: allowedOrgIds };
      whereUser.organizationId = { in: allowedOrgIds };
      whereUser.isSuperAdmin = false;
    }

    // 1. Total Organizations
    const totalOrgs = await this.prisma.organization.count({ where: whereOrg });

    // 2. Active Users
    const activeUsers = await this.prisma.user.count({ 
      where: { ...whereUser, isActive: true } 
    });

    // 3. Custom Roles
    const roleWhere: any = { isDeleted: false };
    if (allowedOrgIds !== null) {
      roleWhere.OR = [
        { organizationId: null },
        { organizationId: { in: allowedOrgIds } }
      ];
    }
    const totalRoles = await this.prisma.role.count({ where: roleWhere });

    // 4. Context-Specific fourth card
    let fourthCardTitle = 'Active Licenses';
    let fourthCardValue = '0';
    let fourthCardUnit = '';
    
    if (currentUser.isSuperAdmin) {
      const activeLicenses = await this.prisma.orgLicense.count({
        where: { status: 'ACTIVE' }
      });
      fourthCardValue = String(activeLicenses);
    } else {
      if (currentUser.organizationId) {
        const wallet = await this.prisma.entityWallet.findFirst({
          where: { tenantId: currentUser.organizationId }
        });
        fourthCardTitle = 'Credits Balance';
        fourthCardValue = String(wallet?.balance ?? 0);
        fourthCardUnit = ' Cuts';
      }
    }

    // 5. Recent Organizations
    const recentOrgs = await this.prisma.organization.findMany({
      where: whereOrg,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        organizationType: true,
        parent: { select: { name: true } }
      }
    });

    // 6. Recent Activities
    const activityWhere: any = {};
    if (allowedOrgIds !== null) {
      activityWhere.user = { organizationId: { in: allowedOrgIds } };
    }
    const recentActivities = await this.prisma.auditLog.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } }
      }
    });

    return {
      stats: {
        totalOrgs,
        activeUsers,
        totalRoles,
        fourthCardTitle,
        fourthCardValue,
        fourthCardUnit,
      },
      recentOrgs,
      recentActivities,
    };
  }
}
