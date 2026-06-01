import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrgLicenseStatus, CreditStatus } from '@prisma/client';

@Injectable()
export class BackgroundTasksService {
  private readonly logger = new Logger(BackgroundTasksService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiries() {
    this.logger.log('Running daily expiry check...');
    const now = new Date();

    // 1. Expire Licenses
    const expiredLicenses = await (this.prisma.orgLicense as any).updateMany({
      where: {
        status: OrgLicenseStatus.AVAILABLE,
        expiryDate: { lt: now },
      },
      data: { status: OrgLicenseStatus.EXPIRED },
    });

    if (expiredLicenses.count > 0) {
      this.logger.log(`Expired ${expiredLicenses.count} available licenses.`);
    }

    // 2. Expire Credits
    const expiredCredits = await (this.prisma.cutCredit as any).updateMany({
      where: {
        status: { in: [CreditStatus.AVAILABLE, CreditStatus.ALLOCATED] },
        expiryDate: { lt: now },
      },
      data: { status: CreditStatus.EXPIRED },
    });

    if (expiredCredits.count > 0) {
      this.logger.log(`Expired ${expiredCredits.count} available/allocated credits.`);
    }
  }
}
